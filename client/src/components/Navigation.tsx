import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, TrendingDown, Home, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const navigationItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Pipeline", href: "/pipeline", icon: BarChart3 },
  { label: "Collapse Auditor", href: "/auditor", icon: TrendingDown },
  { label: "Daily Ritual", href: "/daily-ritual", icon: Calendar },
];

function NavLink({ href, label, icon: Icon, isActive, onClick }: any) {
  return (
    <Link href={href}>
      <a
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </a>
    </Link>
  );
}

export function TopNavigation() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50">
        <div className="flex items-center justify-between w-full px-6 max-w-7xl mx-auto">
          {/* Logo and Brand */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              <TrendingDown className="w-6 h-6" />
              <span>RAG Swing Trading</span>
            </a>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="flex items-center gap-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={location === item.href}
              />
            ))}
            
            {/* Theme Toggle */}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>


        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50 flex items-center justify-between px-4">
        {/* Mobile Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm">RAG Trading</span>
          </a>
        </Link>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {/* Mobile Menu Button */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 mt-8">
                {/* Mobile Nav Links */}
                <div className="flex flex-col gap-2">
                  {navigationItems.map((item) => (
                    <NavLink
                      key={item.href}
                      {...item}
                      isActive={location === item.href}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-800" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
