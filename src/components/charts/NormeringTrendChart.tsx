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

const AGE_GROUP_LABELS: Record<string, string> = {
  dagpleje: "Dagpleje",
  "0-2": "Vuggestue (0-2 år)",
  "3-5": "Børnehave (3-5 år)",
};

const AGE_GROUP_COLORS: Record<string, string> = {
  dagpleje: "#F59E0B",
  "0-2": "#10B981",
  "3-5": "#3B82F6",
};

interface Props {
  chartData: Record<string, number | string | null>[];
  activeAgeGroups: string[];
  kommuneName?: string;
  title?: string;
}

export default function NormeringTrendChart({ chartData, activeAgeGroups, kommuneName, title }: Props) {
  if (chartData.length <= 1) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        {title ?? `Udvikling i normering i ${kommuneName}`}
      </h2>
      <div className="card p-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
            <XAxis dataKey="year" className="text-muted" tick={{ fontSize: 12 }} />
            <YAxis
              label={{
                value: "børn/voksen",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
              className="text-muted"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
                color: "var(--color-foreground)",
                borderRadius: "0.5rem",
                fontSize: 13,
              }}
              formatter={(value, name) => [
                Number(value).toFixed(1).replace(".", ","),
                AGE_GROUP_LABELS[name as string] ?? name,
              ]}
            />
            <Legend formatter={(value) => AGE_GROUP_LABELS[value as string] ?? value} />
            {activeAgeGroups.map((ag) => (
              <Line
                key={ag}
                type="monotone"
                dataKey={ag}
                stroke={AGE_GROUP_COLORS[ag]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
