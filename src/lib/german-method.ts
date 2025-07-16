import { calculateGermanMethod, CashFlowFormData } from './german-method-calculator';
import { 
  InterestRateType, 
  PaymentFrequency, 
  CompoundingFrequency, 
  AmortizationMethod, 
  Actor, 
  GracePeriodType as EnumGracePeriodType, 
  ApplyPrimaIn 
} from '../zod/cash-flow.enums';

export type GracePeriodType = "none" | "partial" | "total";

export interface GracePeriod {
  period: number; // 1-based index
  type: GracePeriodType;
  duration?: number; // no usado directamente, opcional
}

export interface PaymentRow {
  period: number;
  date: Date;
  gracePeriod: string;
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
  applyPrimaIn?: ApplyPrimaIn;
}

/**
 * Converts string frequency to enum
 */
export function stringToPaymentFrequency(frequency: string): PaymentFrequency {
  switch (frequency) {
    case 'daily': return PaymentFrequency.daily;
    case 'monthly': return PaymentFrequency.monthly;
    case 'bimonthly': return PaymentFrequency.bimonthly;
    case 'quarterly': return PaymentFrequency.quarterly;
    case 'semi_annual': return PaymentFrequency.semi_annual;
    case 'annual': return PaymentFrequency.annual;
    default: return PaymentFrequency.semi_annual;
  }
}

/**
 * Converts string frequency to compounding frequency enum
 */
export function stringToCompoundingFrequency(frequency?: string): CompoundingFrequency | undefined {
  if (!frequency) return undefined;
  switch (frequency) {
    case 'daily': return CompoundingFrequency.daily;
    case 'monthly': return CompoundingFrequency.monthly;
    case 'bimonthly': return CompoundingFrequency.bimonthly;
    case 'quarterly': return CompoundingFrequency.quarterly;
    case 'semi_annual': return CompoundingFrequency.semi_annual;
    case 'annual': return CompoundingFrequency.annual;
    default: return CompoundingFrequency.daily;
  }
}

/**
 * Converts string actor to enum
 */
export function stringToActor(actor?: string): Actor {
  switch (actor) {
    case 'emitter': return Actor.emitter;
    case 'bondholder': return Actor.bondholder;
    case 'both': return Actor.both;
    default: return Actor.emitter;
  }
}

/**
 * Converts string grace period type to enum
 */
export function stringToGracePeriodType(type: string): EnumGracePeriodType {
  switch (type) {
    case 'none': return EnumGracePeriodType.none;
    case 'partial': return EnumGracePeriodType.partial;
    case 'total': return EnumGracePeriodType.total;
    default: return EnumGracePeriodType.none;
  }
}

/**
 * Main function to calculate German bond schedule
 */
export function calculateGermanBondSchedule(input: PaymentPlanInput): PaymentRow[] {
  // Convert input to CashFlowFormData format
  const formData: CashFlowFormData = {
    currency: "USD", // Default, could be parameterized
    interestRateType: input.interestRateType === "nominal" ? InterestRateType.nominal : InterestRateType.effective,
    compoundingFrequency: stringToCompoundingFrequency(input.compoundingFrequency),
    daysPerYear: 360, // Default
    bondName: "Bond", // Default
    interestRate: input.annualInterestRate,
    nominalValue: input.nominalValue,
    comercialValue: input.comercialValue,
    paymentFrequency: stringToPaymentFrequency(input.paymentFrequency),
    years: input.years,
    amortizationMethod: AmortizationMethod.german,
    emissionDate: input.emissionDate,
    prima: input.prima || 0,
    structuration: input.structuration || 0,
    colocation: input.colocation || 0,
    flotation: input.flotation || 0,
    cavali: input.cavali || 0,
    structurationApplyTo: stringToActor(input.structurationApplyTo),
    colocationApplyTo: stringToActor(input.colocationApplyTo),
    flotationApplyTo: stringToActor(input.flotationApplyTo),
    cavaliApplyTo: stringToActor(input.cavaliApplyTo),
    cok: input.cok,
    income_tax: input.income_tax || 0,
    gracePeriod: (input.gracePeriods || []).map(gp => ({
      period: gp.period,
      type: stringToGracePeriodType(gp.type),
      duration: gp.duration
    })),
    applyPrimaIn: input.applyPrimaIn || ApplyPrimaIn.end,
  };

  // Calculate using the German method
  const result = calculateGermanMethod(formData);

  // --- Prima calculation logic ---
  // Determine the base for the premium (prima)
  let premiumBase = 0;
  if (formData.applyPrimaIn === ApplyPrimaIn.beginning) {
    // Use the initial bond value (first period saldo)
    premiumBase = Number(result.periods[0]?.bond ?? 0);
  } else {
    // Use the last bond value (last period saldo)
    premiumBase = Number(result.periods[result.periods.length - 1]?.bond ?? 0);
  }
  const premiumAmount = (formData.prima || 0) * premiumBase / 100;

  // Assign premium only to the last period
  const paymentRows = result.periods.map((period, idx) => {
    const isLast = idx === result.periods.length - 1;
    return {
      period: period.period,
      date: period.programmingDate,
      gracePeriod: period.gracePeriodType || '',
      bond: Number(period.bond.toString()),
      coupon: Number(period.coupon.toString()),
      installment: Number(period.quota.toString()),
      amortization: Number(period.amortization.toString()),
      premium: isLast ? premiumAmount : 0,
      shield: Number(period.shield.toString()),
      emitterFlow: Number(period.emitterFlow.toString()),
      emitterFlowWithShield: Number(period.emitterFlowWithShield.toString()),
      bondholderFlow: Number(period.bondholderFlow.toString()),
      actualizedFlow: Number(period.actualFlow.toString()),
      faByPeriod: Number(period.faXTerm.toString()),
      convexityFactor: Number(period.convexityFactor.toString())
    };
  });

  return paymentRows;
}
