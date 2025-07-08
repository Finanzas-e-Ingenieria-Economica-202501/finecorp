import Decimal from 'decimal.js';
import { addDays, addMonths } from 'date-fns';
import { z } from 'zod';
import { CashFlowFormValidator } from '../zod/cash-flow-form.validator';
import { PaymentFrequency, InterestRateType, GracePeriodType, Actor, CompoundingFrequency, AmortizationMethod, ApplyPrimaIn } from '../zod/cash-flow.enums';
import {irr} from "financial"
// Configure Decimal.js for high precision financial calculations (up to 9 decimal places)
Decimal.set({ 
  precision: 12, // High internal precision for calculations
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9, // Show up to 9 decimal places
  toExpPos: 9
});

export type CashFlowFormData = z.infer<typeof CashFlowFormValidator>;

export interface CashFlowPeriod {
  period: number;
  programmingDate: Date;
  gracePeriodType: string;
  bond: Decimal;
  coupon: Decimal; // Interest
  quota: Decimal;
  amortization: Decimal;
  premium: Decimal;
  shield: Decimal;
  emitterFlow: Decimal;
  emitterFlowWithShield: Decimal;
  bondholderFlow: Decimal;
  actualFlow: Decimal;
  faXTerm: Decimal;
  convexityFactor: Decimal;
}

export interface CalculationSummary {
  couponFrequency: number; // Days
  capitalizationDays: number;
  periodsPerYear: number;
  totalPeriods: number;
  effectiveAnnualCouponRate: Decimal; // TEA
  effectivePeriodCouponRate: Decimal; // Period rate
  periodCOK: Decimal;
  initialEmitterCosts: Decimal;
  initialBondholderCosts: Decimal;
  actualPrice: Decimal;
  utility: Decimal;
  duration: Decimal;
  convexity: Decimal;
  total: Decimal;
  modifiedDuration: Decimal;
  emitterTCEA: Decimal;
  emitterTCEAWithShield: Decimal;
  bondholderTREA: Decimal;
}

export interface GermanMethodResult {
  periods: CashFlowPeriod[];
  summary: CalculationSummary;
}

/**
 * Converts payment frequency to number of days
 */
function getFrequencyDays(frequency: PaymentFrequency): number {
  switch (frequency) {
    case PaymentFrequency.daily: return 1;
    case PaymentFrequency.monthly: return 30;
    case PaymentFrequency.bimonthly: return 60;
    case PaymentFrequency.quarterly: return 90;
    case PaymentFrequency.semi_annual: return 180;
    case PaymentFrequency.annual: return 360;
    default: return 180; // Default to semi-annual
  }
}

/**
 * Converts payment frequency to periods per year
 */
function getPeriodsPerYear(frequency: PaymentFrequency, daysPerYear: number = 360): number {
  const frequencyDays = getFrequencyDays(frequency);
  return daysPerYear / frequencyDays;
}

/**
 * Converts nominal rate to effective annual rate
 */
function nominalToEffectiveAnnual(
  nominalRate: Decimal, 
  compoundingPeriodsPerYear: number
): Decimal {
  const rateDecimal = nominalRate.div(100);
  const compoundingRate = rateDecimal.div(compoundingPeriodsPerYear);
  return new Decimal(1).plus(compoundingRate).pow(compoundingPeriodsPerYear).minus(1);
}

/**
 * Converts effective annual rate to effective period rate
 */
function effectiveAnnualToPeriod(
  effectiveAnnualRate: Decimal, 
  periodsPerYear: number
): Decimal {
  return new Decimal(1).plus(effectiveAnnualRate).pow(new Decimal(1).div(periodsPerYear)).minus(1);
}

/**
 * Converts CompoundingFrequency to PaymentFrequency for calculation purposes
 */
function compoundingToPaymentFrequency(compoundingFreq: CompoundingFrequency): PaymentFrequency {
  switch (compoundingFreq) {
    case CompoundingFrequency.annual: return PaymentFrequency.annual;
    case CompoundingFrequency.semi_annual: return PaymentFrequency.semi_annual;
    case CompoundingFrequency.quarterly: return PaymentFrequency.quarterly;
    case CompoundingFrequency.bimonthly: return PaymentFrequency.bimonthly;
    case CompoundingFrequency.monthly: return PaymentFrequency.monthly;
    case CompoundingFrequency.daily: return PaymentFrequency.daily;
    default: return PaymentFrequency.daily;
  }
}

