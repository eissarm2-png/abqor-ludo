import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:brightness-110",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        royal: "border border-ludo-gold bg-ludo-purple text-ludo-gold shadow-[0_0_14px_var(--ludo-pink)] hover:brightness-125",
        neon: "border border-ludo-pink/70 bg-ludo-panel text-foreground shadow-[inset_0_0_10px_color-mix(in_oklab,var(--ludo-pink)_20%,transparent)] hover:border-ludo-gold",
        neonIcon: "rounded-xl border border-ludo-gold/70 bg-ludo-panel text-ludo-gold shadow-[0_0_12px_color-mix(in_oklab,var(--ludo-pink)_55%,transparent)] hover:brightness-125",
        ghostGold: "text-ludo-gold hover:bg-ludo-gold/10",
        play: "border border-ludo-gold bg-ludo-palm text-ludo-deep shadow-[inset_0_2px_3px_color-mix(in_oklab,var(--foreground)_30%,transparent),0_4px_0_color-mix(in_oklab,var(--ludo-palm)_55%,var(--ludo-deep)),0_0_14px_color-mix(in_oklab,var(--ludo-palm)_55%,transparent)] hover:brightness-110 active:translate-y-1 active:shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-8",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
