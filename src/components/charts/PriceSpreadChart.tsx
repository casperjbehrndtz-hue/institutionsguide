import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface BarEntry {
  name: string;
  value: number;
}

interface Props {
  data: BarEntry[];
  rateLabel: string;
  avgValue: number | null;
}

export default function PriceSpreadChart({ data, rateLabel, avgValue }: Props) {
  return (
    <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="font-display text-xl font-bold text-foreground mb-2">
        Prisspredning — {rateLabel}
      </h2>
      <p className="text-xs text-muted mb-4">
        10 billigste og 10 dyreste kommuner. Stiplet linje viser landsgennemsnittet.
      </p>
      <div className="card p-4">
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toLocaleString("da-DK")} kr`}
              fontSize={11}
              tick={{ fill: "#4F5F6F" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              fontSize={11}
              tick={{ fill: "#4F5F6F" }}
            />
            <Tooltip
              formatter={(value) => [
                `${typeof value === 'number' ? value.toLocaleString("da-DK") : value} kr/md`,
                rateLabel,
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            {avgValue !== null && (
              <ReferenceLine
                x={avgValue}
                stroke="#4F5F6F"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Gns: ${avgValue.toLocaleString("da-DK")} kr`,
                  position: "top",
                  fontSize: 11,
                  fill: "#4F5F6F",
                }}
              />
            )}
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={index < 10 ? "#1B3A5C" : "#B8642E"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#1B3A5C" }} />
            10 billigste
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#B8642E" }} />
            10 dyreste
          </span>
        </div>
      </div>
    </section></ScrollReveal>
  );
}
