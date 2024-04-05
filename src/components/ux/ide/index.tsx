"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import Editor from "@monaco-editor/react";
import { transpile } from "./services/@transpile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getHighlighter } from "shiki";
import { shikiToMonaco } from "@shikijs/monaco";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "@/app/global-context";

export function IDE() {
	const router = useRouter();
	const {
		resultMIPSCode: { resultMIPSCode: result, setResultMIPSCode },
		initialEtacCode: { initialEtacCode: code, setInitialEtacCode: setCode },
	} = useGlobalContext();

	async function transpileCode() {
		const result = await transpile(code).catch((err) => {
			toast.error(err?.message ?? "An error occurred");
		});
		if (result) setResultMIPSCode(result);
	}

	function loadToVm() {
		router.push("/vm");
	}

	return (
		<div className="flex justify-center items-start w-full h-full">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={50}>
					<div className="flex flex-col w-full h-full">
						<header className="flex flex-row justify-between p-2 bg-accent">
							<p className="text-md text-primary">ETAC</p>
							<Button
								size="sm"
								variant="outline"
								onClick={() => transpileCode()}
							>
								Transpile
							</Button>
						</header>
						<EditorWrapper
							language="rust"
							code={code}
							onChange={(value) => value && setCode(value)}
						/>
					</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={50}>
					<div className="flex flex-col w-full h-full">
						<header className="flex flex-row justify-between p-2 bg-accent">
							<p className="text-md text-primary">MIPS</p>
							<Button
								size="sm"
								variant="link"
								onClick={loadToVm}
								disabled={result === undefined}
							>
								Load to VM
							</Button>
						</header>
						<EditorWrapper language="asm" code={result ?? ""} readOnly />
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

function EditorWrapper({
	code,
	language,
	onChange,
	readOnly = false,
}: {
	code: string;
	language: string;
	onChange?: (value: string | undefined) => void;
	readOnly?: boolean;
}) {
	return (
		<Editor
			language={language}
			value={code}
			options={{
				readOnly,
				theme: "vitesse-dark",
				minimap: {
					enabled: false,
				},
			}}
			beforeMount={async (monaco) => {
				const highlighter = await getHighlighter({
					themes: ["vitesse-dark", "vitesse-light"],
					langs: ["abap", "asm"],
				});
				monaco.languages.register({ id: "abap" });
				monaco.languages.register({ id: "asm" });

				shikiToMonaco(highlighter, monaco);

				monaco.editor.setTheme("vitesse-dark");
			}}
			onChange={onChange}
		/>
	);
}

const etac_code = `t1: i8 = 1i8
t2: i8 = 2i8
t3: i8 = t1 + t2`;
