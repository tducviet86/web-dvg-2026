import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Card. Its colours come from the shadcn tokens of the page using
 * it (see `.dash` in admin.css). CardTitle is a heading (h2 by default), so
 * screen readers and tests find panels by their titles.
 */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border shadow-[0_1px_2px_rgb(16_24_40/0.04),0_1px_3px_rgb(16_24_40/0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-3 gap-y-1",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  as: Tag = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return (
    <Tag
      data-slot="card-title"
      className={cn(
        "text-foreground flex items-center gap-2 text-[15px] leading-none font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-[13px]", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={className} {...props} />;
}
