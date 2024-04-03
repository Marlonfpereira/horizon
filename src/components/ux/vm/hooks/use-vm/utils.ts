import type {
	ErrorResponse,
	IOInterruption,
	InputIOInterruption,
	StatusUpdatePayload,
	StatusUpdateResponse,
	VMResponse,
} from "./types";

/**
 * Applies a patch to a Uint32Array memory. The patch is an array of pairs,
 * where each pair consists of an index and a value. The function iterates
 * through the patch array and updates the memory array at the specified indices
 * with the corresponding values.
 *
 * @param {Uint32Array} memory - The Uint32Array to which the patch will be applied.
 * @param {number[]} patch - An array of numbers where each pair represents
 *                           an index and a value to update in the memory array.
 *                           For example, [index1, value1, index2, value2, ...].
 *                           It's important to note that the function does not
 *                           perform bounds checking on the array. The caller
 *                           must ensure that the provided indices and values
 *                           are within the valid range for the memory array.
 *
 * @example
 * // Create a memory block of size 20
 * let memory = new Uint32Array(20);
 *
 * // Define the patch
 * let patch = [0, 100, 10, 31];
 *
 * // Apply the patch
 * apply_memory_patch(memory, patch);
 *
 * // Now, memory[0] === 100 and memory[10] === 31
 */
export function apply_memory_patch(
	memory: /*&*/ Uint32Array,
	patch: Array<number> | null,
): void /* Uint8Array is modified by reference */ {
	if (patch === null) return;
	if (patch.length % 2 !== 0)
		throw new Error("Patch must have an even number of elements");

	for (let i = 0; i < patch.length; i += 2) {
		// As the length of the patch array is always even, we can safely access
		// the next element without checking if it exists.
		if (patch[i] < 0 || patch[i] >= memory.length)
			throw new Error(`Index ${patch[i]} out of bounds`);

		const index = patch[i];
		const value = patch[i + 1];
		memory[index] = value;
	}
}

export function is_status_update_response(
	response: VMResponse,
): response is StatusUpdateResponse {
	return response.type === "StatusUpdate";
}

export function is_error_response(
	response: VMResponse,
): response is ErrorResponse {
	return response.type === "Error";
}

export function has_io_interruption(
	payload: StatusUpdatePayload,
): payload is StatusUpdatePayload & {
	io_interruption: IOInterruption;
} {
	return payload.io_interruption !== null;
}

export function is_input_io_interruption(
	interruption: IOInterruption,
): interruption is InputIOInterruption {
	return interruption.type === "input";
}
