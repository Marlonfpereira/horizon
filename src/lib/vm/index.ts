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

interface VMProps {
	code: string;
	memorySize: number;
	stackSize: number;
}

export function useVM_({ code, memorySize, stackSize }: VMProps) {
	const [memory, setMemory] = useState<Uint32Array>(
		new Uint32Array(memorySize),
	);
	const [registers, setRegisters] = useState<number[]>(new Array(32).fill(0));
	const [error, setError] = useState<string | undefined>();
	const [output, setOutput] = useState<string>("");
	const [pc, setPc] = useState<number>(0);
	const vm = useRef<VM | undefined>(undefined);

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
				const error = err as Error;
				setError(error.message);
			}
		}

		if (vm.current === undefined) {
			vm.current = new VM({ memorySize, stackSize });
			loadCode(code);
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
	}

	function step() {
		try {
			if (vm.current === undefined) return;
			vm.current.step();
			apply_updates();
		} catch (err) {
			const error = err as Error;
			setError(error.message);
		}
	}

	return {
		error,
		output,
		memory,
		registers,
		step,
		pc,
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
}

class VM {
	private registers: number[] = new Array(32).fill(0);
	private pc = 0;
	private memory: Uint8Array;
	private stack: Uint8Array;
	private statements: Statement[] = [];
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
		const program: Program = await getAst(code);

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
		switch (kind) {
			case "li": {
				if (is_register(args[0]) && is_immediate(args[1])) {
					console.log("li args:", args);
					const register = args[0].value;
					const immediate = args[1].value;

					this.change_register(register.name as RegisterName, immediate);
					return;
				}

				unreachable();
				break;
			}
			case "la": {
				if (is_register(args[0]) && is_label(args[1])) {
					const register = args[0].value;
					const label = args[1].value;

					const address = this.variable_lookup.get(label);
					console.log("la args:", args);
					if (address === undefined) throw new Error(`Unknown label: ${label}`);

					this.change_register(register.name as RegisterName, address);
				}
				break;
			}
			case "syscall": {
				const code = this.registers[get_register_position("$v0")];

				switch (code) {
					case 1: {
						const value = this.registers[get_register_position("$a0")];
						this.updates.output = value.toString();
						break;
					}
					case 4: {
						const address = this.registers[get_register_position("$a0")];
						const string = new TextDecoder().decode(this.memory.slice(address));
						this.updates.output = string;
						break;
					}
					case 5: {
						let value = Number.NaN;
						while (Number.isNaN(value)) {
							value = Number(window.prompt("Enter a number:"));
						}

						this.change_register("$v0", value);
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

					const destinationPosition = get_register_position(
						destination.name as RegisterName,
					);
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
					const label = args[0].value;
					const label_position = this.search_entrypoint(label, this.statements);
					if (label_position === -1)
						throw new Error(`Could not find label: ${label}`);

					this.change_register("$ra", this.pc);
					this.change_pc(label_position);
				}
				break;
			}
			case "beq": {
				if (is_register(args[0]) && is_register(args[1]) && is_label(args[2])) {
					const source1 = args[0].value;
					const source2 = args[1].value;
					const label = args[2].value;

					const source1Position = get_register_position(
						source1.name as RegisterName,
					);
					const source2Position = get_register_position(
						source2.name as RegisterName,
					);

					if (
						this.registers[source1Position] === this.registers[source2Position]
					) {
						const label_position = this.search_entrypoint(
							label,
							this.statements,
						);
						if (label_position === -1)
							throw new Error(`Could not find label: ${label}`);

						this.change_pc(label_position);
					}
				}
				break;
			}
			case "sub": {
				if (
					is_register(args[0]) &&
					is_register(args[1]) &&
					is_register(args[2])
				) {
					const destination = args[0].value;
					const source1 = args[1].value;
					const source2 = args[2].value;

					const result =
						this.registers[
							get_register_position(source1.name as RegisterName)
						] -
						this.registers[get_register_position(source2.name as RegisterName)];

					this.change_register(destination.name as RegisterName, result);
				}
				break;
			}
			case "add": {
				if (
					is_register(args[0]) &&
					is_register(args[1]) &&
					is_register(args[2])
				) {
					const destination = args[0].value;
					const source1 = args[1].value;
					const source2 = args[2].value;

					const result =
						this.registers[
							get_register_position(source1.name as RegisterName)
						] +
						this.registers[get_register_position(source2.name as RegisterName)];

					this.change_register(destination.name as RegisterName, result);
				}
				break;
			}
			case "jr": {
				if (is_register(args[0])) {
					const register = args[0].value;
					const position = get_register_position(register.name as RegisterName);
					this.change_pc(this.registers[position]);
				}
				break;
			}
			case "addi": {
				if (
					is_register(args[0]) &&
					is_register(args[1]) &&
					is_immediate(args[2])
				) {
					const destination = args[0].value;
					const source = args[1].value;
					const immediate = args[2].value;

					const result =
						this.registers[get_register_position(source.name as RegisterName)] +
						immediate;

					this.change_register(destination.name as RegisterName, result);
				}
				break;
			}
			case "andi": {
				if (
					is_register(args[0]) &&
					is_register(args[1]) &&
					is_immediate(args[2])
				) {
					const destination = args[0].value;
					const source = args[1].value;
					const immediate = args[2].value;

					const result =
						this.registers[get_register_position(source.name as RegisterName)] &
						immediate;

					this.change_register(destination.name as RegisterName, result);
				}

				break;
			}
			case "j": {
				if (is_immediate(args[0])) {
					const address = args[0].value;

					if (address >= this.statements.length) {
						throw new Error(`Jump address out of range: ${address}`);
					}

					this.change_pc(address);
				}

				break;
			}
			case "sw": {
				if (is_register(args[0]) && is_register(args[1])) {
					const source = args[0].value;
					const destination = args[1].value;
					const offset = 0; // NOTE: We don't support offset for now

					const sourcePosition = get_register_position(
						source.name as RegisterName,
					);
					const destinationPosition = get_register_position(
						destination.name as RegisterName,
					);

					const address = this.registers[destinationPosition] + offset;
					this.change_memory(address, this.registers[sourcePosition]);
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
}

// TODO: Move to the lib later
function variable_to_bytes({ type, value }: Variable): Uint8Array {
	switch (type) {
		case "Asciiz": {
			console.log("value:", value);
			if (is_string(value)) {
				console.log("value:", value);
				return new TextEncoder().encode(value.value);
			}

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
