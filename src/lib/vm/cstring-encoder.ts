export class CStringEncoder {
	public encode(str: string): Uint8Array {
		// Preprocess the string to handle escaped backslashes and convert \n, \t
		const preprocessedString = str
			.replace(/\\\\/g, "\\\\") // Handle escaped backslashes first
			.replace(/\\n/g, "\n") // Replace \n with its ASCII equivalent
			.replace(/\\t/g, "\t"); // Replace \t with its ASCII equivalent

		// Encode the preprocessed string
		const encoder = new TextEncoder();
		const stringBuffer = encoder.encode(preprocessedString);
		const buffer = new Uint8Array(stringBuffer.length + 1);

		buffer.set(stringBuffer);
		buffer[buffer.length - 1] = 0; // Ensure null termination

		return buffer;
	}
}
