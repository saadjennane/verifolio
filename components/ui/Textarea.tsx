"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    const textareaElement = (
      <textarea
        id={textareaId}
        ref={ref}
        data-slot="textarea"
        aria-invalid={!!error}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive",
          className
        )}
        {...props}
      />
    );

    if (!label && !error) {
      return textareaElement;
    }

    return (
      <div className="space-y-1.5">
        {label && (
          <Label htmlFor={textareaId} className="text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        {textareaElement}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea }
