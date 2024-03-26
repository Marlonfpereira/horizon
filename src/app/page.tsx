import { Binary, LifeBuoy, SquareTerminal, SquareUser } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ux/theme-toggle";
import { IDE } from "@/components/ux/ide";
import { CelestialHubLogo } from "@/components/ux/logo";

export default function Dashboard() {
	return (
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
							<Button
								variant="ghost"
								size="icon"
								className="rounded-lg hover:bg-[#07C882]"
								aria-label="Playground"
							>
								<SquareTerminal className="size-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={5}>
							Transpiler
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="rounded-lg hover:bg-[#07C882]"
								aria-label="Virtual Machine"
							>
								<Binary className="size-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={5}>
							Virtual Machine
						</TooltipContent>
					</Tooltip>
				</nav>
				<nav className="mt-auto grid gap-1 p-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="mt-auto rounded-lg"
								aria-label="Help"
							>
								<LifeBuoy className="size-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={5}>
							Help
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="mt-auto rounded-lg"
								aria-label="Account"
							>
								<SquareUser className="size-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={5}>
							Account
						</TooltipContent>
					</Tooltip>
				</nav>
			</aside>
			<div className="flex flex-col">
				<header className="sticky top-0 z-10 flex h-[53px] items-center gap-1 border-b bg-background px-4">
					<h1 className="text-xl font-semibold">Transpiler</h1>
					<section className="ml-auto">
						<ThemeToggle />
					</section>
				</header>
				<main className="flex-1 gap-4 overflow-auto p-4">
					<IDE />
				</main>
			</div>
		</div>
	);
}
