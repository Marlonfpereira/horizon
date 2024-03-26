import type { Metadata } from "next";
import { cn } from "@/lib/utils";

import "../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { Providers } from "@/components/provider";

export const metadata: Metadata = {
	title: "Celestial Hub - Horizon",
	description: "Horizon compiler educational platform",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={cn(GeistSans.variable, GeistMono.variable)}>
			<body>
				<Providers>{children}</Providers>
			</body>
			<Toaster />
		</html>
	);
}
