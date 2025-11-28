import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
        secondary:
          "border-secondary/30 bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-sm",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm",
        success:
          "border-success/30 bg-success text-success-foreground hover:opacity-90 shadow-sm",
        warning:
          "border-warning/30 bg-warning text-warning-foreground hover:opacity-90 shadow-sm",
        info:
          "border-info/30 bg-info text-info-foreground hover:opacity-90 shadow-sm",
        outline: "text-foreground border-2 border-border hover:bg-accent hover:border-border-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
