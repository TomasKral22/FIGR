import { useId, type ReactNode } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Input } from '@/components/ui/input';
import { compact, money, number, parseNumber } from './calculatorFormatting';

export interface FieldSpec { key: string; label: string; unit?: string; min: number; max: number; step?: number; sliderMax?: number }
export function NumberField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const id = useId();
  const parsed = parseNumber(value);
  const invalid = !Number.isFinite(parsed) || parsed < field.min || parsed > field.max || (field.key === 'years' || field.key === 'coastYears') && !Number.isInteger(parsed);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm font-medium">{field.label}</label>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="decimal" value={value} onChange={event => onChange(event.target.value)}
          aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
          className="h-9 w-32 rounded-full bg-background/50 text-right tabular-nums" />
        <span className="w-6 text-xs text-muted-foreground">{field.unit}</span>
      </div>
    </div>
    <input type="range" aria-label={`${field.label} – posuvník`} min={field.min} max={field.sliderMax ?? field.max}
      step={field.step ?? 1} value={Number.isFinite(parsed) ? Math.min(field.sliderMax ?? field.max, Math.max(field.min, parsed)) : field.min}
      onChange={event => onChange(event.target.value)} className="h-2 w-full cursor-pointer accent-[hsl(var(--primary))]" />
    {invalid && <p id={`${id}-error`} className="text-xs text-destructive">Zadej {field.key === 'years' || field.key === 'coastYears' ? 'celé ' : ''}číslo od {number(field.min, 2)} do {number(field.max, 2)}.</p>}
  </div>;
}

export function MetricGrid({ items }: { items: { label: string; value: string; detail?: string; positive?: boolean; primary?: boolean }[] }) {
  return <div className={`grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 ${items.length === 3 ? '2xl:grid-cols-3' : '2xl:grid-cols-4'}`}>
    {items.map((item, index) => <div key={item.label} className={`min-w-0 bg-card p-4 md:p-5 ${items.length === 3 && index === 2 ? 'sm:col-span-2 2xl:col-span-1' : ''}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
      <p data-testid={`metric-${item.label}`} className={`mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums ${item.primary ? 'text-primary' : item.positive === true ? 'text-success' : item.positive === false ? 'text-destructive' : ''}`}>{item.value}</p>
      {item.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>}
    </div>)}
  </div>;
}

export function Explanation({ title = 'Jak výpočet funguje', children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card/60 p-5">
    <h3 className="mb-2 text-sm font-semibold">{title}</h3>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>;
}

type ChartPoint = { year: number; value?: number; contributed?: number; range?: [number, number]; cashFlow?: number; presentValue?: number };
export function ProjectionChart({ points, target, title, currency = 'CZK', cashFlow = false }: {
  points: ChartPoint[]; target?: number; title: string; currency?: string; cashFlow?: boolean;
}) {
  const gradient = useId().replace(/:/g, '');
  return <section className="min-w-0 rounded-2xl border border-border bg-card p-4 md:p-6" aria-label={title}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span><span className="mr-1 text-primary">━</span>{cashFlow ? 'Cash flow' : 'Hodnota'}</span>
        <span>{cashFlow ? 'Diskontovaná hodnota' : '┄ Vloženo'}</span>
        {points[0]?.range && <span>▰ Rozpětí scénářů</span>}
        {target !== undefined && <span className="text-success">┄ Cíl</span>}
      </div>
    </div>
    <div className="h-[280px] w-full min-w-0 md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 15, right: 12, left: 0, bottom: 5 }} accessibilityLayer>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tickFormatter={value => value === 0 ? 'dnes' : `${value} r.`} minTickGap={35} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tickFormatter={compact} width={62} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
          <Tooltip labelFormatter={label => `Rok ${label}`} formatter={(value: number | [number, number]) => Array.isArray(value) ? value.map(v => money(v, currency)).join(' až ') : money(Number(value), currency)}
            contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} />
          {cashFlow ? <><Bar dataKey="cashFlow" name="Cash flow" fill="hsl(var(--primary) / 0.25)" radius={[4, 4, 0, 0]} isAnimationActive={false} /><Bar dataKey="presentValue" name="Současná hodnota" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} /></> : <>
            {points[0]?.range && <Area type="monotone" dataKey="range" name="Rozpětí scénářů" stroke="none" fill="hsl(var(--primary) / 0.12)" isAnimationActive={false} />}
            <Area type="monotone" dataKey="value" name="Hodnota" stroke="hsl(var(--primary))" strokeWidth={2.5} fill={`url(#${gradient})`} isAnimationActive={false} />
            <Line type="monotone" dataKey="contributed" name="Vloženo" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          </>}
          {target !== undefined && <ReferenceLine y={target} stroke="hsl(var(--success))" strokeDasharray="5 5" ifOverflow="extendDomain" label={{ value: `Cíl ${compact(target)}`, position: 'insideTopRight', fill: 'hsl(var(--success))', fontSize: 11 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
