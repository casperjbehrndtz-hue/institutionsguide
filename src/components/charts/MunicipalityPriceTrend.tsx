import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMunicipalityPriceTrend } from "../../hooks/useMunicipalityPriceTrend";

interface MunicipalityPriceTrendProps {
  municipality: string;
  category?: string;
}

export default function MunicipalityPriceTrend({
  municipality,
  category,
}: MunicipalityPriceTrendProps) {
  const { data, loading, error } = useMunicipalityPriceTrend(
    municipality,
    category
  );

  if (loading) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-48 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || data.length === 0) return null;

  const formatDate = (d: string) => {
    const [y, m] = d.split("-");
    const months = [
      "jan", "feb", "mar", "apr", "maj", "jun",
      "jul", "aug", "sep", "okt", "nov", "dec",
    ];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  };

  const hasRange = data.some((d) => d.min !== d.max);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Prisudvikling i {municipality}
        {category ? ` (${category})` : ""}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B8642E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#B8642E" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B8642E" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#B8642E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted-foreground/20"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={["dataMin - 200", "dataMax + 200"]}
            tickFormatter={(v: number) => `${v.toLocaleString("da-DK")} kr`}
            className="text-muted-foreground"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--popover-foreground))",
              borderRadius: "0.5rem",
              fontSize: 13,
            }}
            formatter={(value: any, name: any) => {
              const labels: Record<string, string> = {
                avg: "Gennemsnit",
                min: "Minimum",
                max: "Maksimum",
              };
              return [`${Number(value).toLocaleString("da-DK")} kr/md`, labels[name as string] ?? name];
            }}
            labelFormatter={(label: any) => formatDate(String(label))}
          />
          <Legend
            formatter={(value: any) => {
              const labels: Record<string, string> = {
                avg: "Gennemsnit",
                min: "Minimum",
                max: "Maksimum",
              };
              return labels[value as string] ?? value;
            }}
          />
          {hasRange && (
            <>
              <Area
                type="monotone"
                dataKey="max"
                stroke="#D4944A"
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="url(#rangeGradient)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="min"
                stroke="#D4944A"
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="transparent"
                dot={false}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="avg"
            stroke="#B8642E"
            strokeWidth={2}
            fill="url(#avgGradient)"
            dot={{ r: 3, fill: "#B8642E" }}
            activeDot={{ r: 5, fill: "#D4944A" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
