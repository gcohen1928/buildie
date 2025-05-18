"use client";

import * as React from "react";

// Basic Checkbox component placeholder
// If you\'re using shadcn/ui, you should install the official one:
// npx shadcn-ui@latest add checkbox

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // You can add any specific props for your checkbox here
  // For shadcn/ui compatibility, onCheckedChange is often used instead of onChange
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<
  HTMLInputElement,
  CheckboxProps
>(({ className, onCheckedChange, onChange, checked, ...props }, ref) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(event.target.checked);
    }
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={handleChange}
      className={`h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ${className}`}
      {...props}
    />
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox }; 