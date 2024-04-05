"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

interface GlobalContextType {
	initialEtacCode: {
		initialEtacCode: string;
		setInitialEtacCode: (data: string) => void;
	};
	resultMIPSCode: {
		resultMIPSCode?: string;
		setResultMIPSCode: (data: string) => void;
	};
	defaultMIPSCode: {
		defaultMIPSCode: string;
		setDefaultMIPSCode: (data: string) => void;
	};
}

const sample_etac_code = `t1: i8 = 1i8
t2: i8 = 2i8
t3: i8 = t1 + t2`;

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

export const GlobalContext = createContext<GlobalContextType>(
	{} as GlobalContextType,
);

export const GlobalContextProvider = ({
	children,
}: { children: ReactNode }) => {
	const [etac_code, setInitialEtacCode] = useState(sample_etac_code);
	const [resultMIPSCode, setResultMIPSCode] = useState<string | undefined>(
		undefined,
	);
	const [defaultMIPSCode, setDefaultMIPSCode] = useState(vm_asm);

	return (
		<GlobalContext.Provider
			value={{
				initialEtacCode: { initialEtacCode: etac_code, setInitialEtacCode },
				resultMIPSCode: { resultMIPSCode: resultMIPSCode, setResultMIPSCode },
				defaultMIPSCode: {
					defaultMIPSCode: defaultMIPSCode,
					setDefaultMIPSCode,
				},
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
};

export function useGlobalContext(): GlobalContextType {
	return useContext(GlobalContext);
}
