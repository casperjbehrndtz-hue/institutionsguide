import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePriceHistory } from "../../hooks/usePriceHistory";

interface PriceHistoryChartProps {
  institutionId: string;
  institutionName?: string;
}

export default function PriceHistoryChart({
  institutionId,
  institutionName,
}: PriceHistoryChartProps) {
  const { data, loading, error } = usePriceHistory(institutionId);

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

  if (error) return null;

  if (data.length === 0) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Prishistorik kommer snart
        </p>
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Prishistorik begynder her — vi tracker prisudviklingen
        </p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {data[0].monthlyRate.toLocaleString("da-DK")} kr/md
        </p>
        <p className="text-xs text-muted-foreground">{data[0].date}</p>
      </div>
    );
  }

  const formatDate = (d: string) => {
    const [y, m] = d.split("-");
    const months = [
      "jan", "feb", "mar", "apr", "maj", "jun",
      "jul", "aug", "sep", "okt", "nov", "dec",
    ];
    return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Prisudvikling{institutionName ? ` — ${institutionName}` : ""}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B8642E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#B8642E" stopOpacity={0.05} />
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
            domain={["dataMin - 100", "dataMax + 100"]}
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
            formatter={(value: any) => [
              `${Number(value).toLocaleString("da-DK")} kr/md`,
              "Pris",
            ]}
            labelFormatter={(label: any) => formatDate(String(label))}
          />
          <Area
            type="monotone"
            dataKey="monthlyRate"
            stroke="#D4944A"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={{ r: 3, fill: "#B8642E" }}
            activeDot={{ r: 5, fill: "#D4944A" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
