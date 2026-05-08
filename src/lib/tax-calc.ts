// Simple Indian income-tax forecast helper. FY 2025-26 illustrative slabs.
// Used purely for in-app forecasting; not a substitute for filed returns.

export type TaxRegime = "new" | "old";

export type SalaryProfile = {
  annual_ctc: number;
  basic: number;
  hra: number;
  special_allowance: number;
  other_allowance: number;
  pf_deduction: number;
  professional_tax: number;
  other_deduction: number;
  tax_regime: TaxRegime;
};

export type TaxBreakdown = {
  taxableIncome: number;
  baseTax: number;
  cess: number;
  totalTax: number;
  effectiveRate: number; // %
  regime: TaxRegime;
  monthlyTax: number;
};

const NEW_SLABS: Array<[number, number]> = [
  [300_000, 0],
  [700_000, 0.05],
  [1_000_000, 0.1],
  [1_200_000, 0.15],
  [1_500_000, 0.2],
  [Infinity, 0.3],
];

const OLD_SLABS: Array<[number, number]> = [
  [250_000, 0],
  [500_000, 0.05],
  [1_000_000, 0.2],
  [Infinity, 0.3],
];

const STANDARD_DEDUCTION_NEW = 75_000;
const STANDARD_DEDUCTION_OLD = 50_000;
const CESS_RATE = 0.04;

export const computeAnnualTax = (gross: number, regime: TaxRegime, additionalDeductions = 0): TaxBreakdown => {
  const stdDed = regime === "new" ? STANDARD_DEDUCTION_NEW : STANDARD_DEDUCTION_OLD;
  const taxable = Math.max(0, gross - stdDed - additionalDeductions);
  const slabs = regime === "new" ? NEW_SLABS : OLD_SLABS;

  let remaining = taxable;
  let prev = 0;
  let tax = 0;
  for (const [upTo, rate] of slabs) {
    const slabSpan = Math.max(0, Math.min(remaining, upTo - prev));
    tax += slabSpan * rate;
    remaining -= slabSpan;
    prev = upTo;
    if (remaining <= 0) break;
  }
  const cess = tax * CESS_RATE;
  const totalTax = tax + cess;
  return {
    taxableIncome: taxable,
    baseTax: Math.round(tax),
    cess: Math.round(cess),
    totalTax: Math.round(totalTax),
    effectiveRate: gross > 0 ? +(totalTax / gross * 100).toFixed(2) : 0,
    regime,
    monthlyTax: Math.round(totalTax / 12),
  };
};

export type MonthlyBreakdown = {
  grossMonthly: number;
  basicMonthly: number;
  hraMonthly: number;
  specialMonthly: number;
  otherMonthly: number;
  pfMonthly: number;
  professionalTaxMonthly: number;
  otherDeductionMonthly: number;
  taxMonthly: number;
  netMonthly: number;
};

export const computeMonthlySalary = (p: SalaryProfile, tax: TaxBreakdown): MonthlyBreakdown => {
  const m = (n: number) => Math.round(n / 12);
  const gross = p.basic + p.hra + p.special_allowance + p.other_allowance;
  const grossM = m(gross);
  const pfM = m(p.pf_deduction);
  const ptM = m(p.professional_tax);
  const otherDedM = m(p.other_deduction);
  const taxM = tax.monthlyTax;
  return {
    grossMonthly: grossM,
    basicMonthly: m(p.basic),
    hraMonthly: m(p.hra),
    specialMonthly: m(p.special_allowance),
    otherMonthly: m(p.other_allowance),
    pfMonthly: pfM,
    professionalTaxMonthly: ptM,
    otherDeductionMonthly: otherDedM,
    taxMonthly: taxM,
    netMonthly: grossM - pfM - ptM - otherDedM - taxM,
  };
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
