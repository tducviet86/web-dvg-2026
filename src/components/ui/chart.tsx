"use client";
import * as React from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Chart, trimmed to what the admin uses: a container that sizes a
 * Recharts chart and names each series' colour (`--color-<key>`), and the
 * tooltip that goes with it.
 */
export type ChartConfig = Record<string, { label: string; color: string }>;

const ChartContext = React.createContext<ChartConfig | null>(null);

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof Recharts.ResponsiveContainer
  >["children"];
}) {
  const colours = Object.fromEntries(
    Object.entries(config).map(([key, c]) => [`--color-${key}`, c.color]),
  ) as React.CSSProperties;
  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-surface]:outline-hidden [&_.recharts-sector]:outline-hidden",
          className,
        )}
        style={colours}
        {...props}
      >
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Recharts.Tooltip;

type Item = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

/** The tooltip box: a title and one row per series, with its colour. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => Number(v).toLocaleString("vi-VN"),
}: {
  active?: boolean;
  payload?: Item[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number | string) => string;
}) {
  const config = React.useContext(ChartContext) ?? {};
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-background grid min-w-36 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
      {label !== undefined && (
        <div className="text-foreground font-medium">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </div>
      )}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const entry = config[key] ?? config[String(item.name)];
        return (
          <div key={key} className="flex items-center gap-2">
            <i
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{
                background:
                  (item.payload?.fill as string | undefined) ??
                  entry?.color ??
                  item.color,
              }}
            />
            <span className="text-muted-foreground">
              {entry?.label ?? item.name}
            </span>
            <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
              {valueFormatter(item.value ?? 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
