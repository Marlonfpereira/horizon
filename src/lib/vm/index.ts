"use client";

import { getAst } from "@/components/ux/vm/services/@ast";
import type {
	Instruction,
	InstructionArgument,
	Program,
	Register,
	Statement,
	Value,
	Variable,
} from "@celestial-hub/orions-belt/mips-ast";
import { useEffect, useRef, useState } from "react";
import { CStringDecoder } from "./cstring-decoder";
import { toast } from "sonner";
import { CStringEncoder } from "./cstring-encoder";

interface VMProps {
	code: string;
	memorySize: number;
	stackSize: number;
}

enum SYSCALL {
	PRINT_INT = 1,
	PRINT_STRING = 4,
	READ_INT = 5,
	READ_STRING = 8,
}

export function useVM_({ code, memorySize, stackSize }: VMProps) {
	const [memory, setMemory] = useState<Uint32Array>(
		new Uint32Array(memorySize),
	);
	const [registers, setRegisters] = useState<number[]>(new Array(32).fill(0));
	const [error, setError] = useState<string | undefined>();
	const [output, setOutput] = useState<string>("");
	const [halted, setHalted] = useState<boolean>(false);
	const [pc, setPc] = useState<number>(0);
	const [tickInterval, setTickInterval] = useState<number>(100);
	const vm = useRef<VM | undefined>(undefined);
	const interval = useRef<NodeJS.Timeout | undefined>(undefined);

	useEffect(() => {
		if (interval.current) {
			clearInterval(interval.current);
			interval.current = setInterval(() => {
				if (vm.current?.is_halted() || vm.current?.is_interrupted()) {
					clearInterval(interval.current);
					return;
				}
				step();
			}, tickInterval);
		}
	}, [tickInterval]);

	function apply_register_patch(patch: number[]) {
		const newRegisters = [...registers];
		for (let i = 0; i < patch.length; i += 2) {
			newRegisters[patch[i]] = patch[i + 1];
		}
		setRegisters(newRegisters);
	}

	function apply_memory_patch(patch: number[]) {
		const newMemory = new Uint32Array(memory);
		for (let i = 0; i < patch.length; i += 2) {
			newMemory[patch[i]] = patch[i + 1];
		}
		setMemory(newMemory);
	}

	useEffect(() => {
		async function loadCode(code: string) {
			try {
				if (vm.current === undefined) return;

				await vm.current.loadCode(code);
				apply_updates();
			} catch (err) {
				const error = err as { message: string };
				setError(error.message);
			}
		}

		if (vm.current === undefined) {
			vm.current = new VM({ memorySize, stackSize });
			try {
				loadCode(code);
			} catch (err) {
				const error = err as { message: string };
				setError(error.message);
			}
		}

		return () => {
			vm.current = undefined;
		};
	}, [code, memorySize, stackSize]);

	function apply_updates() {
		if (vm.current === undefined) return;

		const updates = vm.current.get_updates();
		if (updates.register_patch.length > 0)
			apply_register_patch(updates.register_patch);
		if (updates.memory_patch.length > 0)
			apply_memory_patch(updates.memory_patch);
		if (updates.pc) setPc(updates.pc);
		if (updates?.output) setOutput((output) => output + updates.output);
		if (updates?.halted) setHalted(updates.halted);
	}

	async function run() {
		try {
			interval.current = setInterval(() => {
				if (vm.current === undefined) return;

				if (vm.current.is_halted() || vm.current.is_interrupted()) {
					clearInterval(interval.current);
					return;
				}

				try {
					vm.current.step();
					apply_updates();
				} catch (err) {
					const error = err as { message: string };
					setError(error.message);
				}
			}, tickInterval);
		} catch (err) {
			const error = err as { message: string };
			setError(error.message);
		}
	}

	function step() {
		try {
			if (vm.current === undefined) return;
			vm.current.step();
			apply_updates();
		} catch (err) {
			const error = err as { message: string };
			setError(error.message);
		}
	}

	function reset() {
		try {
			if (vm.current === undefined) return;

			vm.current.reset();
			vm.current.loadCode(code).then(() => {
				toast.success("VM has been reset");
				setOutput("");
				setPc(0);
				setRegisters(new Array(32).fill(0));
				setMemory(new Uint32Array(memorySize));
				setHalted(false);
				if (interval.current) clearInterval(interval.current);
			});
		} catch (err) {
			const error = err as { message: string };
			setError(error.message);
		}
	}

	return {
		error,
		output,
		memory,
		registers,
		step,
		run,
		pc,
		reset,
		halted,
		tickInterval,
		setTickInterval,
	};
}

