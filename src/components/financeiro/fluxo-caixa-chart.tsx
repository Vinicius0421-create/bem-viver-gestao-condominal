"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { formatCurrencyBRL } from "@/lib/utils";

export type PontoFluxoCaixa = {
  competencia: string;
  receitas: number;
  despesas: number;
  saldoMes: number;
  saldoAcumulado: number;
};

function TooltipCustomizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2" style={{ color: item.color }}>
          <span>{item.name}:</span>
          <span className="font-medium">{formatCurrencyBRL(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function FluxoCaixaChart({ dados }: { dados: PontoFluxoCaixa[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="competencia"
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(
              Number(v)
            )
          }
        />
        <Tooltip content={<TooltipCustomizado />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receitas" name="Receitas" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="saldoAcumulado"
          name="Saldo acumulado no período"
          stroke="var(--color-bv-gold-500)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
