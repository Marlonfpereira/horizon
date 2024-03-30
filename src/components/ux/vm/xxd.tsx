import type { FC } from "react";

interface XXDProps {
	data: number[];
}

export const XXD: FC<XXDProps> = ({ data }) => {
	const formatByte = (byte: number) => byte.toString(16).padStart(2, "0");

	const formatASCII = (byte: number) => {
		return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
	};

	const formatHexChunk = (chunk: number[]) => {
		return chunk.reduce((acc, byte, index) => {
			// biome-ignore lint/style/noParameterAssign: reduce
			acc += formatByte(byte);
			if ((index + 1) % 4 === 0 && index < chunk.length - 1) {
				// biome-ignore lint/style/noParameterAssign: reduce
				acc += " ";
			}
			return acc;
		}, "");
	};

	const rows = [];
	for (let i = 0; i < data.length; i += 16) {
		const chunk = data.slice(i, i + 16);
		const hexChunk = formatHexChunk(chunk);
		const asciiChunk = chunk.map(formatASCII).join("");

		rows.push(
			<div key={i} className="flex w-full gap-4 text-sm">
				<span className="text-gray-500">{`[${i
					.toString(16)
					.padStart(8, "0")}]`}</span>
				<span className="text-blue-500">{hexChunk}</span>
				<p className="text-foreground">{asciiChunk}</p>
			</div>,
		);
	}

	return (
		<div className="flex p-4 w-full">
			<div className="w-full font-mono overflow-x-scroll whitespace-nowrap">
				{rows}
			</div>
		</div>
	);
};
