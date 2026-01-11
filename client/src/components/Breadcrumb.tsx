import { ChevronRight, Home } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  theme?: "dark" | "light";
}

export default function Breadcrumb({ items, theme = "light" }: BreadcrumbProps) {
  const [, navigate] = useLocation();

  const handleNavigate = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <nav
      className={`flex items-center gap-2 text-sm ${
        theme === "dark"
          ? "text-slate-400"
          : "text-slate-600"
      }`}
      aria-label="Breadcrumb"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className={`h-auto p-1 ${
          theme === "dark"
            ? "hover:text-slate-300 text-slate-400"
            : "hover:text-slate-900 text-slate-600"
        }`}
        title="Go to home"
      >
        <Home className="w-4 h-4" />
      </Button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className={`w-4 h-4 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`} />
          {item.href && !item.current ? (
            <button
              onClick={() => handleNavigate(item.href)}
              className={`hover:underline transition-colors ${
                theme === "dark"
                  ? "hover:text-slate-200 text-slate-400"
                  : "hover:text-slate-900 text-slate-600"
              }`}
              title={`Go to ${item.label}`}
            >
              {item.label}
            </button>
          ) : (
            <span
              className={
                item.current
                  ? theme === "dark"
                    ? "font-medium text-slate-200"
                    : "font-medium text-slate-900"
                  : ""
              }
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
