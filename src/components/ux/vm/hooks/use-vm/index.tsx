"use client";

import { useEffect, useState } from "react";

import type { ErrorPayload, StatusUpdatePayload, VMResponse } from "./types";

import {
	apply_memory_patch,
	has_io_interruption,
	is_error_response,
	is_status_update_response,
} from "./utils";
import { toast } from "sonner";

export enum Command {
	STEP = "Step",
	RUN = "Run",
}

interface useVMProps {
	memorySize: number;
}

export function useVM({ memorySize }: useVMProps) {
	const [ws, setWs] = useState<WebSocket | undefined>();
	const [vmStatus, setVmStatus] = useState<StatusUpdatePayload | undefined>();
	const [memory, setMemory] = useState<Uint32Array>(
		new Uint32Array(memorySize),
	);
	const [error, setError] = useState<ErrorPayload | undefined>();

	const [hasIoInterruption, setHasIoInterruption] = useState(false);

	useEffect(() => {
		const ws = new WebSocket("ws://localhost:9123/ws");
		setWs(ws);

		ws.onerror = (event) => {
			toast.error("Failed to connect to the VM");
			console.error(event);
		};

		ws.onopen = () => {
			toast.success("Connected to the VM");
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
	}, [memory]);

	function sendCommand(command: Command) {
		ws?.send(
			JSON.stringify({
				type: "Command",
				payload: {
					command,
				},
			}),
		);
	}

	return {
		sendCommand,
		hasIoInterruption,
		vmStatus,
		error,
		memory,
	};
}
