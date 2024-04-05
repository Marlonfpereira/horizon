"use client";

import { useEffect, useState } from "react";

import type {
	ErrorPayload,
	InitPayload,
	StatusUpdatePayload,
	VMResponse,
} from "./types";

import {
	apply_memory_patch,
	has_io_interruption,
	is_error_response,
	is_status_update_response,
	is_input_io_interruption,
	is_output_io_interruption,
} from "./utils";
import { toast } from "sonner";

export enum Command {
	STEP = "Step",
	RUN = "Run",
	INIT = "Init",
}

interface useVMProps {
	memorySize: number;
	code: string;
}

export function useVM({ memorySize, code }: useVMProps) {
	const [ws, setWs] = useState<WebSocket | undefined>();
	const [vmStatus, setVmStatus] = useState<StatusUpdatePayload | undefined>();
	const [memory, setMemory] = useState<Uint32Array>(
		new Uint32Array(memorySize),
	);
	const [error, setError] = useState<ErrorPayload | undefined>();
	const [output, setOutput] = useState<string>("");

	const [hasIoInterruption, setHasIoInterruption] = useState(false);

	useEffect(() => {
		const ws = new WebSocket("ws://localhost:9123/ws");
		setWs(ws);

		ws.onopen = () => {
			toast.success("Connected to the VM");

			ws?.send(
				JSON.stringify({
					type: "Command",
					payload: {
						command: {
							type: Command.INIT,
							payload: {
								code,
								memory_size: memorySize,
								stack_size: memorySize,
							},
						},
					},
				}),
			);
		};

		ws.onmessage = (event) => {
			const response: VMResponse = JSON.parse(event.data);

			if (is_status_update_response(response)) {
				setVmStatus(response.payload);
				setHasIoInterruption(has_io_interruption(response.payload));
				apply_memory_patch(memory, response.payload.memory_patch);
				setMemory(memory);
				setError(undefined);
			} else if (is_error_response(response)) {
				setError(response.payload);
				setVmStatus(undefined);
			} else {
				// TODO: Report unknown protocol
			}
		};

		return () => {
			ws.close();
		};
	}, [memory, memorySize, code]);

	function sendCommand<T>(command: Command, payload?: T) {
		ws?.send(
			JSON.stringify({
				type: "Command",
				payload: {
					command: {
						type: command,
						payload: payload,
					},
				},
			}),
		);
	}

	if (vmStatus?.io_interruption && hasIoInterruption) {
		const interruption = vmStatus.io_interruption;

		if (is_input_io_interruption(interruption)) {
			const prompt =
				interruption.payload === "number" ? "Enter a number" : "Enter a string";

			const response = window.prompt(prompt) || "0";
			ws?.send(
				JSON.stringify({
					type: "Input",
					payload: response,
				}),
			);
		} else if (is_output_io_interruption(interruption)) {
			setOutput((prev) => prev + interruption.payload);
			// TODO: Notify the vm that the output has been read I think
		}

		setHasIoInterruption(false);
	}

	return {
		sendCommand,
		hasIoInterruption,
		vmStatus,
		error,
		memory,
		output,
	};
}
