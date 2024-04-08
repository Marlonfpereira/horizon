export enum StatementKind {
	Instruction = "instruction",
	Label = "label",
}

export enum InstructionKind {
	Li = "li",
	La = "la",
	Syscall = "syscall",
	Move = "move",
	Jal = "jal",
	Beq = "beq",
	Sub = "sub",
	Add = "add",
	Jr = "jr",
	Addi = "addi",
	Andi = "andi",
	J = "j",
	Sw = "sw",
	Lw = "Lw",
}

export enum OperandKind {
	Immediate = "immediate",
	Register = "register",
	Label = "label",
}

export enum Type {
	Asciiz = "asciiz",
}

export enum ValueKind {
	String = "string",
}
