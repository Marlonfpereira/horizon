"use server";

import { mipsAst } from "@celestial-hub/orions-belt";
import type { Program } from "@celestial-hub/orions-belt/mips-ast";

interface Errorable<T> {
	data?: T;
	error?: string;
}

export async function getAst(code: string): Promise<Errorable<Program>> {
	try {
		return { data: mipsAst(code) as Program };
	} catch (error: unknown) {
		return { error: error as string };
	}
}
