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

import { useTheme } from "next-themes";
import { XXD } from "./xxd";
import { Command, useVM } from "./hooks/use-vm";

function entrypoint_line(code: string, entrypoint: string): number {
	return (
		code
			.split("\n")
			.findIndex((line) => line.trim().match(new RegExp(`${entrypoint}:`))) + 1
	);
}

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
	const { error, hasIoInterruption, memory, sendCommand, vmStatus } = useVM({
		memorySize: 1024 * 1024,
	});
	const [code, setCode] = useState(vm_asm);
	const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);
	const previousDecorationCollection = useRef<
		editor.IEditorDecorationsCollection | undefined
	>(undefined);
	const { theme } = useTheme();

	console.log(vmStatus);

	useEffect(() => {
		if (!editorRef.current) return;
		const pc = get_line_at_pc(code, "main:", vmStatus?.pc ?? 1) + 1;
		console.log(pc);

		previousDecorationCollection.current?.clear();

		// Scroll to the line with the program counter
		editorRef.current.revealLineInCenter(pc);

		// Mark line as selected
		editorRef.current.setSelection({
			startColumn: 1,
			endColumn: 1,
			startLineNumber: pc,
			endLineNumber: pc,
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
	}, [vmStatus?.pc, code]);

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="w-full h-full rounded-lg border"
		>
			<ResizablePanel defaultSize={20}>
				<header className="border-b border-border p-2 bg-accent">
					<p className="text-md text-primary">Registers</p>
				</header>
				<RegisterTable registers={vmStatus?.registers} />
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
									theme:
										theme === "dark" || theme === "system"
											? "vitesse-dark"
											: "vitesse-light",
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

									monaco.editor.setTheme(
										theme === "dark" || theme === "system"
											? "vitesse-dark"
											: "vitesse-light",
									);
								}}
							/>
							<div className="flex gap-2 p-2 bg-accent">
								<Button
									variant="default"
									size="sm"
									onClick={() => sendCommand(Command.STEP)}
								>
									Step
								</Button>
								<Button variant="destructive" size="sm">
									Reset
								</Button>
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={25}>
						<header className="border-b border-border p-2 bg-accent">
							<p className="text-md text-primary">Output</p>
						</header>
						<section className="flex flex-col gap-2 font-mono p-2">
							<p>The sum of is: 4</p>
						</section>
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={30}>
				<ResizablePanelGroup direction="vertical">
					<ResizablePanel defaultSize={50}>
						<header className="border-b border-border p-2 bg-accent">
							<p className="text-md text-primary">Memory</p>
						</header>
						<XXD data={memory.slice(0, 255)} />
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize={50}>
						<header className="border-b border-border p-2 bg-accent">
							<p className="text-md text-primary">Stack</p>
						</header>
						<XXD data={new Uint32Array(255).slice(0, 255)} />
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

const vm_asm = `    .data
prompt: .asciiz "The sum of is: "

    .text
    .global main
main:
    ; Read number 1
    li $v0, 5
    syscall
    move $t0, $v0

    ; Read number 2
    li $v0, 5
    syscall
    move $t1, $v0

    ; Add numbers
    add $t2, $t0, $t1

    ; Print prompt
    li $v0, 4
    la $a0, prompt
    syscall

    ; Print added value
    li $v0, 1
    move $a0, $t2
    syscall

    ; Exit
    li $v0, 0xA
    syscall`;
