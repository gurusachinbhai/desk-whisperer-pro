import * as React from "react";
import { Moon, Sun, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeName } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme();

  const options: { value: ThemeName; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: "sky",
      label: "Sky Blue",
      description: "Bright, light theme",
      icon: <Sun className="h-4 w-4" />,
    },
    {
      value: "dark",
      label: "Dark",
      description: "Previous dark theme",
      icon: <Moon className="h-4 w-4" />,
    },
  ];

  const current = options.find((o) => o.value === theme) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          aria-label="Select theme"
        >
          {current.icon}
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className="flex items-start gap-2"
          >
            <span className="mt-0.5">{opt.icon}</span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className="block text-xs text-muted-foreground">{opt.description}</span>
            </span>
            {theme === opt.value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
