import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, ChartNoAxesCombined, Flame, Info, Landmark, Lightbulb, Percent, RotateCcw, Search, SlidersHorizontal, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateDcf, calculateFire, calculatePe, projectGrowth, savingsGoal, type DcfInput, type GrowthInput } from '@/utils/financialCalculators';
import { Explanation, MetricGrid, NumberField, ProjectionChart, type FieldSpec } from './CalculatorParts';
import { compact, money, number, parseNumber } from './calculatorFormatting';

type CalculatorId = 'planner' | 'fire' | 'dcf' | 'compound' | 'goal' | 'pe';
type Draft = Record<string, string>;
const catalog = [
  { id: 'planner', title: 'Investiční plánovač', description: 'Tři scénáře, inflace a poplatky. Podívej se, kam může vést tvůj plán.', group: 'Plánování', icon: TrendingUp, tag: 'Vývoj majetku' },
  { id: 'fire', title: 'FIRE kalkulačka', description: 'Cíl finanční nezávislosti, čas do jeho dosažení a Coast FIRE.', group: 'Plánování', icon: Flame, tag: 'Finanční nezávislost' },
  { id: 'dcf', title: 'DCF kalkulačka', description: 'Modelová hodnota akcie podle budoucího cash flow a citlivosti vstupů.', group: 'Ocenění', icon: Calculator, tag: 'Férová hodnota' },
  { id: 'compound', title: 'Složené úročení', description: 'Co udělá čas, pravidelnost a připisování úroků s tvými vklady.', group: 'Plánování', icon: Percent, tag: 'Síla času' },
  { id: 'goal', title: 'Spoření na cíl', description: 'Kolik měsíčně odkládat, aby ses dostal na zvolenou částku.', group: 'Plánování', icon: Target, tag: 'Potřebný vklad' },
  { id: 'pe', title: 'P/E a násobky zisku', description: 'Porovnej tržní cenu s oceněním při různých násobcích EPS.', group: 'Ocenění', icon: ChartNoAxesCombined, tag: 'Relativní ocenění' },
] satisfies { id: CalculatorId; title: string; description: string; group: string; icon: typeof Calculator; tag: string }[];
const defaults: Record<CalculatorId, Draft> = {
  planner: { initial: '200000', monthly: '15000', years: '25', annualReturn: '7', inflation: '2,5', annualFee: '0,2' },
  compound: { initial: '100000', monthly: '5000', years: '20', annualReturn: '7', frequency: 'monthly' },
  goal: { initial: '100000', target: '2000000', years: '10', annualReturn: '7' },
  fire: { initial: '800000', monthly: '25000', annualExpenses: '600000', withdrawalRate: '4', annualReturn: '7', inflation: '2,5', coastYears: '20' },
  dcf: { ticker: '', currency: 'USD', cashFlow: '10', growth: '5', years: '10', discount: '10', terminalGrowth: '2', price: '150' },
  pe: { ticker: '', currency: 'USD', eps: '10', price: '150', targetPe: '20' },
};
const fields: Record<string, FieldSpec> = {
  initial: { key: 'initial', label: 'Počáteční částka', unit: 'Kč', min: 0, max: 1e10, sliderMax: 1e7, step: 10000 },
  monthly: { key: 'monthly', label: 'Měsíční vklad', unit: 'Kč', min: 0, max: 1e8, sliderMax: 100000, step: 500 },
  years: { key: 'years', label: 'Horizont', unit: 'let', min: 0, max: 100, sliderMax: 50 },
  annualReturn: { key: 'annualReturn', label: 'Roční výnos', unit: '%', min: -50, max: 50, step: 0.1 },
  inflation: { key: 'inflation', label: 'Inflace', unit: '%', min: -10, max: 30, step: 0.1 },
  annualFee: { key: 'annualFee', label: 'Roční náklady', unit: '%', min: 0, max: 20, sliderMax: 5, step: 0.1 },
  target: { key: 'target', label: 'Cílová částka', unit: 'Kč', min: 0, max: 1e10, sliderMax: 2e7, step: 100000 },
  annualExpenses: { key: 'annualExpenses', label: 'Roční výdaje v penzi', unit: 'Kč', min: 0, max: 1e8, sliderMax: 2400000, step: 12000 },
  withdrawalRate: { key: 'withdrawalRate', label: 'Roční míra výběru', unit: '%', min: 0.1, max: 20, sliderMax: 10, step: 0.1 },
  coastYears: { key: 'coastYears', label: 'Do penze pro Coast FIRE', unit: 'let', min: 0, max: 100, sliderMax: 50 },
  cashFlow: { key: 'cashFlow', label: 'FCFE na akcii', min: 0.01, max: 1e6, sliderMax: 50, step: 0.1 },
  growth: { key: 'growth', label: 'Růst FCFE ročně', unit: '%', min: -50, max: 100, sliderMax: 30, step: 0.5 },
  discount: { key: 'discount', label: 'Diskontní sazba', unit: '%', min: 0.1, max: 50, sliderMax: 25, step: 0.1 },
  terminalGrowth: { key: 'terminalGrowth', label: 'Terminální růst', unit: '%', min: -20, max: 20, sliderMax: 10, step: 0.1 },
  price: { key: 'price', label: 'Tržní cena za akcii', min: 0.01, max: 1e7, sliderMax: 1000, step: 1 },
  eps: { key: 'eps', label: 'Zisk na akcii (EPS)', min: 0.01, max: 1e6, sliderMax: 50, step: 0.1 },
  targetPe: { key: 'targetPe', label: 'Cílové P/E', unit: '×', min: 0.1, max: 200, sliderMax: 60, step: 0.1 },
};
const fieldOrder: Record<CalculatorId, string[]> = {
  planner: ['initial', 'monthly', 'years', 'annualReturn', 'inflation', 'annualFee'],
  compound: ['initial', 'monthly', 'years', 'annualReturn'],
  goal: ['target', 'years', 'initial', 'annualReturn'],
  fire: ['annualExpenses', 'withdrawalRate', 'initial', 'monthly', 'annualReturn', 'inflation', 'coastYears'],
  dcf: ['cashFlow', 'price', 'growth', 'years', 'discount', 'terminalGrowth'],
  pe: ['price', 'eps', 'targetPe'],
};

