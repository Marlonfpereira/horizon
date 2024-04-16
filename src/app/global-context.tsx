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

const sample_etac_code = `
call write_string("Hello, World!\\n")
`.trim();

const vm_asm = `
.data

    .text
    .global main
main:
    halt
`.trim();

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
