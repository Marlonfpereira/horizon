"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import { transpile } from "./services/@transpile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function IDE() {
	const [code, setCode] = useState(etac_code);
	const [result, setResult] = useState("");

	async function transpileCode() {
		const result = await transpile(code).catch((err) => {
			toast.error(err.message);
		});
		if (result) setResult(result);
	}

	return (
		<div>
			<Button onClick={transpileCode}>Transpile</Button>
			<div className="flex justify-center items-start w-full h-80dvh">
				<ResizablePanelGroup direction="horizontal">
					<ResizablePanel>
						<div className="w-full p-4 border">
							<h2>ETAC</h2>
							<Editor
								height="80dvh"
								defaultLanguage="rust"
								value={code}
								options={{
									theme: "vs-dark",
								}}
								onChange={(value) => value && setCode(value)}
							/>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel>
						<div className="w-full p-4 border">
							<h2>MIPS</h2>
							<Editor
								height="80dvh"
								defaultLanguage="abap"
								defaultValue={result}
								value={result}
								options={{
									readOnly: true,
									theme: "vs-dark",
								}}
							/>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</div>
	);
}

const etac_code = `t1: i8 = 1i8
t2: i8 = 2i8
t3: i8 = t1 + t2`;
