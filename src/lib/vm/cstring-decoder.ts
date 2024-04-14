export class CStringDecoder {
	public decode(buffer: Uint8Array): string {
		// Find the index of the first null byte
		const nullIndex = buffer.indexOf(0);
		let stringBuffer = buffer;

		// If a null byte is found, slice the buffer up to that byte
		if (nullIndex !== -1) {
			stringBuffer = buffer.slice(0, nullIndex);
		}

		// Decode the UTF-8 string
		return new TextDecoder("utf-8").decode(stringBuffer);
	}
}
