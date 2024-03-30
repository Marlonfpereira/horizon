import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";

import "@/styles/globals.css";

import { Providers } from "@/components/provider";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ux/theme-toggle";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { CelestialHubLogo } from "@/components/ux/logo";

import { Binary, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
	title: "Celestial Hub - Horizon",
	description: "Horizon compiler educational platform",
};

const pageName = {
	"/": "Transpiler",
	"/vm": "Virtual Machine",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const pathname = "TODO";
	const currentPage =
		pageName[pathname as keyof typeof pageName] || "Celestial Hub";

	return (
		<html lang="en" className={cn(GeistSans.variable, GeistMono.variable)}>
			<body>
				<Providers>
					<div className="grid h-screen w-full pl-[53px]">
						<aside className="inset-y fixed  left-0 z-20 flex h-full flex-col border-r">
							<div className="border-b p-2">
								<Button variant="outline" size="icon" aria-label="Home">
									<CelestialHubLogo width={24} height={24} />
								</Button>
							</div>
							<nav className="grid gap-1 p-2">
								<Tooltip>
									<TooltipTrigger asChild>
										<Link href="/">
											<Button
												variant="ghost"
												size="icon"
												className={cn(
													"rounded-lg hover:bg-[#07C882]",
													currentPage === "Transpiler" && "bg-[#07C882]",
												)}
												aria-label="Playground"
											>
												<SquareTerminal className="size-5" />
											</Button>
										</Link>
									</TooltipTrigger>
									<TooltipContent side="right" sideOffset={5}>
										Transpiler
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Link href="/vm">
											<Button
												variant="ghost"
												size="icon"
												className={cn(
													"rounded-lg hover:bg-[#07C882]",
													currentPage === "VM" && "bg-[#07C882]",
												)}
												aria-label="Virtual Machine"
											>
												<Binary className="size-5" />
											</Button>
										</Link>
									</TooltipTrigger>
									<TooltipContent side="right" sideOffset={5}>
										Virtual Machine
									</TooltipContent>
								</Tooltip>
							</nav>
							<nav className="mt-auto grid gap-1 p-2">
								{/* under area. TODO: add Github Icon, Sponsors link perhaps */}
							</nav>
						</aside>
						<div className="flex flex-col">
							<header className="sticky top-0 z-10 flex h-[53px] items-center gap-1 border-b bg-background px-4">
								<h1 className="text-xl font-semibold">{currentPage}</h1>
								<section className="ml-auto">
									<ThemeToggle />
								</section>
							</header>

							{children}
						</div>
					</div>
				</Providers>
				<Analytics />
			</body>
			<Toaster />
		</html>
	);
}
