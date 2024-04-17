"use server";

import { transpileTo } from "@celestial-hub/orions-belt";

interface Errorable<T> {
	data?: T;
	error?: string;
}

export async function transpile(code: string): Promise<Errorable<string>> {
	try {
		return { data: transpileTo(code) };
	} catch (error: unknown) {
		return { error: (error as Error).message as string };
	}
}