interface InitVM {
	memorySize: number;
	stackSize: number;
}

interface Updates {
	// A array of pairs of register index and value
	register_patch: number[];

	// A array of pairs of memory index and value
	memory_patch: number[];

	output?: string;

	pc: number;

	halted?: boolean;
}

class VM {
	private registers: number[] = new Array(32).fill(0);
	private pc = 0;
	private memory: Uint8Array;
	private stack: Uint8Array;
	private statements: Statement[] = [];
	private halted = false;
	private interrupted = false;
	/** A map of variable name to memory address */
	private variable_lookup: Map<string, number> = new Map();

	private updates: Updates = {
		pc: 0,
		memory_patch: [],
		register_patch: [],
	};

	constructor({ memorySize, stackSize }: InitVM) {
		this.memory = new Uint8Array(memorySize);
		this.stack = new Uint8Array(stackSize);
	}

	public get_updates() {
		return this.updates;
	}

	async loadCode(code: string) {
		const { data: program, error } = await getAst(code);

		if (error || !program) throw new Error(error);

		let dataSectionOffset = 0;
		for (const variable of program.dataSection.variables) {
			const value = variable_to_bytes(variable);
			const size = value.length;
			const offset = dataSectionOffset;
			dataSectionOffset += size;

			for (let i = 0; i < size; i++) this.change_memory(offset + i, value[i]);

			this.variable_lookup.set(variable.name, offset);
		}

		const entrypointIndex = this.search_entrypoint(
			program.textSection.entrypoint,
			program.textSection.statements,
		);

		if (entrypointIndex === -1) throw new Error("Could not find entrypoint");

		this.statements = program.textSection.statements;
		this.pc = entrypointIndex;
		this.updates.pc = entrypointIndex;
	}

	public step() {
		this.updates = {
			pc: this.pc,
			memory_patch: [],
			register_patch: [],
			output: undefined,
		};

		if (this.pc >= this.statements.length) {
			throw new Error(
				`Program counter out of range. ${this.pc} of ${this.statements.length}`,
			);
		}

		const statement = this.statements[this.pc];
		this.pc += 1;
		this.updates.pc = this.pc;

		if (statement.kind === "instruction") {
			console.log(`[${this.pc}] Executing instruction:`, statement);
			this.evalInstruction(statement.value);
		}
	}

