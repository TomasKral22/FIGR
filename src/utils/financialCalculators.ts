// Pure, deterministic models. Percentages are entered as 7 = 7%, deposits at month-end.
export interface GrowthInput {
  initial: number;
  monthly: number;
  years: number;
  annualReturn: number;
  inflation: number;
  annualFee: number;
}
export interface GrowthPoint {
  year: number;
  value: number;
  contributed: number;
  realValue: number;
  withoutFees: number;
}

function within(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label}: zadejte číslo od ${min} do ${max}.`);
  }
}
function horizon(years: number, min = 0) {
  within(years, min, 100, 'Horizont');
  if (!Number.isInteger(years)) throw new RangeError('Horizont musí být celý počet let.');
}
export function monthlyRate(annualPercent: number, compounding: 'effective' | 'monthly' = 'effective') {
  within(annualPercent, -99, 100, 'Roční výnos');
  return compounding === 'monthly' ? annualPercent / 1200 : Math.expm1(Math.log1p(annualPercent / 100) / 12);
}

export function projectGrowth(input: GrowthInput, compounding: 'effective' | 'monthly' = 'effective') {
  within(input.initial, 0, 1e10, 'Počáteční částka');
  within(input.monthly, 0, 1e8, 'Měsíční vklad');
  horizon(input.years);
  within(input.inflation, -20, 100, 'Inflace');
  within(input.annualFee, 0, 20, 'Roční náklady');
  const monthly = monthlyRate(input.annualReturn, compounding);
  const feeFactor = Math.pow(1 - input.annualFee / 100, 1 / 12);
  let value = input.initial;
  let withoutFees = input.initial;
  let chargedFees = 0;
  const points: GrowthPoint[] = [{ year: 0, value, withoutFees, contributed: value, realValue: value }];
  const milestones: Record<number, number | null> = Object.fromEntries([1e6, 5e6, 1e7].map(target => [target, value >= target ? 0 : null]));
  for (let month = 1; month <= input.years * 12; month++) {
    const beforeFee = value * (1 + monthly);
    chargedFees += beforeFee * (1 - feeFactor);
    value = beforeFee * feeFactor + input.monthly;
    withoutFees = withoutFees * (1 + monthly) + input.monthly;
    for (const target of [1e6, 5e6, 1e7]) if (milestones[target] === null && value >= target) milestones[target] = month / 12;
    if (month % 12 === 0) points.push({ year: month / 12, value, withoutFees,
      contributed: input.initial + input.monthly * month,
      realValue: value / Math.pow(1 + input.inflation / 100, month / 12) });
  }
  const last = points[points.length - 1];
  return { points, ...last, gain: last.value - last.contributed, chargedFees,
    feeImpact: last.withoutFees - last.value, milestones };
}

export function savingsGoal(initial: number, target: number, years: number, annualReturn: number) {
  within(initial, 0, 1e10, 'Počáteční částka');
  within(target, 0, 1e10, 'Cílová částka');
  horizon(years, 1);
  const rate = monthlyRate(annualReturn);
  const months = years * 12;
  const growth = Math.pow(1 + rate, months);
  const annuity = Math.abs(rate) < 1e-12 ? months : Math.expm1(months * Math.log1p(rate)) / rate;
  const monthly = Math.max(0, (target - initial * growth) / annuity);
  within(monthly, 0, 1e8, 'Potřebný měsíční vklad');
  return { monthly, ...projectGrowth({ initial, monthly, years, annualReturn, inflation: 0, annualFee: 0 }) };
}

export interface FireInput {
  initial: number;
  monthly: number;
  annualExpenses: number;
  withdrawalRate: number;
  annualReturn: number;
  inflation: number;
  coastYears: number;
}
export function calculateFire(input: FireInput) {
  within(input.annualExpenses, 0, 1e8, 'Roční výdaje');
  within(input.withdrawalRate, 0.1, 20, 'Míra výběru');
  within(input.inflation, -20, 100, 'Inflace');
  monthlyRate(input.annualReturn);
  horizon(input.coastYears);
  const target = input.annualExpenses / (input.withdrawalRate / 100);
  const realReturn = (1 + input.annualReturn / 100) / (1 + input.inflation / 100) - 1;
  const projection = projectGrowth({ initial: input.initial, monthly: input.monthly, years: 100,
    annualReturn: realReturn * 100, inflation: 0, annualFee: 0 });
  const rate = monthlyRate(realReturn * 100);
  let value = input.initial;
  let months: number | null = value >= target ? 0 : null;
  for (let month = 1; months === null && month <= 1200; month++) {
    value = value * (1 + rate) + input.monthly;
    if (value >= target) months = month;
  }
  const chartYears = months === null ? 40 : Math.min(100, Math.max(10, Math.ceil(months / 12) + 5));
  return { target, yearsToFire: months === null ? null : months / 12, realReturn: realReturn * 100,
    coastAmount: target / Math.pow(1 + realReturn, input.coastYears),
    monthlyWithdrawal: input.initial * input.withdrawalRate / 100 / 12,
    points: projection.points.filter(point => point.year <= chartYears) };
}

export interface DcfInput { cashFlow: number; growth: number; years: number; discount: number; terminalGrowth: number; price: number }
export function calculateDcf(input: DcfInput) {
  within(input.cashFlow, 0.01, 1e6, 'FCFE na akcii');
  within(input.growth, -50, 100, 'Růst cash flow');
  horizon(input.years, 1);
  within(input.discount, 0.1, 50, 'Diskontní sazba');
  within(input.terminalGrowth, -20, 20, 'Terminální růst');
  within(input.price, 0.01, 1e7, 'Tržní cena');
  if (input.discount <= input.terminalGrowth) throw new RangeError('Diskontní sazba musí být vyšší než terminální růst.');
  const rows = Array.from({ length: input.years }, (_, index) => {
    const year = index + 1;
    const cashFlow = input.cashFlow * Math.pow(1 + input.growth / 100, year);
    return { year, cashFlow, presentValue: cashFlow / Math.pow(1 + input.discount / 100, year) };
  });
  const terminal = rows[rows.length - 1].cashFlow * (1 + input.terminalGrowth / 100) / ((input.discount - input.terminalGrowth) / 100);
  const terminalPresentValue = terminal / Math.pow(1 + input.discount / 100, input.years);
  const value = rows.reduce((sum, row) => sum + row.presentValue, 0) + terminalPresentValue;
  return { rows, value, terminalPresentValue, terminalShare: terminalPresentValue / value * 100,
    upside: (value / input.price - 1) * 100, marginOfSafety: (1 - input.price / value) * 100 };
}

export function calculatePe(eps: number, price: number, targetPe: number) {
  within(eps, 0.01, 1e6, 'EPS');
  within(price, 0.01, 1e7, 'Tržní cena');
  within(targetPe, 0.1, 200, 'Cílové P/E');
  return { currentPe: price / eps, value: eps * targetPe, upside: (eps * targetPe / price - 1) * 100 };
}
