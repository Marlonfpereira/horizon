// ==================== VM Response ====================

export type VMResponse = StatusUpdateResponse | ErrorResponse;

/// Status Update Response
export interface StatusUpdateResponse {
	type: "StatusUpdate";
	payload: StatusUpdatePayload;
}

/// Error Response
export interface ErrorResponse {
	type: "Error";
	payload: ErrorPayload;
}

// ==================== VM Payload ====================

/// Status Update Payload
export interface StatusUpdatePayload {
	registers: Array<number>;
	pc: number;
	io_interruption: IOInterruption | null;
	memory_patch: Array<number> | null;
}

type IOInterruption = InputIOInterruption | OutputIOInterruption;

interface InputIOInterruption {
	type: "input";
	payload: "string" | "number";
}

interface OutputIOInterruption {
	type: "output";
	payload: null;
}

/// Error Payload
type ErrorPayload = string;
