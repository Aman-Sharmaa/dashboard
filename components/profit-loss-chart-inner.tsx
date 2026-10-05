"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatRupee = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

type ProfitLossChartProps = {
  monthlyRevenue: number[];
  monthlyPayroll: number;
  totalMonthlyExpense: number;
};

export default function ProfitLossChartInner({
  monthlyRevenue,
  monthlyPayroll,
  totalMonthlyExpense,
}: ProfitLossChartProps) {
  const monthlyOut = Math.round(monthlyPayroll + totalMonthlyExpense);
  const data = MONTH_NAMES.map((name, i) => {
    const revenue = monthlyRevenue[i] ?? 0;
    const net = revenue - monthlyOut;
    return {
      name,
      revenue,
      out: monthlyOut,
      net,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          dy={10}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => (Math.abs(value) >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : `₹${value}`)}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            borderRadius: "12px",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
          }}
          labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
          formatter={(value, name) => [
            formatRupee(Number(value ?? 0)),
            name === "revenue" ? "Revenue (in)" : name === "out" ? "Salary + Expense (out)" : "Net (profit / loss)",
          ]}
          labelFormatter={(label) => `${label}`}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px" }}
          formatter={(value) => (
            <span style={{ color: "hsl(var(--muted-foreground))" }}>
              {value === "revenue" && "Revenue (in)"}
              {value === "out" && "Salary + Expense (out)"}
              {value === "net" && "Net (profit / loss)"}
            </span>
          )}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
        <Bar
          dataKey="revenue"
          name="revenue"
          fill="hsl(142 76% 36%)"
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
        <Bar
          dataKey="out"
          name="out"
          fill="hsl(25 95% 53%)"
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="net"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ r: 4, fill: "hsl(var(--primary))" }}
          strokeDasharray={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
