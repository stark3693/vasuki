import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md active:scale-[0.98] border border-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm hover:shadow-md active:scale-[0.98] border border-destructive/20",
        outline:
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-border-strong active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm hover:shadow-md active:scale-[0.98] border border-secondary/20",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border border-primary/30",
        glass: "glass hover:bg-background/30 active:scale-[0.98] border border-border/50",
        success: "bg-success text-success-foreground hover:opacity-90 shadow-sm hover:shadow-success active:scale-[0.98] border border-success/20",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-lg",
        default: "h-10 px-4 text-base rounded-lg",
        md: "h-11 px-5 text-base rounded-lg",
        lg: "h-12 px-6 text-lg rounded-xl",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
