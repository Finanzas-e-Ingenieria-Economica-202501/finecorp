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
  gracePeriod: GracePeriodType;
  bond: number;
  coupon: number; // Interés
  installment: number; // Cuota
  amortization: number;
  premium: number; // Prima
  shield: number; // Escudo
  emitterFlow: number; // Flujo Emisor
  emitterFlowWithShield: number; // Flujo Emisor c/Escudo
  bondholderFlow: number; // Flujo Bonista
  actualizedFlow: number; // Flujo Act.
  faByPeriod: number; // FA x Plazo
  convexityFactor: number; // Factor p/Convexidad
  graceType?: GracePeriodType;
}

export interface PaymentPlanInput {
  nominalValue: number;
  comercialValue: number;
  annualInterestRate: number; // e.g. 0.12 for 12%
  interestRateType: "nominal" | "effective";
  compoundingFrequency?: string;
  paymentFrequency: string;
  years: number;
  emissionDate: Date;
  gracePeriods?: GracePeriod[];
  prima?: number;
  structuration?: number;
  colocation?: number;
  flotation?: number;
  cavali?: number;
  structurationApplyTo?: string;
  colocationApplyTo?: string;
  flotationApplyTo?: string;
  cavaliApplyTo?: string;
  cok: number;
  income_tax?: number;
}

// Utilidades para frecuencias y días
const frequencyToDays: Record<string, number> = {
  annual: 360,
  semi_annual: 180,
  quarterly: 90,
  bimonthly: 60,
  monthly: 30,
  biweekly: 15,
  daily: 1,
};

function getDaysFromFrequency(freq: string): number {
  return frequencyToDays[freq] ?? 30;
}

function getPeriods(years: number, freq: string): number {
  const days = getDaysFromFrequency(freq);
  return Math.floor((years * 360) / days);
}

function toEffectiveRate({
  rate,
  rateType,
  compoundingFrequency,
  paymentFrequency,
  daysInYear = 360,
  capitalizationDays = 1,
}: {
  rate: number;
  rateType: "nominal" | "effective";
  compoundingFrequency?: string;
  paymentFrequency: string;
  daysInYear?: number;
  capitalizationDays?: number;
}): number {
  if (rateType === "effective") {
    // Convertir a la frecuencia de pago
    const paymentDays = getDaysFromFrequency(paymentFrequency);
    return Math.pow(1 + rate, paymentDays / daysInYear) - 1;
  } else {
    // Nominal a efectiva anual
    const capDays = compoundingFrequency ? getDaysFromFrequency(compoundingFrequency) : capitalizationDays;
    const m = daysInYear / capDays;
    const n = daysInYear / getDaysFromFrequency(paymentFrequency);
    const effAnual = Math.pow(1 + rate / m, m) - 1;
    // Ahora a la frecuencia de pago
    return Math.pow(1 + effAnual, 1 / n) - 1;
  }
}

function getInitialCosts({
  comercialValue,
  structuration = 0,
  colocation = 0,
  flotation = 0,
  cavali = 0,
  structurationApplyTo = "emitter",
  colocationApplyTo = "emitter",
  flotationApplyTo = "both",
  cavaliApplyTo = "both",
}: {
  comercialValue: number;
  structuration?: number;
  colocation?: number;
  flotation?: number;
  cavali?: number;
  structurationApplyTo?: string;
  colocationApplyTo?: string;
  flotationApplyTo?: string;
  cavaliApplyTo?: string;
}) {
  // Emisor
  let emitterPct = 0;
  if (structurationApplyTo === "emitter" || structurationApplyTo === "both") emitterPct += structuration;
  if (colocationApplyTo === "emitter" || colocationApplyTo === "both") emitterPct += colocation;
  if (flotationApplyTo === "emitter" || flotationApplyTo === "both") emitterPct += flotation;
  if (cavaliApplyTo === "emitter" || cavaliApplyTo === "both") emitterPct += cavali;
  
  // Bonista
  let bondholderPct = 0;
  if (structurationApplyTo === "bondholder" || structurationApplyTo === "both") bondholderPct += structuration;
  if (colocationApplyTo === "bondholder" || colocationApplyTo === "both") bondholderPct += colocation;
  if (flotationApplyTo === "bondholder" || flotationApplyTo === "both") bondholderPct += flotation;
  if (cavaliApplyTo === "bondholder" || cavaliApplyTo === "both") bondholderPct += cavali;
  
  return {
    emitter: (emitterPct / 100) * comercialValue,
    bondholder: (bondholderPct / 100) * comercialValue,
  };
}