/**
 * Calculates the effective period rate from the input data
 */
function calculateEffectivePeriodRate(
  interestRate: Decimal,
  interestRateType: InterestRateType,
  compoundingFrequency: CompoundingFrequency | undefined,
  paymentFrequency: PaymentFrequency,
  daysPerYear: number
): Decimal {
  const periodsPerYear = getPeriodsPerYear(paymentFrequency, daysPerYear);
  
  if (interestRateType === InterestRateType.effective) {
    // Convert effective annual to effective period
    return effectiveAnnualToPeriod(interestRate.div(100), periodsPerYear);
  } else {
    // Nominal rate: first convert to effective annual, then to period
    if (!compoundingFrequency) {
      throw new Error('Compounding frequency is required for nominal rates');
    }
    
    const compoundingPaymentFreq = compoundingToPaymentFrequency(compoundingFrequency);
    const compoundingPeriodsPerYear = getPeriodsPerYear(compoundingPaymentFreq, daysPerYear);
    const effectiveAnnual = nominalToEffectiveAnnual(interestRate, compoundingPeriodsPerYear);
    return effectiveAnnualToPeriod(effectiveAnnual, periodsPerYear);
  }
}

/**
 * Generates payment dates based on emission date and frequency
 */
function generatePaymentDates(
  emissionDate: Date,
  totalPeriods: number,
  paymentFrequency: PaymentFrequency
): Date[] {
  const dates: Date[] = [emissionDate]; // Period 0
  
  for (let i = 1; i <= totalPeriods; i++) {
    let nextDate: Date;
    
    switch (paymentFrequency) {
      case PaymentFrequency.daily:
        nextDate = addDays(emissionDate, i);
        break;
      case PaymentFrequency.monthly:
        nextDate = addMonths(emissionDate, i);
        break;
      case PaymentFrequency.bimonthly:
        nextDate = addMonths(emissionDate, i * 2);
        break;
      case PaymentFrequency.quarterly:
        nextDate = addMonths(emissionDate, i * 3);
        break;
      case PaymentFrequency.semi_annual:
        nextDate = addMonths(emissionDate, i * 6);
        break;
      case PaymentFrequency.annual:
        nextDate = addMonths(emissionDate, i * 12);
        break;
      default:
        nextDate = addMonths(emissionDate, i * 6);
    }
    
    dates.push(nextDate);
  }
  
  return dates;
}

/**
 * Calculates initial costs for emitter and bondholder
 */
function calculateInitialCosts(
  data: CashFlowFormData,
  comercialValue: Decimal
): { emitterCosts: Decimal; bondholderCosts: Decimal } {
  let emitterCosts = new Decimal(0);
  let bondholderCosts = new Decimal(0);
  
  // Calculate costs based on who they apply to
  const structurationCost = comercialValue.mul(data.structuration).div(100);
  const colocationCost = comercialValue.mul(data.colocation).div(100);
  const flotationCost = comercialValue.mul(data.flotation).div(100);
  const cavaliCost = comercialValue.mul(data.cavali).div(100);
  
  // Apply structuration costs
  if (data.structurationApplyTo === Actor.emitter || data.structurationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(structurationCost);
  }
  if (data.structurationApplyTo === Actor.bondholder || data.structurationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(structurationCost);
  }
  
  // Apply colocation costs
  if (data.colocationApplyTo === Actor.emitter || data.colocationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(colocationCost);
  }
  if (data.colocationApplyTo === Actor.bondholder || data.colocationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(colocationCost);
  }
  
  // Apply flotation costs
  if (data.flotationApplyTo === Actor.emitter || data.flotationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(flotationCost);
  }
  if (data.flotationApplyTo === Actor.bondholder || data.flotationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(flotationCost);
  }
  
  // Apply CAVALI costs
  if (data.cavaliApplyTo === Actor.emitter || data.cavaliApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(cavaliCost);
  }
  if (data.cavaliApplyTo === Actor.bondholder || data.cavaliApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(cavaliCost);
  }
  
  return { emitterCosts, bondholderCosts };
}

