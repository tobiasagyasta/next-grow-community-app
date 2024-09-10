"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { House, Users, Church, Settings } from "lucide-react";

const MobileBottomNav = () => {
	const router = useRouter();
	const pathname = usePathname();
	const excludedRoutes = ["/", "/login", "/register", "/events"];
	const shouldShowNav = !excludedRoutes.includes(pathname);

	if (!shouldShowNav) {
		return null; // Do not render the component if the route is excluded
	}
	// Navigation handler
	const handleNavigation = (path: string) => {
		router.push(path);
	};

	// Determine active state
	const isActive = (path: string) =>
		pathname === path ? "text-primary-light font-bold" : "text-gray-500";

	return (
		<nav className="text-sm fixed bottom-0 w-full bg-white shadow-lg md:hidden border border-t-black/40">
			<ul className="flex justify-around p-1">
				<li
					onClick={() => {
						handleNavigation("/home");
					}}
					className={`text-center cursor-pointer ${isActive("/home")}`}
				>
					<House className="mx-auto" />
					Home
				</li>
				<li
					onClick={() => {
						handleNavigation("/community");
					}}
					className={`text-center cursor-pointer ${isActive("/community")}`}
				>
					<Users className="mx-auto" />
					Community
				</li>
				<li
					onClick={() => {
						handleNavigation("/ministry");
					}}
					className={`text-center cursor-pointer ${isActive("/ministry")}`}
				>
					<Church className="mx-auto" />
					Ministry
				</li>
				<li
					onClick={() => {
						handleNavigation("/settings");
					}}
					className={`text-center cursor-pointer ${isActive("/settings")}`}
				>
					<Settings className="mx-auto" />
					Settings
				</li>
			</ul>
		</nav>
	);
};

export default MobileBottomNav;
