import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ZAxis,
} from "recharts";
import { formatDecimal } from "@/lib/format";

export interface ScatterPoint {
  name: string;
  price: number;
  quality: number;
  isTop5: boolean;
}

interface Props {
  data: ScatterPoint[];
  avgPrice: number;
  avgQuality: number;
}

export default function ValueScatterChart({ data, avgPrice, avgQuality }: Props) {
  return (
    <section className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="font-display text-xl font-bold text-foreground mb-2">
        Pris vs. kvalitet
      </h2>
      <p className="text-xs text-muted mb-4">
        Hver prik er en skole. Skoler i top 5 er fremhævet. Stiplede linjer viser gennemsnittet.
      </p>
      <div className="card p-4">
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              dataKey="price"
              name="SFO-pris"
              tickFormatter={(v: number) => `${v.toLocaleString("da-DK")} kr`}
              fontSize={11}
              tick={{ fill: "#4F5F6F" }}
              label={{
                value: "Mdl. SFO-pris (kr)",
                position: "insideBottom",
                offset: -10,
                fontSize: 12,
                fill: "#4F5F6F",
              }}
            />
            <YAxis
              type="number"
              dataKey="quality"
              name="Kvalitet"
              domain={[0, 5]}
              tickCount={6}
              fontSize={11}
              tick={{ fill: "#4F5F6F" }}
              label={{
                value: "Kvalitetsscore",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fontSize: 12,
                fill: "#4F5F6F",
              }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ScatterPoint;
                return (
                  <div className="rounded-lg border border-border bg-[var(--color-bg-card)] p-2 shadow-sm text-xs">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-muted">
                      SFO: {d.price.toLocaleString("da-DK")} kr/md
                    </p>
                    <p className="text-muted">
                      Kvalitet: {formatDecimal(d.quality)}/5
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              x={avgPrice}
              stroke="#4F5F6F"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={avgQuality}
              stroke="#4F5F6F"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Scatter data={data}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.isTop5 ? "#B8642E" : "#1B3A5C"}
                  opacity={entry.isTop5 ? 1 : 0.6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#B8642E" }} />
            Top 5 bedste værdi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#1B3A5C", opacity: 0.6 }} />
            Øvrige top 25
          </span>
        </div>
      </div>
    </section>
  );
}