/**
 * Main German method calculation function
 */
export function calculateGermanMethod(data: CashFlowFormData): GermanMethodResult {
  // Convert input data to Decimal for precision
  const comercialValue = new Decimal(data.comercialValue);
  const interestRate = new Decimal(data.interestRate);
  const cok = new Decimal(data.cok);
  const incomeTax = new Decimal(data.income_tax);
  const prima = new Decimal(data.prima || 0);
  
  // Calculate basic parameters
  const periodsPerYear = getPeriodsPerYear(data.paymentFrequency, data.daysPerYear);
  const totalPeriods = new Decimal(data.years).mul(periodsPerYear).toNumber();
  const frequencyDays = getFrequencyDays(data.paymentFrequency);
  
  // Calculate effective period rates
  const effectivePeriodRate = calculateEffectivePeriodRate(
    interestRate,
    data.interestRateType,
    data.compoundingFrequency,
    data.paymentFrequency,
    data.daysPerYear
  );
  
  // Convert COK to period rate (COK is effective annual by default)
  const periodCOK = effectiveAnnualToPeriod(cok.div(100), periodsPerYear);
  
  // Calculate effective annual rate for display
  const effectiveAnnualRate = new Decimal(1).plus(effectivePeriodRate).pow(periodsPerYear).minus(1);
  
  // Generate payment dates
  const paymentDates = generatePaymentDates(data.emissionDate, totalPeriods, data.paymentFrequency);
  
  // Count non-grace periods for German method amortization
  let nonGracePeriods = totalPeriods;
  const gracePeriodMap = new Map<number, string>();
  
  // Process grace periods - ANY grace period (partial or total) has NO amortization
  data.gracePeriod.forEach(gp => {
    if (gp.type === GracePeriodType.total) {
      nonGracePeriods--;
      gracePeriodMap.set(gp.period, 'T'); // Total grace (no amortization, no interest payment)
    } else if (gp.type === GracePeriodType.partial) {
      nonGracePeriods--;
      gracePeriodMap.set(gp.period, 'P'); // Partial grace (no amortization, but pays interest)
    } else {
      gracePeriodMap.set(gp.period, 'S'); // Standard period
    }
  });
  
  // Fill remaining periods as standard
  for (let i = 1; i <= totalPeriods; i++) {
    if (!gracePeriodMap.has(i)) {
      gracePeriodMap.set(i, 'S');
    }
  }
  
  // German method: constant amortization
  const constantAmortization = nonGracePeriods > 0 ? comercialValue.div(nonGracePeriods) : new Decimal(0);
  
  // Calculate periods
  const periods: CashFlowPeriod[] = [];
  let remainingBond = comercialValue;
  
  // Period 0 (emission)
  const initialCosts = calculateInitialCosts(data, comercialValue);
  
  // Emitter receives commercial value but pays their initial costs
  const emitterPeriod0Flow = comercialValue.minus(initialCosts.emitterCosts);
  
  // Bondholder pays commercial value plus their initial costs
  const bondholderPeriod0Flow = comercialValue.plus(initialCosts.bondholderCosts).negated();
  
  periods.push({
    period: 0,
    programmingDate: paymentDates[0],
    gracePeriodType: '',
    bond: new Decimal(0),
    coupon: new Decimal(0),
    quota: new Decimal(0),
    amortization: new Decimal(0),
    premium: new Decimal(0),
    shield: new Decimal(0),
    emitterFlow: emitterPeriod0Flow,
    emitterFlowWithShield: emitterPeriod0Flow, // No shield in period 0
    bondholderFlow: bondholderPeriod0Flow,
    actualFlow: new Decimal(0),
    faXTerm: new Decimal(0),
    convexityFactor: new Decimal(0)
  });
  
  // --- Calcular prima según applyPrimaIn ---
  let premiumBase = new Decimal(0);
  if (data.applyPrimaIn === ApplyPrimaIn.beginning) {
    premiumBase = comercialValue;
  }
  let lastPeriodInitialBond = new Decimal(0);
  
  // Calculate remaining periods
  for (let i = 1; i <= totalPeriods; i++) {
    const gracePeriodType = gracePeriodMap.get(i) || 'S';
    const hasGracePeriod = gracePeriodType === 'T' || gracePeriodType === 'P'; // Any grace period has no amortization
    
    // Guardar el saldo inicial del último periodo
    if (i === totalPeriods) {
      lastPeriodInitialBond = remainingBond;
    }
    
    // Calculate interest (coupon) on remaining bond
    const coupon = remainingBond.mul(effectivePeriodRate);
    
    // Calculate amortization (0 for ANY grace period - partial or total)
    const amortization = hasGracePeriod ? new Decimal(0) : constantAmortization;
    
    // Calculate quota (coupon + amortization)
    const quota = coupon.plus(amortization);
    
    // Calcular premium (solo en el último periodo, base según applyPrimaIn)
    let premiumAmount = new Decimal(0);
    if (i === totalPeriods) {
      if (data.applyPrimaIn === ApplyPrimaIn.end) {
        premiumBase = lastPeriodInitialBond;
      }
      premiumAmount = premiumBase.mul(prima).div(100);
    }
    
    // Calculate shield (tax benefit)
    const shield = coupon.mul(incomeTax).div(100);
    
    // Calculate flows
    const emitterFlow = quota.plus(premiumAmount);
    const emitterFlowWithShield = emitterFlow.minus(shield);
    const bondholderFlow = quota.plus(premiumAmount); // Bondholder receives quota + premium (positive version of emitter flow)
    
    // Discount factor for present value calculations
    const discountFactor = new Decimal(1).plus(periodCOK).pow(i);
    const actualFlow = bondholderFlow.div(discountFactor);
    
    // FA x Plazo = Flujo Actual × Nº Período × (Días del período / Días del año)
    const periodDaysRatio = new Decimal(frequencyDays).div(data.daysPerYear);
    const faXTerm = actualFlow.mul(i).mul(periodDaysRatio);
    
    // Factor p/Convexidad = Flujo Actual × Nº Período × (1 + Nº Período)
    const convexityFactor = actualFlow.mul(i).mul(i + 1);
    
    periods.push({
      period: i,
      programmingDate: paymentDates[i],
      gracePeriodType,
      bond: remainingBond,
      coupon: coupon.negated(), // Negative because it's an outflow for emitter
      quota: quota.negated(), // Negative because it's an outflow for emitter
      amortization: amortization.negated(), // Negative because it's an outflow for emitter
      premium: premiumAmount.negated(), // Negative because it's an outflow for emitter
      shield,
      emitterFlow: emitterFlow.negated(), // Negative because it's an outflow
      emitterFlowWithShield: emitterFlowWithShield.negated(), // Negative because it's an outflow
      bondholderFlow,
      actualFlow,
      faXTerm,
      convexityFactor
    });
    
    // Guardar el saldo del bono del último periodo
    if (i === totalPeriods) {
      lastPeriodInitialBond = remainingBond;
    }
    
    // Update remaining bond (only reduce for periods that actually amortize)
    if (!hasGracePeriod) {
      remainingBond = remainingBond.minus(amortization);
    }
  }
  
  // Calculate summary metrics
  const totalActualFlow = periods.slice(1).reduce((sum, p) => sum.plus(p.actualFlow), new Decimal(0));
  const totalFAXTerm = periods.slice(1).reduce((sum, p) => sum.plus(p.faXTerm), new Decimal(0));
  const totalConvexityFactor = periods.slice(1).reduce((sum, p) => sum.plus(p.convexityFactor), new Decimal(0));
  
  // Precio Actual = NPV(COK, flujos bonista períodos 1+ sin incluir período 0)
  // Calculate manually: sum of (bondholderFlow / (1+COK)^period) for periods 1+
  const actualPrice = periods.slice(1).reduce((sum, p) => {
    const discountFactor = new Decimal(1).plus(periodCOK).pow(p.period);
    return sum.plus(p.bondholderFlow.div(discountFactor));
  }, new Decimal(0));
  
  // VAN (Utilidad/Pérdida) = Flujo del bonista período 0 + Precio Actual
  const bondholderFlowPeriod0 = periods[0].bondholderFlow;
  const utility = bondholderFlowPeriod0.plus(actualPrice);
  
  const duration = totalFAXTerm.div(totalActualFlow); // Use totalActualFlow for duration calculation
  
  // Convexity = suma(factor p/convexidad) / ((1+cok)^2 × suma(flujo actual) × (días del año / frecuencia del cupón)^2)
  const frequencyAdjustment = new Decimal(data.daysPerYear).div(frequencyDays);
  const convexityDenominator = new Decimal(1).plus(periodCOK).pow(2)
    .mul(totalActualFlow)
    .mul(frequencyAdjustment.pow(2));
  const convexity = totalConvexityFactor.div(convexityDenominator);
  
  const modifiedDuration = duration.div(new Decimal(1).plus(periodCOK));
  
  // Calculate TCEA and TREA using IRR from financial library
  const emitterFlows = periods.map(p => p.emitterFlow.toNumber());
  const emitterFlowsWithShield = periods.map(p => p.emitterFlowWithShield.toNumber());
  const bondholderFlows = periods.map(p => p.bondholderFlow.toNumber());
  
  let emitterTCEA: Decimal;
  let emitterTCEAWithShield: Decimal;
  let bondholderTREA: Decimal;
  
  try {
    // Calculate IRR for emitter (period rate)
    const emitterIRRPeriod = irr(emitterFlows);
    emitterTCEA = new Decimal(1).plus(emitterIRRPeriod).pow(periodsPerYear).minus(1).mul(100);
    
    // Calculate IRR for emitter with shield (period rate)
    const emitterIRRWithShieldPeriod = irr(emitterFlowsWithShield);
    emitterTCEAWithShield = new Decimal(1).plus(emitterIRRWithShieldPeriod).pow(periodsPerYear).minus(1).mul(100);
    
    // Calculate IRR for bondholder (period rate)
    const bondholderIRRPeriod = irr(bondholderFlows);
    bondholderTREA = new Decimal(1).plus(bondholderIRRPeriod).pow(periodsPerYear).minus(1).mul(100);
  } catch {
    // Fallback to simplified calculation if IRR fails
    emitterTCEA = effectiveAnnualRate.mul(100);
    emitterTCEAWithShield = effectiveAnnualRate.mul(100).mul(new Decimal(1).minus(incomeTax.div(100)));
    bondholderTREA = effectiveAnnualRate.mul(100);
  }
  
  const summary: CalculationSummary = {
    couponFrequency: frequencyDays,
    capitalizationDays: 1,
    periodsPerYear,
    totalPeriods,
    effectiveAnnualCouponRate: effectiveAnnualRate.mul(100),
    effectivePeriodCouponRate: effectivePeriodRate.mul(100),
    periodCOK: periodCOK.mul(100),
    initialEmitterCosts: initialCosts.emitterCosts,
    initialBondholderCosts: initialCosts.bondholderCosts,
    actualPrice,
    utility,
    duration,
    convexity,
    total: duration.plus(convexity),
    modifiedDuration,
    emitterTCEA,
    emitterTCEAWithShield,
    bondholderTREA
  };
  
  return { periods, summary };
}

