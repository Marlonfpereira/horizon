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
import { Command, useVM } from "./hooks/use-vm";
import { toast } from "sonner";
import { useGlobalContext } from "@/app/global-context";

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
	const { error, hasIoInterruption, memory, sendCommand, vmStatus, output } =
		useVM({
			memorySize: 1024 * 1024,
			code,
		});
	const editorRef = useRef<editor.IStandaloneCodeEditor | undefined>(undefined);
	const previousDecorationCollection = useRef<
		editor.IEditorDecorationsCollection | undefined
	>(undefined);

	useEffect(() => {
		if (error) toast.error(error.message);
	}, [error]);

	useEffect(() => {
		if (!editorRef.current) return;
		const pc = get_line_at_pc(code, "main:", vmStatus?.pc ?? 1) + 1;

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
									onClick={() => sendCommand(Command.STEP)}
									disabled={hasIoInterruption}
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
							{output.split("\n").map((line, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: I don't mind
								<p key={index} className="text-sm">
									{line}
								</p>
							))}
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
    ; Test load
    li $v0, 0x10
    sw $v0, 0($v0)

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
