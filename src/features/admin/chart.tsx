"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Lead } from "@/types";
export default function LeadChart({ leads }: { leads: Lead[] }) {
  const data = Array.from({ length: 6 }, (_, i) => ({
    month: `T${i + 5}`,
    count: leads.filter((l) => Number(l.createdAt.slice(5, 7)) === i + 5)
      .length,
  }));
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Yêu cầu theo tháng: ${data.map((d) => `${d.month}: ${d.count}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#123c32" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#123c32" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e9eeeb" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip formatter={(value) => [value, "Yêu cầu"]} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#123c32"
            fill="url(#leadGradient)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