/**
 * Test function with the provided data
 */
export function testGermanMethod(): GermanMethodResult {
  const testData: CashFlowFormData = {
    currency: "USD",
    interestRateType: InterestRateType.nominal,
    compoundingFrequency: CompoundingFrequency.daily,
    daysPerYear: 360,
    bondName: "Test Bond",
    interestRate: 7.5, // 7.5% nominal annual daily
    nominalValue: 1000,
    comercialValue: 1000,
    paymentFrequency: PaymentFrequency.semi_annual,
    years: 3,
    amortizationMethod: AmortizationMethod.german,
    emissionDate: new Date('2022-07-01'),
    prima: 0.8,
    structuration: 0.9,
    colocation: 0.95,
    flotation: 0.3,
    cavali: 0.45,
    structurationApplyTo: Actor.emitter,
    colocationApplyTo: Actor.emitter,
    flotationApplyTo: Actor.both,
    cavaliApplyTo: Actor.both,
    cok: 2.436, // 2.436% effective annual
    income_tax: 30,
    gracePeriod: [
      { period: 1, type: GracePeriodType.partial, duration: 0 },
      { period: 2, type: GracePeriodType.partial, duration: 0 }
    ],
    applyPrimaIn: ApplyPrimaIn.beginning,
  };
  
  return calculateGermanMethod(testData);
}
