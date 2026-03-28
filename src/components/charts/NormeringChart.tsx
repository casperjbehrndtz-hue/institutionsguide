import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";

interface NormeringDataPoint {
  ageGroup: string;
  year: number;
  ratio: number;
}

interface NormeringChartProps {
  municipality: string;
  data: NormeringDataPoint[];
  title?: string;
}

const AGE_GROUP_CONFIG: Record<string, { color: string; label: string }> = {
  dagpleje: { color: "#f59e0b", label: "Dagpleje" },
  "0-2": { color: "#22c55e", label: "0-2 år" },
  "3-5": { color: "#3b82f6", label: "3-5 år" },
};

export default function NormeringChart({
  municipality,
  data,
  title,
}: NormeringChartProps) {
  const chartData = useMemo(() => {
    const byYear: Record<number, Record<string, number>> = {};

    for (const d of data) {
      if (!byYear[d.year]) byYear[d.year] = {};
      byYear[d.year][d.ageGroup] = d.ratio;
    }

    return Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => ({ year, ...byYear[year] }));
  }, [data]);

  const activeAgeGroups = useMemo(() => {
    const groups = new Set(data.map((d) => d.ageGroup));
    return Object.keys(AGE_GROUP_CONFIG).filter((ag) => groups.has(ag));
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted-foreground/20"
          />
          <XAxis
            dataKey="year"
            className="text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{
              value: "børn/voksen",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
            className="text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--popover-foreground))",
              borderRadius: "0.5rem",
              fontSize: 13,
            }}
            formatter={(value: any, name: any) => [
              Number(value).toFixed(1).replace(".", ","),
              AGE_GROUP_CONFIG[name as string]?.label ?? name,
            ]}
          />
          <Legend
            formatter={(value: any) =>
              AGE_GROUP_CONFIG[value as string]?.label ?? value
            }
          />
          {activeAgeGroups.map((ag) => (
            <Line
              key={ag}
              type="monotone"
              dataKey={ag}
              stroke={AGE_GROUP_CONFIG[ag].color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