export function calculateGermanBondSchedule(input: PaymentPlanInput): PaymentRow[] {
  const {
    nominalValue,
    comercialValue,
    annualInterestRate,
    interestRateType,
    compoundingFrequency,
    paymentFrequency,
    years,
    emissionDate,
    gracePeriods = [],
    prima = 0,
    structuration = 0,
    colocation = 0,
    flotation = 0,
    cavali = 0,
    structurationApplyTo = "emitter",
    colocationApplyTo = "emitter",
    flotationApplyTo = "both",
    cavaliApplyTo = "both",
    cok,
    income_tax = 0,
  } = input;

  const daysInYear = 360;
  const capitalizationDays = 1;
  const periods = getPeriods(years, paymentFrequency);
  
  const effRate = toEffectiveRate({
    rate: annualInterestRate,
    rateType: interestRateType,
    compoundingFrequency,
    paymentFrequency,
    daysInYear,
    capitalizationDays,
  });

  const effCok = toEffectiveRate({
    rate: cok,
    rateType: "effective",
    paymentFrequency,
    daysInYear,
  });

  const amortization = nominalValue / periods;

  // Calcular costos iniciales
  const initialCosts = getInitialCosts({
    comercialValue,
    structuration,
    colocation,
    flotation,
    cavali,
    structurationApplyTo,
    colocationApplyTo,
    flotationApplyTo,
    cavaliApplyTo,
  });

  const schedule: PaymentRow[] = [];
  let balance = nominalValue;

  for (let i = 1; i <= periods; i++) {
    // Calcular fecha del período
    const date = new Date(emissionDate);
    const paymentDays = getDaysFromFrequency(paymentFrequency);
    date.setDate(date.getDate() + paymentDays * i);

    const grace = gracePeriods.find(g => g.period === i);
    const graceType = grace?.type ?? "none";

    let coupon = balance * effRate; // Interés
    let amort = 0;
    let installment = 0;

    // Aplicar período de gracia
    if (graceType === "total") {
      coupon = 0;
      amort = 0;
      installment = 0;
    } else if (graceType === "partial") {
      amort = 0;
      installment = coupon;
    } else {
      amort = amortization;
      installment = coupon + amort;
      balance -= amort;
    }

    // Calcular prima (solo en el primer período)
    const premium = i === 1 ? prima : 0;

    // Calcular escudo fiscal (impuesto sobre el interés)
    const shield = coupon * income_tax;

    // Flujo del emisor (cuota + costos iniciales en período 1)
    const emitterFlow = installment + (i === 1 ? initialCosts.emitter + premium : 0);

    // Flujo del emisor con escudo
    const emitterFlowWithShield = emitterFlow - shield;

    // Flujo del bonista (cuota recibida - costos iniciales en período 1 - prima)
    const bondholderFlow = installment - (i === 1 ? initialCosts.bondholder + premium : 0);

    // Factor de actualización
    const discountFactor = Math.pow(1 + effCok, -i);
    
    // Flujo actualizado del bonista
    const actualizedFlow = bondholderFlow * discountFactor;

    // FA por plazo (para duración)
    const faByPeriod = actualizedFlow * i;

    // Factor para convexidad
    const convexityFactor = actualizedFlow * i * (i + 1);

    schedule.push({
      period: i,
      date,
      gracePeriod: graceType,
      bond: round(balance + amort), // Saldo del bono antes de amortización
      coupon: round(coupon),
      installment: round(installment),
      amortization: round(amort),
      premium: round(premium),
      shield: round(shield),
      emitterFlow: round(emitterFlow),
      emitterFlowWithShield: round(emitterFlowWithShield),
      bondholderFlow: round(bondholderFlow),
      actualizedFlow: round(actualizedFlow),
      faByPeriod: round(faByPeriod),
      convexityFactor: round(convexityFactor),
      graceType,
    });
  }

  return schedule;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
