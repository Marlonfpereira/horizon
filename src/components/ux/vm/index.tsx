"use client";

import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { getHighlighter } from "shiki";
import { shikiToMonaco } from "@shikijs/monaco";
import { Button } from "@/components/ui/button";
import { RegisterTable } from "./register-table";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";

import { XXD } from "./xxd";
import { useGlobalContext } from "@/app/global-context";
import { getAst } from "./services/@ast";
import { useVM_ } from "@/lib/vm";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

function get_line_at_pc(code: string, entrypoint: string, pc: number): number {
	const lines = code.split("\n").map((line) => line.trim());
	const entrypointIndex = lines.findIndex((line) => line === entrypoint);

	if (entrypointIndex === -1) return -1;

	let currentPC = 0;
	const targetIndex = lines.slice(entrypointIndex).findIndex((line) => {
		if (line !== "" && !line.startsWith(";")) {
			currentPC++;
		}
		return currentPC === pc;
	});

	return targetIndex !== -1 ? entrypointIndex + targetIndex : -1;
}

export function VMIDE() {
	const {
		resultMIPSCode: { resultMIPSCode },
		defaultMIPSCode: { defaultMIPSCode },
	} = useGlobalContext();
	const [code, setCode] = useState(resultMIPSCode ?? defaultMIPSCode);
	const {
		error,
		registers,
		memory,
		step,
		pc,
		output,
		reset,
		run,
		halted,
		tickInterval,
		setTickInterval,
	} = useVM_({
		code,
		memorySize: 1024 * 8,
		stackSize: 1024 * 8,
	});

	const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);
	const previousDecorationCollection = useRef<
		editor.IEditorDecorationsCollection | undefined
	>(undefined);

	useEffect(() => {
		async function fetchAst() {
			console.log(await getAst(code));
		}

		fetchAst();
	}, [code]);

	useEffect(() => {
		if (error) toast.error(error);
	}, [error]);

	useEffect(() => {
		if (!editorRef.current) return;
		const current_pc = get_line_at_pc(code, "main:", pc) + 1;

		previousDecorationCollection.current?.clear();

		// Scroll to the line with the program counter
		editorRef.current.revealLineInCenter(current_pc);

		// Mark line as selected
		editorRef.current.setSelection({
			startColumn: 1,
			endColumn: 1,
			startLineNumber: current_pc,
			endLineNumber: current_pc,
		});

		const decorationOptions = {
			isWholeLine: true,
			className: "pc-line",
			glyphMarginClassName: "pc-glyph",
		};

		const currentLine = editorRef.current.getPosition();

		// Highlight the current line and remove the previous one
		previousDecorationCollection.current =
			editorRef.current.createDecorationsCollection([
				{
					range: {
						startLineNumber: currentLine?.lineNumber ?? 1,
						endLineNumber: currentLine?.lineNumber ?? 1,
						startColumn: 1,
						endColumn: 1,
					},
					options: decorationOptions,
				},
			]);
	}, [pc, code]);

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="w-full h-full rounded-lg border"
		>
			<ResizablePanel defaultSize={20}>
				<header className="border-b border-border p-2 bg-accent">
					<p className="text-md text-primary">Registers</p>
				</header>
				<RegisterTable registers={registers} />
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={50}>
				<ResizablePanelGroup direction="vertical">
					<ResizablePanel defaultSize={75}>
						<div className="flex flex-col w-full h-full">
							<header className="p-2 bg-accent">
								<p className="text-md text-primary">Text Segment</p>
							</header>
							<Editor
								defaultLanguage="asm"
								defaultValue={code}
								options={{
									readOnly: true,
									theme: "vitesse-dark",
								}}
								onMount={(editor) => {
									editorRef.current = editor;
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
							/>
							<div className="flex gap-2 p-2 bg-accent">
								<Button
									variant="default"
									size="sm"
									onClick={step}
									disabled={halted}
								>
									Step
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={run}
									disabled={halted}
								>
									Run
								</Button>
								<Button variant="destructive" size="sm" onClick={reset}>
									Reset
								</Button>
								<div className="flex flex-row gap-2 w-1/3">
									<Slider
										defaultValue={[tickInterval]}
										onValueChange={(value) => setTickInterval(value[0])}
										min={0}
										max={1000}
										step={10}
									/>
									<p>{tickInterval}ms</p>
								</div>
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<AutoScrollSection output={output} />
				</ResizablePanelGroup>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={30}>
				<ResizablePanelGroup direction="vertical">
					<ResizablePanel defaultSize={50}>
						<header className="border-b border-border p-2 bg-accent">
							<p className="text-md text-primary">Memory</p>
						</header>
						<XXD data={memory.slice(0, 256)} />
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={50}>
						<header className="border-b border-border p-2 bg-accent">
							<p className="text-md text-primary">Stack</p>
						</header>
						<XXD data={new Uint32Array(256).slice(0, 256)} />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function AutoScrollSection({ output }: { output: string }) {
	const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Dependency array includes output to react to its changes
	useEffect(() => {
		if (endOfMessagesRef.current) {
			endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [endOfMessagesRef, output]);

	return (
		<ResizablePanel defaultSize={25}>
			<header className="border-b border-border p-2 bg-accent">
				<p className="text-md text-primary">Output</p>
			</header>
			<section className="flex flex-col grow font-mono p-2 overflow-scroll">
				{output.split("\n").map((line: string, index: number) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: I don't mind
					<p key={index} className="text-sm">
						{line}
					</p>
				))}
				<div ref={endOfMessagesRef} /> {/* Invisible element to scroll to */}
			</section>
		</ResizablePanel>
	);
}
