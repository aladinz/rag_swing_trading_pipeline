import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export interface HelpContent {
  title: string;
  description: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
  shortcuts?: Array<{
    key: string;
    description: string;
  }>;
}

interface HelpDialogProps {
  content: HelpContent;
  theme?: "dark" | "light";
  triggerLabel?: string;
}

export default function HelpDialog({ content, theme = "light", triggerLabel = "Help" }: HelpDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={theme === "dark" ? "border-slate-600 text-slate-400 hover:text-slate-200" : ""}
        title={`${triggerLabel} - Press ? for keyboard shortcut`}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline ml-2">{triggerLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={theme === "dark" ? "bg-slate-800 border-slate-700 text-slate-100" : ""}
        >
          <DialogHeader>
            <DialogTitle className={theme === "dark" ? "text-slate-100" : ""}>
              {content.title}
            </DialogTitle>
            <DialogDescription className={theme === "dark" ? "text-slate-400" : ""}>
              {content.description}
            </DialogDescription>
          </DialogHeader>

          <div className={`space-y-4 max-h-96 overflow-y-auto ${theme === "dark" ? "text-slate-300" : ""}`}>
            {/* Main content sections */}
            {content.sections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className={`font-semibold text-sm ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                  {section.heading}
                </h3>
                <p className={`text-xs leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  {section.content}
                </p>
              </div>
            ))}

            {/* Keyboard shortcuts */}
            {content.shortcuts && content.shortcuts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <h3 className={`font-semibold text-sm ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-1">
                  {content.shortcuts.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <kbd
                        className={`px-2 py-1 rounded font-mono text-xs ${
                          theme === "dark"
                            ? "bg-slate-700 text-slate-200"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {shortcut.key}
                      </kbd>
                      <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => setOpen(false)}
            variant="outline"
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
