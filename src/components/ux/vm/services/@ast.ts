"use server";

import { mipsAst } from "@celestial-hub/orions-belt";
import type { Program } from "@celestial-hub/orions-belt/mips-ast";

export async function getAst(code: string): Promise<Program> {
	try {
		return mipsAst(code) as Program;
	} catch (error: unknown) {
		throw new Error(error as string);
	}
}
