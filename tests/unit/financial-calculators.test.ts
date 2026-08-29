import test from 'node:test';
import assert from 'node:assert/strict';
import { projectGrowth, savingsGoal, calculateFire, calculateDcf, calculatePe, monthlyRate } from '../../src/utils/financialCalculators.ts';

const close = (actual: number, expected: number, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const growth = { initial: 100000, monthly: 5000, years: 20, annualReturn: 7, inflation: 0, annualFee: 0 };
const fire = { initial: 800000, monthly: 25000, annualExpenses: 600000, withdrawalRate: 4, annualReturn: 7, inflation: 2.5, coastYears: 20 };
const dcf = { cashFlow: 10, growth: 0, years: 10, discount: 10, terminalGrowth: 0, price: 120 };

test('monthly compounding agrees with the independent ordinary-annuity formula', () => {
  const rate = 0.07 / 12;
  const expected = 100000 * (1 + rate) ** 240 + 5000 * ((1 + rate) ** 240 - 1) / rate;
  const result = projectGrowth(growth, 'monthly');
  close(result.value, expected);
  close(result.contributed, 1300000);
  close(result.value, 3008507.18, 0.01);
});
test('effective annual return and nominal monthly compounding stay distinct', () => {
  close(projectGrowth({ ...growth, monthly: 0, years: 1 }).value, 107000);
  assert.ok(projectGrowth({ ...growth, monthly: 0, years: 1 }, 'monthly').value > 107000);
});
test('zero yield adds contributions, with no division by zero', () => {
  const result = projectGrowth({ ...growth, annualReturn: 0 });
  close(result.value, 1300000); close(result.gain, 0);
});
test('a zero-year horizon returns only the original principal', () => {
  const result = projectGrowth({ ...growth, years: 0 });
  close(result.value, 100000); assert.equal(result.points.length, 1);
});
test('negative returns remain losses instead of being clamped to zero', () => {
  const result = projectGrowth({ ...growth, monthly: 0, years: 1, annualReturn: -20 });
  close(result.value, 80000); close(result.gain, -20000);
});
test('annual fees are charged to assets and inflation deflates the result', () => {
  const result = projectGrowth({ ...growth, initial: 10000, monthly: 0, years: 1, annualReturn: 0, annualFee: 1, inflation: 10 });
  close(result.value, 9900); close(result.chargedFees, 100); close(result.feeImpact, 100); close(result.realValue, 9000);
});
test('scenario ordering and existing milestones are deterministic', () => {
  const base = projectGrowth({ ...growth, initial: 1000000 });
  assert.equal(base.milestones[1000000], 0);
  assert.ok(projectGrowth({ ...growth, annualReturn: 4 }).value < projectGrowth(growth).value);
  assert.ok(projectGrowth({ ...growth, annualReturn: 10 }).value > projectGrowth(growth).value);
});
test('zero-return goal solves the monthly shortfall exactly', () => {
  const result = savingsGoal(12000, 132000, 10, 0);
  close(result.monthly, 1000); close(result.value, 132000);
});
test('positive- and negative-return savings goals reconstruct their targets', () => {
  for (const rate of [-10, 0.00001, 7]) close(savingsGoal(100000, 2000000, 10, rate).value, 2000000, 0.001);
});
test('a goal met by the initial principal requires no negative deposits', () => {
  close(savingsGoal(2000000, 1000000, 10, 0).monthly, 0);
});
test('FIRE uses the exact inflation adjustment and an explicit withdrawal assumption', () => {
  const result = calculateFire(fire);
  close(result.target, 15000000);
  close(result.realReturn, (1.07 / 1.025 - 1) * 100);
  close(result.monthlyWithdrawal, 800000 * 0.04 / 12);
  close(result.coastAmount, 15000000 / (1.07 / 1.025) ** 20);
});
test('FIRE has explicit already-met and unreachable states', () => {
  assert.equal(calculateFire({ ...fire, initial: 15000000 }).yearsToFire, 0);
  assert.equal(calculateFire({ ...fire, initial: 0, monthly: 0 }).yearsToFire, null);
  assert.equal(calculateFire({ ...fire, initial: 0, annualExpenses: 0 }).yearsToFire, 0);
});
test('zero real yield reaches FIRE at the deposit-only time', () => {
  const result = calculateFire({ ...fire, initial: 0, monthly: 10000, annualExpenses: 4800, annualReturn: 2.5 });
  close(result.target, 120000); close(result.yearsToFire!, 1);
});
test('DCF constant cash flow equals a perpetuity independent of forecast horizon', () => {
  close(calculateDcf(dcf).value, 100);
  close(calculateDcf({ ...dcf, years: 1 }).value, 100);
});
test('DCF growing perpetuity and comparison denominators are correct', () => {
  const result = calculateDcf({ ...dcf, growth: 5, terminalGrowth: 5, price: 105 });
  close(result.value, 210); close(result.upside, 100); close(result.marginOfSafety, 50);
});
test('DCF rejects terminal growth at or above the discount rate', () => {
  assert.throws(() => calculateDcf({ ...dcf, terminalGrowth: 10 }), /vyšší/);
  assert.throws(() => calculateDcf({ ...dcf, terminalGrowth: 11 }), /vyšší/);
});
test('P/E uses EPS times target multiple and rejects nonpositive earnings', () => {
  const result = calculatePe(10, 150, 20);
  close(result.currentPe, 15); close(result.value, 200); close(result.upside, 100 / 3);
  assert.throws(() => calculatePe(0, 150, 20)); assert.throws(() => calculatePe(-10, 150, 20));
});
test('invalid and unbounded inputs fail closed before any loop', () => {
  for (const value of [NaN, Infinity, -1, 101, 1.5]) assert.throws(() => projectGrowth({ ...growth, years: value }));
  assert.throws(() => projectGrowth({ ...growth, initial: -1 }));
  assert.throws(() => projectGrowth({ ...growth, monthly: NaN }));
  assert.throws(() => savingsGoal(0, 1000, 0, 7));
  assert.throws(() => calculateFire({ ...fire, withdrawalRate: 0 }));
  assert.throws(() => calculateDcf({ ...dcf, cashFlow: 0 }));
  assert.throws(() => monthlyRate(-100));
});
