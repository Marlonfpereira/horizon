"use server";

import { transpileTo } from "@celestial-hub/orions-belt";

export async function transpile(code: string): Promise<string> {
	try {
		return transpileTo(code);
	} catch (error: unknown) {
		throw new Error(error as string);
	}
}