function Insight({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm leading-relaxed"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>{children}</p></div>;
}

function Results({ id, draft, scenario }: { id: CalculatorId; draft: Draft; scenario: number }) {
  try {
    const values = Object.fromEntries(fieldOrder[id].map(key => [key, parseNumber(draft[key])])) as Record<string, number>;
    const valuation = id === 'dcf' || id === 'pe';
    const currency = valuation ? draft.currency : 'CZK';
    const format = (value: number) => money(value, currency);
    // Enforce exactly the same bounds as the controls, including manually typed inputs.
    for (const key of fieldOrder[id]) {
      const field = fields[key];
      if (!Number.isFinite(values[key]) || values[key] < field.min || values[key] > field.max) throw new Error(`Zkontroluj pole „${field.label}“.`);
    }
    if (id === 'planner' || id === 'compound' || id === 'goal') {
      const input: GrowthInput = { initial: values.initial, monthly: values.monthly || 0, years: values.years,
        annualReturn: values.annualReturn, inflation: values.inflation || 0, annualFee: values.annualFee || 0 };
      const isGoal = id === 'goal';
      const goal = isGoal ? savingsGoal(input.initial, values.target, input.years, input.annualReturn) : null;
      const result = goal || projectGrowth({ ...input, annualReturn: input.annualReturn + (id === 'planner' ? scenario : 0) }, id === 'compound' && draft.frequency === 'monthly' ? 'monthly' : 'effective');
      const low = id === 'planner' ? projectGrowth({ ...input, annualReturn: input.annualReturn - 3 }) : null;
      const high = id === 'planner' ? projectGrowth({ ...input, annualReturn: input.annualReturn + 3 }) : null;
      const points = result.points.map((point, index) => ({ ...point, ...(low && high ? { range: [low.points[index].value, high.points[index].value] as [number, number] } : {}) }));
      return <div className="space-y-5">
        <MetricGrid items={[
          { label: isGoal ? 'Potřebný měsíční vklad' : 'Konečná hodnota', value: format(goal ? goal.monthly : result.value), primary: true, detail: isGoal ? 'Vklad na konci měsíce' : `Za ${number(input.years)} let` },
          ...(id === 'planner' ? [{ label: 'Po inflaci', value: format(result.realValue), detail: 'Kupní síla v dnešních cenách' }] : []),
          { label: 'Vloženo celkem', value: format(result.contributed), detail: 'Počátek a pravidelné vklady' },
          { label: 'Zhodnocení', value: format(result.gain), positive: result.gain >= 0, detail: id === 'planner' ? 'Po průběžných poplatcích, před daněmi' : 'Modelový výsledek před daněmi' },
        ]} />
        <Insight>{goal ? goal.monthly === 0 ? 'Za těchto předpokladů dosáhneš cíle i bez dalších vkladů.' : <>Na cíl {format(values.target)} za {input.years} let vychází měsíční vklad {format(goal.monthly)}. Pro praktické spoření jej zaokrouhli nahoru.</> : id === 'planner' ? <>Výsledné rozpětí je {format(low!.value)} až {format(high!.value)}. Celkový dopad nákladů včetně ušlého výnosu ve zvoleném scénáři je {format(result.feeImpact)}.</> : <>Z celkové hodnoty {format(result.value)} tvoří vlastní vklady {format(result.contributed)}. Zbytek je modelové zhodnocení, nikoliv zaručený výnos.</>}</Insight>
        <ProjectionChart points={points} target={isGoal ? values.target : undefined} title={isGoal ? 'Cesta k cíli' : 'Růst majetku v čase'} />
        {id === 'planner' && <div className="flex flex-wrap gap-2" aria-label="Milníky">{[1e6, 5e6, 1e7].map(target => <span className="rounded-full border border-border bg-card px-3 py-2 text-xs" key={target}>{compact(target)} Kč · {result.milestones[target] === null ? 'mimo horizont' : result.milestones[target] === 0 ? 'již na začátku' : `za ${number(result.milestones[target])} let`}</span>)}</div>}
        <Explanation>
          <p>Vklady přicházejí na konci měsíce. {id === 'compound' && draft.frequency === 'monthly' ? 'Roční nominální sazbu dělíme 12 a úroky připisujeme měsíčně.' : 'Roční efektivní výnos převádíme na odpovídající měsíční sazbu: (1 + r)^(1/12) − 1.'} {id === 'compound' && draft.frequency === 'annual' ? 'Efektivní sazba vyjadřuje celkové zhodnocení za rok; průběh uvnitř roku modelujeme rovnoměrným měsíčním úročením.' : ''}</p>
          {id === 'planner' ? <><p>Scénáře používají výnos o 3 procentní body nižší / zadaný / o 3 body vyšší. Nejde o pravděpodobnostní interval ani zpětný test. Náklady se odečítají průběžně z majetku; vklady se nezpoplatňují.</p><p>Inflace snižuje kupní sílu výsledku. Vklady zůstávají nominálně stejné. Skutečně stržené modelové poplatky: {format(result.chargedFees)}.</p></> : <p>Výpočet nezohledňuje daně, poplatky ani inflaci. {isGoal ? 'Cíl je částka v budoucích nominálních korunách.' : 'Vyšší četnost úročení při stejné nominální sazbě zvyšuje efektivní výnos.'}</p>}
          <a className="inline-block text-primary underline underline-offset-4" href="https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" target="_blank" rel="noreferrer">K principům složeného úročení · Investor.gov</a>
        </Explanation>
      </div>;
    }
    if (id === 'fire') {
      const result = calculateFire(values as unknown as Parameters<typeof calculateFire>[0]);
      return <div className="space-y-5">
        <MetricGrid items={[
          { label: 'FIRE cíl', value: format(result.target), detail: 'Roční výdaje / míra výběru', primary: true },
          { label: 'Čas do cíle', value: result.yearsToFire === null ? 'Nedosažen' : result.yearsToFire === 0 ? 'Již dosažen' : `${number(result.yearsToFire)} let`, detail: result.yearsToFire === null ? 'V horizontu 100 let' : 'Při konstantním reálném výnosu' },
          { label: 'Výběr z dnešního majetku', value: format(result.monthlyWithdrawal), detail: 'Měsíčně při zvolené míře výběru' },
          { label: 'Coast FIRE dnes', value: format(result.coastAmount), detail: `Pro dosažení cíle za ${values.coastYears} let bez dalších vkladů` },
        ]} />
        <Insight>Po zohlednění inflace je modelový reálný výnos {number(result.realReturn, 2)} % ročně. {result.yearsToFire === null ? 'Zadané vklady a výnos nestačí k dosažení cíle ve 100 letech.' : result.yearsToFire === 0 ? 'Zadaný majetek už splňuje zvolený cíl.' : `Cíle dosáhneš přibližně za ${number(result.yearsToFire)} let.`} Jde o scénář, ne záruku bezpečného čerpání.</Insight>
        <ProjectionChart points={result.points} target={result.target} title="Cesta k finanční nezávislosti · dnešní ceny" />
        <Explanation title="FIRE a Coast FIRE bez falešné jistoty">
          <p>FIRE cíl = roční výdaje / zvolená roční míra výběru. Coast FIRE říká, jaký majetek by dnes při zadaném výnosu dorostl na cíl bez dalších vkladů.</p>
          <p>Vše je v dnešní kupní síle. Reálný výnos = (1 + výnos) / (1 + inflace) − 1. Měsíční vklad je v reálných korunách, tedy předpokládá jeho budoucí navyšování s inflací.</p>
          <p>4 % jsou upravitelný příklad, ne zaručeně bezpečná sazba. Model nepočítá kolísání trhu, pořadí výnosů, daně ani poplatky. Historická úspěšnost výběrů bez skutečné datové řady není k dispozici.</p>
        </Explanation>
      </div>;
    }
    if (id === 'dcf') {
      const input = values as unknown as DcfInput;
      const result = calculateDcf(input);
      const sensitivity = (discount: number, growth: number) => { try { return calculateDcf({ ...input, discount, terminalGrowth: growth }).value; } catch { return null; } };
      return <div className="space-y-5">
        <MetricGrid items={[
          { label: 'Modelová hodnota akcie', value: format(result.value), primary: true, detail: 'DCF volného cash flow pro akcionáře' },
          { label: 'Rozdíl vůči ceně', value: `${number(result.upside)} %`, positive: result.upside >= 0, detail: 'Hodnota / tržní cena − 1' },
          { label: 'Bezpečnostní polštář', value: `${number(result.marginOfSafety)} %`, positive: result.marginOfSafety >= 0, detail: '1 − tržní cena / hodnota' },
        ]} />
        <Insight>Modelová hodnota je {result.value >= input.price ? 'vyšší' : 'nižší'} než zadaná cena {format(input.price)}. Terminální hodnota tvoří {number(result.terminalShare)} % odhadu, proto věnuj pozornost citlivosti níže.</Insight>
        <ProjectionChart points={result.rows} cashFlow title="Projekce cash flow na akcii" currency={currency} />
        <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <h3 className="font-semibold">Citlivost modelové hodnoty</h3><p className="mb-4 mt-1 text-xs text-muted-foreground">Řádky: diskontní sazba. Sloupce: terminální růst.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><caption className="sr-only">Hodnota akcie podle diskontní sazby a terminálního růstu</caption><thead><tr><th scope="col" className="p-3 text-left">Diskont / růst</th>{[-1, 0, 1].map(delta => <th scope="col" className="p-3 text-right" key={delta}>{number(input.terminalGrowth + delta)} %</th>)}</tr></thead><tbody>{[-1, 0, 1].map(row => <tr className="border-t border-border" key={row}><th scope="row" className="p-3 text-left font-medium">{number(input.discount + row)} %</th>{[-1, 0, 1].map(col => { const value = sensitivity(input.discount + row, input.terminalGrowth + col); return <td className={`p-3 text-right ${row === 0 && col === 0 ? 'rounded-lg bg-primary/10 font-semibold text-primary' : ''}`} key={col}>{value === null ? '—' : format(value)}</td>; })}</tr>)}</tbody></table></div>
        </section>
        <Explanation title="Co přesně oceňujeme">
          <p>Vstupem je roční FCFE na akcii: cash flow dostupné akcionářům po reinvesticích a dluhovém financování. Diskont je požadovaný výnos vlastního kapitálu, nikoliv WACC. Počet akcií předpokládáme konstantní.</p>
          <p>Diskontujeme každý roční tok i terminální hodnotu FCFE posledního roku × (1 + g) / (diskont − g). Diskont musí být vyšší než terminální růst. Model není vhodný pro záporné FCFE.</p>
          <p>Cena a FCFE musí být ve stejné měně. Vstupy jsou ruční, nikoliv ověřená živá data. Výsledek sám o sobě není pokyn k nákupu nebo prodeji.</p>
          <a className="inline-block text-primary underline underline-offset-4" href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/fcfe.html" target="_blank" rel="noreferrer">Metodika FCFE · Aswath Damodaran, NYU</a>
        </Explanation>
      </div>;
    }
    const result = calculatePe(values.eps, values.price, values.targetPe);
    const bars = [{ label: 'Zadaná tržní cena', value: values.price }, { label: 'P/E 15', value: values.eps * 15 }, { label: 'P/E 25', value: values.eps * 25 }, { label: `Cílové P/E ${number(values.targetPe)}`, value: result.value }];
    const max = Math.max(...bars.map(bar => bar.value));
    return <div className="space-y-5">
      <MetricGrid items={[{ label: 'Aktuální P/E', value: `${number(result.currentPe)}×`, detail: 'Zadaná cena / EPS' }, { label: 'Zisk na akcii', value: format(values.eps), detail: 'Ručně zadané EPS' }, { label: 'Implikovaná cena', value: format(result.value), primary: true }, { label: 'Rozdíl vůči ceně', value: `${number(result.upside)} %`, positive: result.upside >= 0 }]} />
      <Insight>Při zisku {format(values.eps)} na akcii a násobku {number(values.targetPe)}× vychází cena {format(result.value)}. Vhodný násobek závisí na odvětví, růstu i riziku firmy.</Insight>
      <section className="space-y-6 rounded-2xl border border-border bg-card p-5 md:p-6"><h3 className="font-semibold">Cena při různých násobcích zisku</h3>{bars.map((bar, index) => <div key={index} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_110px] sm:items-center"><span className="text-sm text-muted-foreground">{bar.label}</span><div className="h-5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${index === 0 ? 'bg-muted-foreground/60' : 'bg-primary'}`} style={{ width: `${bar.value / max * 100}%` }} /></div><span className="text-sm font-semibold tabular-nums sm:text-right">{format(bar.value)}</span></div>)}</section>
      <Explanation><p>P/E = cena / zisk na akcii. Implikovaná cena = EPS × cílové P/E. Používej konzistentně buď posledních 12 měsíců, nebo vlastní odhad budoucího EPS; nemíchej různá období.</p><p>Pro nulové nebo záporné EPS toto porovnání nedává smysl. Násobky 15 a 25 jsou pouze ilustrace, ne univerzální doporučení.</p><a className="inline-block text-primary underline underline-offset-4" href="https://www.investor.gov/introduction-investing/investing-basics/glossary/price-earnings-pe-ratio" target="_blank" rel="noreferrer">Definice P/E · Investor.gov</a></Explanation>
    </div>;
  } catch (error) {
    return <div role="alert" className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"><Info className="h-5 w-5 shrink-0 text-destructive" /><div><h3 className="font-semibold">Uprav vstupy pro výpočet</h3><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Tyto hodnoty nelze spočítat.'}</p></div></div>;
  }
}

export function CalculatorsWorkspace({ accountWealth, onOpenInvestments }: { accountWealth: number | null; onOpenInvestments: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = catalog.find(item => item.id === searchParams.get('calculator'));
  const [drafts, setDrafts] = useState<Record<CalculatorId, Draft>>(() => structuredClone(defaults));
  const [filter, setFilter] = useState('Vše');
  const [query, setQuery] = useState('');
  const [scenario, setScenario] = useState(0);
  const select = (id?: CalculatorId) => {
    setSearchParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('calculator', id); else next.delete('calculator'); return next; });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const update = (key: string, value: string) => selected && setDrafts(current => ({ ...current, [selected.id]: { ...current[selected.id], [key]: value } }));
  const visible = catalog.filter(item => (filter === 'Vše' || item.group === filter) && `${item.title} ${item.description}`.toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs')));
  const draft = selected ? drafts[selected.id] : null;
  const valuation = selected?.id === 'dcf' || selected?.id === 'pe';
  return <div className="mx-auto max-w-[1600px] space-y-6" data-testid="calculators-workspace">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        {selected ? <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground" onClick={() => select()}><ArrowLeft className="mr-2 h-4 w-4" />Všechny kalkulačky</Button> : <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">Plánování & ocenění</p>}
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{selected?.title || 'Kalkulačky'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{selected?.description || 'Dej svým plánům konkrétní čísla. Prozkoumej růst majetku, cestu k cíli i hodnotu akcií.'}</p>
      </div>
      <Button variant="outline" className="rounded-full" onClick={onOpenInvestments}><Landmark className="mr-2 h-4 w-4" />Otevřít investice</Button>
    </header>
    {!selected ? <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Kategorie kalkulaček">{['Vše', 'Plánování', 'Ocenění'].map(group => <Button key={group} variant={filter === group ? 'default' : 'outline'} className="rounded-full" aria-pressed={filter === group} onClick={() => setFilter(group)}>{group}</Button>)}</div>
        <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Hledat kalkulačku" value={query} onChange={event => setQuery(event.target.value)} placeholder="Najít kalkulačku…" className="rounded-full pl-9" /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visible.map((item, index) => { const Icon = item.icon; return <button key={item.id} onClick={() => select(item.id)} className="group flex min-h-56 flex-col rounded-2xl border border-border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Otevřít ${item.title}`}>
        <div className="flex items-start justify-between"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-6 w-6" /></span><span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{item.group}</span></div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h2><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        {index < 3 && <svg viewBox="0 0 300 55" className="mt-5 h-14 w-full text-primary" preserveAspectRatio="none" aria-hidden="true"><path d={item.id === 'dcf' ? 'M0 45 H50 V33 H100 V28 H150 V20 H200 V14 H250 V5 H300' : 'M0 51 C70 49 145 42 195 29 S260 9 300 3'} fill="none" stroke="currentColor" strokeWidth="2" /><path d="M0 52 L300 40" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="5 5" fill="none" /></svg>}
        <div className="mt-5 flex items-center justify-between text-xs"><span className="text-muted-foreground">{item.tag}</span><span className="inline-flex items-center gap-2 font-semibold text-primary">Otevřít <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
      </button>; })}</div>
      {visible.length === 0 && <p role="status" className="rounded-2xl border border-border p-8 text-center text-muted-foreground">Žádná kalkulačka neodpovídá hledání.</p>}
      <Explanation title="Tvoje scénáře, tvoje rozhodnutí"><p>Všechny výpočty běží lokálně. Kalkulačky nemění účty, transakce ani portfolio a nepotřebují přístup k brokerovi. Vstupy si drží při přepínání mezi kalkulačkami; po opuštění sekce nebo obnovení stránky se vrátí na příklady.</p><p>Výsledky jsou orientační modely podle zadaných předpokladů, ne investiční doporučení. Ceny a fundamenty u ocenění zadáváš ručně. Historické backtesty a daňové kalkulačky v této verzi nejsou.</p></Explanation>
    </> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 min-w-0 space-y-5 xl:order-1">
        {selected.id === 'planner' && <div className="flex flex-wrap gap-2" aria-label="Scénář výnosu">{[{ label: 'Pesimistický', value: -3 }, { label: 'Základní', value: 0 }, { label: 'Optimistický', value: 3 }].map(item => <Button key={item.value} variant={scenario === item.value ? 'default' : 'outline'} aria-pressed={scenario === item.value} onClick={() => setScenario(item.value)} className="rounded-full">{item.label}</Button>)}</div>}
        {valuation && <div className="rounded-2xl border border-border bg-card p-4 text-sm"><span className="font-medium">{draft!.ticker.trim() || 'Vlastní model akcie'}</span><span className="ml-3 rounded-full bg-warning/10 px-2 py-1 text-xs text-muted-foreground">Ručně zadané údaje · {draft!.currency}</span></div>}
        <Results id={selected.id} draft={draft!} scenario={scenario} />
      </div>
      <aside className="order-1 rounded-2xl border border-border bg-card p-5 xl:order-2" aria-label="Vstupy kalkulačky">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><h2 className="font-semibold">Vstupy výpočtu</h2><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /></div>
        <div className="space-y-6">
          {valuation && <div className="space-y-3"><label className="block text-sm">Označení akcie<Input className="mt-2" value={draft!.ticker} onChange={event => update('ticker', event.target.value)} placeholder="Např. vlastní rozbor firmy" maxLength={60} /></label><label className="block text-sm">Měna vstupů<select className="mt-2 w-full rounded-lg border border-input bg-background p-2" value={draft!.currency} onChange={event => update('currency', event.target.value)}>{['USD', 'EUR', 'CZK'].map(currency => <option key={currency}>{currency}</option>)}</select></label><p className="text-xs leading-relaxed text-muted-foreground">Změna měny pouze označí jednotky, nepřevádí částky kurzem.</p></div>}
          {!valuation && <Button variant="outline" size="sm" className="h-auto w-full whitespace-normal" disabled={accountWealth === null || !Number.isFinite(accountWealth) || accountWealth < 0 || accountWealth > 1e10} onClick={() => update('initial', String(accountWealth))}>Použít majetek z přehledu účtů</Button>}
          {selected.id === 'compound' && <label className="block text-sm">Způsob zadání sazby<select className="mt-2 w-full rounded-lg border border-input bg-background p-2" value={draft!.frequency} onChange={event => update('frequency', event.target.value)}><option value="monthly">Nominální · měsíční úročení</option><option value="annual">Efektivní roční výnos</option></select></label>}
          {fieldOrder[selected.id].map(key => <NumberField key={`${selected.id}-${key}`} field={{ ...fields[key], ...(key === 'years' && (selected.id === 'dcf' || selected.id === 'goal') ? { min: 1 } : {}), ...(['price', 'eps', 'cashFlow'].includes(key) ? { unit: draft!.currency } : {}) }} value={draft![key]} onChange={value => update(key, value)} />)}
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setDrafts(current => ({ ...current, [selected.id]: { ...defaults[selected.id] } })); setScenario(0); }}><RotateCcw className="mr-2 h-4 w-4" />Obnovit příklad</Button>
          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Změny zde upravují jen modelový výpočet. Hodnoty v účtech a investicích zůstávají beze změny.</p>
        </div>
      </aside>
    </div>}
  </div>;
}
