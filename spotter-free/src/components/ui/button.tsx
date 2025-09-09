import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 min-h-touch active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-medium hover:bg-primary/90 hover:shadow-hard",
        secondary: "bg-secondary text-secondary-foreground shadow-medium hover:bg-secondary/90 hover:shadow-hard",
        outline: "border border-border bg-background shadow-soft hover:bg-surface hover:text-text-primary",
        ghost: "hover:bg-surface hover:text-text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground shadow-medium hover:bg-destructive/90",
        success: "bg-success text-success-foreground shadow-medium hover:bg-success/90",
        rest: "bg-rest text-black shadow-medium hover:bg-rest/90 font-semibold",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-xl px-8 text-base",
        icon: "h-12 w-12",
        touch: "h-touch px-6 py-3",
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