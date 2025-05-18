"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, UserCircle, SettingsIcon } from "lucide-react"; // Added LogOut, UserCircle, SettingsIcon
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown components

const navItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Projects", href: "/projects" },
  { name: "Analytics", href: "/analytics" },
  { name: "Settings", href: "/settings" },
];

// Placeholder user data - replace with actual data fetching logic
const user = {
  name: "Gabe Cohen",
  profilePicUrl: "https://github.com/shadcn.png", // Replace with actual user image
  initials: "GC",
  isLoggedIn: true, // Added placeholder for auth status
};

export function Navbar() {
  const pathname = usePathname();
  const { user: authUser, logout, isLoading } = useAuth(); // Added logout from useAuth

  console.log("[Navbar] Rendering with state:", { authUser, isLoading });

  // Display a loading state or a minimal navbar if auth state is still loading
  // This prevents a flash of incorrect UI
  // if (isLoading) {
  //   return (
  //     <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-full shadow-xl w-auto max-w-3xl">
  //       {/* Optionally, show a simplified loading state or nothing */}
  //     </nav>
  //   );
  // }

  // Determine initials for AvatarFallback
  const getInitials = (name: string | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };

  return (
    <motion.nav 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-full shadow-xl w-auto max-w-3xl"
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Left: Logo */}
      <Link href="/" className="text-xl font-bold text-white mr-4 whitespace-nowrap">
        Buildie ✨
      </Link>

      {/* Center: Navigation Links */}
      <div className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="relative px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200 rounded-md"
          >
            {item.name}
            {pathname === item.href && (
              <motion.div
                className="absolute inset-0 bg-slate-700/50 rounded-md z-[-1]"
                layoutId="active-pill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
             {/* Subtle hover background for non-active items */}
            {pathname !== item.href && (
               <motion.div
                className="absolute inset-0 bg-slate-800/0 group-hover:bg-slate-800/50 rounded-md z-[-1] transition-colors duration-200"
                layoutId={`hover-pill-${item.name}`}
              />
            )}
          </Link>
        ))}
      </div>

      {/* Right: User Profile & CTA */}
      <div className="flex items-center space-x-3 ml-4">
        <Link href="/projects/new" passHref legacyBehavior>
          <Button asChild variant="default" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white whitespace-nowrap">
            <div>
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
            </div>
          </Button>
        </Link>
        {isLoading ? (
          <div className="h-8 w-8 bg-slate-700 rounded-full animate-pulse" /> // Simple skeleton loader for avatar area
        ) : authUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={undefined /* authUser.profilePicUrl */} alt={authUser.email} />
                <AvatarFallback>{getInitials(authUser.email)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">My Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {authUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
                {/* <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut> */}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
                {/* <DropdownMenuShortcut>⌘S</DropdownMenuShortcut> */}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => await logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
                {/* <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut> */}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600">
                Login
              </Button>
            </Link>
            <Link href="/signup" passHref legacyBehavior>
              <Button variant="default" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white">
                Sign Up
              </Button>
            </Link>
          </>
        )}
        {/* Add DropdownMenu here if needed */}
      </div>

      {/* Mobile Menu Button (placeholder) */}
      <div className="md:hidden ml-2">
        {/* Implement hamburger menu icon and functionality here */}
        <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700/50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-3.75 5.25h16.5" />
          </svg>
        </Button>
      </div>
    </motion.nav>
  );
}

// Consider creating a separate component for mobile navigation
// and conditionally rendering it. 