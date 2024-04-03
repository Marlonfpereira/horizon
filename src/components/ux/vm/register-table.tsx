"use client";

import { type FC, useState, useEffect } from "react";
import {
	Table,
	TableCaption,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from "@/components/ui/table"; // Replace with your UI library import
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RegisterTableProps = {
	registers?: number[];
};

const registerNames = [
	"$zero",
	"$at",
	"$v0",
	"$v1",
	"$a0",
	"$a1",
	"$a2",
	"$a3",
	"$t0",
	"$t1",
	"$t2",
	"$t3",
	"$t4",
	"$t5",
	"$t6",
	"$t7",
	"$s0",
	"$s1",
	"$s2",
	"$s3",
	"$s4",
	"$s5",
	"$s6",
	"$s7",
	"$t8",
	"$t9",
	"$k0",
	"$k1",
	"$gp",
	"$sp",
	"$s8",
	"$ra",
];

export const RegisterTable: FC<RegisterTableProps> = ({
	registers: values,
}) => {
	const [valueFormat, setValueFormat] = useState("hex");
	const [previousState, setPreviousState] = useState<number[] | undefined>(
		undefined,
	);
	const [highlightedRows, setHighlightedRows] = useState<number[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!values) return;

		const highlightedRows = values
			.map((value, index) => {
				if (!previousState) return false;
				return value !== previousState[index] ? index : false;
			})
			.filter((value) => value !== false);

		setHighlightedRows(highlightedRows as number[]);
		setPreviousState(values);
	}, [values]);

	const formatValue = (value: number) => {
		switch (valueFormat) {
			case "hex":
				return `0x${value.toString(16).padStart(8, "0")}`;
			case "bin":
				return value
					.toString(2)
					.padStart(32, "0")
					.replace(/(.{8})/g, "$1 ");
			default:
				return value.toString();
		}
	};

	return (
		<div className="flex flex-col gap-2 p-4 h-[800px]">
			<RadioGroup
				className="flex flex-row"
				defaultValue="hex"
				onValueChange={setValueFormat}
			>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="hex" id="hex" className="cursor-pointer" />
					<Label htmlFor="hex" className="cursor-pointer">
						Hexadecimal
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="dec" id="dec" className="cursor-pointer" />
					<Label htmlFor="dec" className="cursor-pointer">
						Decimal
					</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="bin" id="bin" className="cursor-pointer" />
					<Label htmlFor="bin" className="cursor-pointer">
						Binary
					</Label>
				</div>
			</RadioGroup>

			<Table>
				<TableCaption>Register Values</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Register</TableHead>
						<TableHead>Value</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{values?.map((value, index) => (
						<TableRow
							key={crypto.randomUUID()}
							className={cn(highlightedRows.includes(index) ? "bg-accent" : "")}
						>
							<TableCell>{registerNames[index]}</TableCell>
							<TableCell>{formatValue(value)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};