	private evalInstruction({ kind, args }: Instruction) {
		if (this.halted) throw new Error("VM is halted");
		if (this.interrupted) return;

		switch (kind) {
			case "li": {
				if (is_register(args[0]) && is_immediate(args[1])) {
					const register = args[0].value;
					const immediate = args[1].value;

					this.change_register(register.name as RegisterName, immediate);
					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "la": {
				if (is_register(args[0]) && is_label(args[1])) {
					const register = args[0].value;
					const label = args[1].value;

					const address = this.variable_lookup.get(label);
					if (address === undefined) throw new Error(`Unknown label: ${label}`);

					this.change_register(register.name as RegisterName, address);
				}
				break;
			}
			case "syscall": {
				const code = this.registers[get_register_position("$v0")];

				switch (code) {
					case SYSCALL.PRINT_INT: {
						const value = this.registers[get_register_position("$a0")];
						this.updates.output = value.toString();
						break;
					}
					case SYSCALL.PRINT_STRING: {
						const address = this.registers[get_register_position("$a0")];
						const string = new CStringDecoder().decode(
							this.memory.slice(address),
						);
						this.updates.output = string;
						break;
					}
					case SYSCALL.READ_INT: {
						this.interrupted = true;
						let value = Number.NaN;
						while (Number.isNaN(value)) {
							value = Number(window.prompt("Enter a number:"));
						}

						this.change_register("$v0", value);
						this.interrupted = false;
						break;
					}
					case SYSCALL.READ_STRING: {
						this.interrupted = true;
						const address = this.registers[get_register_position("$a0")];
						const length = this.registers[get_register_position("$a1")];
						const prompt = `Enter a string of length ${length}:`;

						let value: null | string = null;
						while (value === null) {
							value = window.prompt(prompt);
						}

						// Follows semantics of UNIX 'fgets'. For specified length n, string can be no longer than n-1.
						// If less than that, adds newline to end. In either case, then pads with null byte If n = 1,
						// input is ignored and null byte placed at buffer address. If n < 1, input is ignored and nothing is written to the buffer.
						if (length > 0) {
							if (value.length >= length) {
								// Cuts off the string to fit the buffer size minus the null terminator
								value = value.substring(0, length - 1);
							}

							for (let i = 0; i < value.length; i++) {
								this.change_memory(address + i, value.charCodeAt(i));
							}

							// If the input is shorter than the maximum length, append a newline
							if (value.length < length - 1) {
								this.change_memory(address + value.length, "\n".charCodeAt(0));
								this.change_memory(address + value.length + 1, 0); // Null-terminate after newline
							} else {
								// Null-terminate the string in the memory
								this.change_memory(address + value.length, 0);
							}
						} else if (length === 1) {
							// If length is 1, only a null byte is placed
							this.change_memory(address, 0);
						}
						// If length < 1, nothing is written

						this.interrupted = false;
						this.change_register("$v0", address);
						break;
					}
					default:
						throw new Error(`Unsupported syscall code: ${code}`);
				}
				break;
			}
			case "move": {
				if (is_register(args[0]) && is_register(args[1])) {
					const destination = args[0].value;
					const source = args[1].value;

					const sourcePosition = get_register_position(
						source.name as RegisterName,
					);

					this.change_register(
						destination.name as RegisterName,
						this.registers[sourcePosition],
					);
				}
				break;
			}
			case "jal": {
				if (is_label(args[0])) {
					this.change_register("$ra", this.pc);
					this.change_pc(this.get_value(args[0]));
					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "beqz":
			case "bnez":
			case "bltz":
			case "bgtz":
			case "blez":
			case "bgez": {
				if (is_register(args[0]) && is_label(args[1])) {
					const operation = (a: number) => {
						switch (kind) {
							case "beqz":
								return a === 0;
							case "blez":
								return a <= 0;
							case "bnez":
								return a !== 0;
							case "bltz":
								return a < 0;
							case "bgtz":
								return a > 0;
							case "bgez":
								return a >= 0;
						}
					};

					const source_value = this.get_value(args[0]);
					const label_position = this.get_value(args[1]);

					if (operation(source_value)) this.change_pc(label_position + 1);
					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "sne":
			case "slt":
			case "sgt":
			case "sle":
			case "sge": {
				if (is_register(args[0])) {
					const operations = (a: number, b: number) => {
						switch (kind) {
							case "sne":
								return a !== b;
							case "slt":
								return a < b;
							case "sgt":
								return a > b;
							case "sle":
								return a <= b;
							case "sge":
								return a >= b;
						}
					};

					const source1 = this.get_value(args[1]);
					const source2 = this.get_value(args[2]);

					if (operations(source1, source2))
						this.change_register(args[0].value.name as RegisterName, 1);

					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "beq":
			case "bne":
			case "blt":
			case "bgt":
			case "ble":
			case "bge": {
				if (is_register(args[0]) && is_label(args[2])) {
					const operation = (a: number, b: number) => {
						switch (kind) {
							case "beq":
								return a === b;
							case "ble":
								return a <= b;
							case "bne":
								return a !== b;
							case "blt":
								return a < b;
							case "bgt":
								return a > b;
							case "bge":
								return a >= b;
						}
					};

					const destination = this.get_value(args[0]);
					const source = this.get_value(args[1]);
					const label_position = this.get_value(args[2]);

					if (operation(destination, source))
						this.change_pc(label_position + 1);

					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "sub":
			case "div":
			case "mul":
			case "add": {
				const operation = (a: number, b: number) => {
					switch (kind) {
						case "sub":
							return a - b;
						case "div":
							return Math.trunc(a / b);
						case "mul":
							return a * b;
						case "add":
							return a + b;
					}
				};

				if (is_register(args[0]) && is_register(args[1])) {
					const destination = args[0].value;
					const source1 = this.get_value(args[1]);
					const source2 = this.get_value(args[2]);

					const result = operation(source1, source2);

					this.change_register(destination.name as RegisterName, result);
					break;
				}

				throw new Error(`Invalid arguments: ${args.map((arg) => arg.kind)}`);
			}
			case "jr": {
				if (is_register(args[0])) {
					const register = args[0].value;
					const position = get_register_position(register.name as RegisterName);
					this.change_pc(this.registers[position]);
				}
				break;
			}
			case "j": {
				if (is_label(args[0])) {
					const label_position = this.get_value(args[0]);

					this.change_pc(label_position + 1);
				}

				break;
			}
			case "sw": {
				if (is_register(args[0]) && is_register(args[1])) {
					const source = args[0];
					const destination = args[1].value;
					const offset = 0; // NOTE: We don't support offset for now

					const destinationPosition = get_register_position(
						destination.name as RegisterName,
					);

					const address = this.registers[destinationPosition] + offset;
					this.change_memory(address, this.get_value(source));
				}
				break;
			}
			case "lw": {
				if (
					is_register(args[0]) &&
					is_immediate(args[1]) &&
					is_register(args[2])
				) {
					const destination = args[0].value;
					const offset = args[1].value;
					const source = args[2].value;

					const sourcePosition = get_register_position(
						source.name as RegisterName,
					);

					const address = this.registers[sourcePosition] + offset;
					this.change_register(
						destination.name as RegisterName,
						this.memory[address],
					);
				}
				break;
			}
			case "halt": {
				this.halt();
				break;
			}
			default:
				throw new Error(`Unsupported instruction: ${kind}`);
		}
	}

	private search_entrypoint(
		entrypoint: string,
		statements: Statement[],
	): number {
		return statements.findIndex(
			(statement) =>
				statement.kind === "label" && statement.value === entrypoint,
		);
	}

	private halt() {
		this.halted = true;
		this.updates.halted = true;
	}

	private change_register(register_name: RegisterName, value: number) {
		const position = get_register_position(register_name);
		this.registers[position] = value;

		this.updates.register_patch.push(position);
		this.updates.register_patch.push(value);
	}

	private change_memory(address: number, value: number) {
		this.memory[address] = value;
		this.updates.memory_patch.push(address);
		this.updates.memory_patch.push(value);
	}

	private change_pc(value: number) {
		this.pc = value;
		this.updates.pc = value;
	}

	/**
	 * Retrieves the numeric value associated with a given instruction argument.
	 * This method handles different types of instruction arguments:
	 * - Immediate values are returned directly.
	 * - Register values are retrieved from the `registers` array based on the register's position.
	 * - Label values are resolved to their corresponding entry point position within the `statements` array.
	 *
	 * @param {InstructionArgument} value - The instruction argument from which to retrieve the value.
	 * This can be an immediate value, a register, or a label.
	 *
	 * @returns {number} The numeric value of the instruction argument.
	 *
	 * @throws {Error} Throws an error if the label is not found in `statements` or if the argument type is unsupported.
	 *
	 * @private
	 */
	private get_value(value: InstructionArgument): number {
		if (is_immediate(value)) {
			return value.value;
		}
		if (is_register(value)) {
			return this.registers[
				get_register_position(value.value.name as RegisterName)
			];
		}
		if (is_label(value)) {
			const label_position = this.search_entrypoint(
				value.value,
				this.statements,
			);
			if (label_position === -1)
				throw new Error(`Could not find label: ${value.value}`);

			return label_position;
		}

		throw new Error(`Unsupported value type: ${value}`);
	}

	public reset() {
		this.registers = new Array(32).fill(0);
		this.pc = 0;
		this.memory.fill(0);
		this.stack.fill(0);
		this.statements = [];
		this.variable_lookup = new Map();
		this.halted = false;
	}

	public is_halted() {
		return this.halted;
	}

	public is_interrupted() {
		return this.interrupted;
	}
}

// TODO: Move to the lib later
function variable_to_bytes({ type, value }: Variable): Uint8Array {
	switch (type) {
		case "Asciiz": {
			if (is_string(value)) return new CStringEncoder().encode(value.value);
			throw new Error("Unsupported value type");
		}
		case "Space": {
			if (is_bytes(value)) return new Uint8Array(value.value);
			throw new Error("Unsupported value type");
		}
		default:
			throw new Error(`Unsupported variable type: ${type}`);
	}
}

function is_register(
	arg: InstructionArgument,
): arg is { kind: "register"; value: Register } {
	return arg.kind === "register";
}

function is_immediate(
	arg: InstructionArgument,
): arg is { kind: "immediate"; value: number } {
	return arg.kind === "immediate";
}

function is_label(
	arg: InstructionArgument,
): arg is { kind: "label"; value: string } {
	return arg.kind === "label";
}

function is_string(value: Value): value is { kind: "string"; value: string } {
	return value.kind === "string";
}

function is_bytes(value: Value): value is { kind: "bytes"; value: number } {
	return value.kind === "bytes";
}

function unreachable(): never {
	throw new Error(
		"This should be unreachable, if you see this, please report it as a bug.",
	);
}

const registerMap: { [key: string]: number } = {
	$zero: 0,
	$at: 1,
	$v0: 2,
	$v1: 3,
	$a0: 4,
	$a1: 5,
	$a2: 6,
	$a3: 7,
	$t0: 8,
	$t1: 9,
	$t2: 10,
	$t3: 11,
	$t4: 12,
	$t5: 13,
	$t6: 14,
	$t7: 15,
	$s0: 16,
	$s1: 17,
	$s2: 18,
	$s3: 19,
	$s4: 20,
	$s5: 21,
	$s6: 22,
	$s7: 23,
	$t8: 24,
	$t9: 25,
	$k0: 26,
	$k1: 27,
	$gp: 28,
	$sp: 29,
	$s8: 30,
	$ra: 31,
};

type RegisterName =
	| "$zero"
	| "$at"
	| "$v0"
	| "$v1"
	| "$a0"
	| "$a1"
	| "$a2"
	| "$a3"
	| "$t0"
	| "$t1"
	| "$t2"
	| "$t3"
	| "$t4"
	| "$t5"
	| "$t6"
	| "$t7"
	| "$s0"
	| "$s1"
	| "$s2"
	| "$s3"
	| "$s4"
	| "$s5"
	| "$s6"
	| "$s7"
	| "$t8"
	| "$t9"
	| "$k0"
	| "$k1"
	| "$gp"
	| "$sp"
	| "$s8"
	| "$ra";

function get_register_position(register_name: RegisterName): number {
	const position = registerMap[register_name];
	if (position === undefined) {
		throw new Error(`Unknown register: ${register_name}`);
	}
	return position;
}
