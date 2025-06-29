// Método Alemán: Cuota con amortización fija, interés sobre saldo.
// Considera períodos de gracia total o parcial

export type GracePeriodType = "none" | "partial" | "total";

export interface GracePeriod {
  period: number; // 1-based index
  type: GracePeriodType;
  duration?: number; // no usado directamente, opcional
}

export interface PaymentRow {
  period: number;
  date: Date;
  installment: number;
  interest: number;
  amortization: number;
  balance: number;
  graceType?: GracePeriodType;
}

export interface PaymentPlanInput {
  nominalValue: number;
  annualInterestRate: number; // e.g. 0.12 for 12%
  numberOfPeriods: number;
  paymentFrequencyInMonths: number;
  emissionDate: Date;
  gracePeriods?: GracePeriod[];
}

export function calculateGermanBondSchedule(input: PaymentPlanInput): PaymentRow[] {
  const {
    nominalValue,
    annualInterestRate,
    numberOfPeriods,
    paymentFrequencyInMonths,
    emissionDate,
    gracePeriods = []
  } = input;

  const monthlyRate = annualInterestRate / 12;
  const periodRate = monthlyRate * paymentFrequencyInMonths;
  const amortization = nominalValue / numberOfPeriods;

  const schedule: PaymentRow[] = [];
  let balance = nominalValue;

  for (let i = 1; i <= numberOfPeriods; i++) {
    const date = new Date(emissionDate);
    date.setMonth(date.getMonth() + paymentFrequencyInMonths * i);

    const grace = gracePeriods.find(g => g.period === i);
    const graceType = grace?.type ?? "none";

    let interest = balance * periodRate;
    let amort = 0;
    let installment = 0;

    if (graceType === "total") {
      interest = 0;
      amort = 0;
      installment = 0;
    } else if (graceType === "partial") {
      amort = 0;
      installment = interest;
    } else {
      amort = amortization;
      installment = interest + amort;
      balance -= amort;
    }

    schedule.push({
      period: i,
      date,
      installment: round(installment),
      interest: round(interest),
      amortization: round(amort),
      balance: round(balance),
      graceType,
    });
  }

  return schedule;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
