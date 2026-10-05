"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  isLoading?: boolean;
  variant?: "destructive" | "default" | "warning";
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  isLoading = false,
  variant = "destructive",
  promptPlaceholder,
  promptDefaultValue = "",
  children,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState(promptDefaultValue);

  useEffect(() => {
    if (open) {
      setInputValue(promptDefaultValue);
    }
  }, [open, promptDefaultValue]);

  const isPrompt = typeof promptPlaceholder === "string";

  const getIcon = () => {
    if (variant === "destructive") {
      return (
        <div className="h-10 w-10 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    }
    if (variant === "warning") {
      return (
        <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div className="h-10 w-10 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
        <HelpCircle className="h-5 w-5" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md rounded-2xl p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl", children && "max-w-lg max-h-[90vh] overflow-y-auto")}>
        <DialogHeader className="flex flex-row items-start gap-3.5 space-y-0 text-left">
          {getIcon()}
          <div className="space-y-1 flex-1">
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {isPrompt && (
          <div className="mt-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={promptPlaceholder}
              className="rounded-xl text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onConfirm(inputValue);
                }
              }}
            />
          </div>
        )}

        {children ? <div className="mt-4 space-y-3">{children}</div> : null}

        <DialogFooter className="flex flex-row gap-2 justify-end sm:justify-end mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl text-xs h-9 px-4 font-semibold"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "warning" ? "default" : variant}
            onClick={() => onConfirm(isPrompt ? inputValue : undefined)}
            disabled={isLoading}
            className={cn(
              "rounded-xl text-xs h-9 px-4 font-semibold shadow-xs",
              variant === "warning" && "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
