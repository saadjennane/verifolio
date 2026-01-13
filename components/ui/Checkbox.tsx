"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "./label"

export interface CheckboxProps extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'onChange'> {
  label?: string;
  description?: string;
  // Support pour l'ancienne API avec onChange
  onChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  label,
  description,
  id,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  // Combiner onChange et onCheckedChange
  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    if (onChange) {
      onChange(isChecked);
    }
    if (onCheckedChange) {
      onCheckedChange(checked);
    }
  };

  const checkboxElement = (
    <CheckboxPrimitive.Root
      id={checkboxId}
      data-slot="checkbox"
      onCheckedChange={handleCheckedChange}
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label && !description) {
    return checkboxElement;
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{checkboxElement}</div>
      <div className="flex flex-col gap-0.5">
        {label && (
          <Label htmlFor={checkboxId} className="text-sm font-normal cursor-pointer">
            {label}
          </Label>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

export { Checkbox }
