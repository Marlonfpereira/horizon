"use client";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import Editor, { useMonaco } from "@monaco-editor/react";
import { transpile } from "./services/@transpile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getHighlighter } from "shiki";
import { shikiToMonaco } from "@shikijs/monaco";
import { useRouter } from "next/navigation";
import { useGlobalContext } from "@/app/global-context";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { samples } from "@/lib/examples";
import { SelectGroup } from "@radix-ui/react-select";
import { titleCase } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { editor } from "monaco-editor";

export function IDE() {
	const router = useRouter();
	const {
		resultMIPSCode: { resultMIPSCode: result, setResultMIPSCode },
		initialEtacCode: { initialEtacCode: code, setInitialEtacCode: setCode },
	} = useGlobalContext();

	async function transpileCode() {
		let fix = code.replace(/[\r]+/gm, "")
		
		const { data, error } = await transpile(fix);
		if (error || !data) {
			toast.error("An error occurred while transpiling the code.");
			toast.error(error);
			return;
		}

		setResultMIPSCode(data);
	}

	function loadToVm() {
		router.push("/vm");
	}

	return (
		<div className="flex justify-center items-start w-full h-full">
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={50}>
					<div className="flex flex-col w-full h-full">
						<header className="flex flex-row justify-between items-center p-2 bg-accent">
							<div className="flex flex-row gap-2 items-center">
								<p className="text-md text-primary">ETAC</p>
								<Select onValueChange={setCode}>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Code" />
										<SelectContent>
											{Object.entries(samples).map(([key, value]) => (
												<SelectGroup>
													<SelectLabel>
														{titleCase(key).replaceAll("_", " ")}
													</SelectLabel>
													{Object.entries(value).map(([key, value]) => (
														<SelectItem key={key} value={value}>
															{titleCase(key).replaceAll("_", " ")}
														</SelectItem>
													))}
												</SelectGroup>
											))}
										</SelectContent>
									</SelectTrigger>
								</Select>
							</div>
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
						<header className="flex flex-row justify-between items-center p-2 bg-accent">
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
	const theme = useTheme();
	const monaco = useMonaco();

	useEffect(() => {
		monaco?.editor.setTheme(
			theme.theme === "light" ? "vitesse-light" : "vitesse-dark",
		);
	}, [theme, monaco?.editor]);

	return (
		<Editor
			language={language}
			value={code}
			options={{
				readOnly,
				theme: theme.theme === "light" ? "vitesse-light" : "vitesse-dark",
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
