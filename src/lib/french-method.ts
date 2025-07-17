import Decimal from 'decimal.js';
import { addDays, addMonths } from 'date-fns';
import { z } from 'zod';
import { CashFlowFormValidator } from '../zod/cash-flow-form.validator';
import { PaymentFrequency, InterestRateType, GracePeriodType, Actor, CompoundingFrequency, AmortizationMethod, ApplyPrimaIn } from '../zod/cash-flow.enums';
import { irr } from 'financial';
import { PaymentPlanInput, PaymentRow, stringToActor, stringToCompoundingFrequency, stringToGracePeriodType, stringToPaymentFrequency } from './german-method';

// Configure Decimal.js for high precision financial calculations
Decimal.set({
  precision: 12,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9
});

export type CashFlowFormData = z.infer<typeof CashFlowFormValidator>;

export interface CashFlowPeriod {
  period: number;
  programmingDate: Date;
  gracePeriodType: string;
  bond: Decimal;
  coupon: Decimal;
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
  couponFrequency: number;
  capitalizationDays: number;
  periodsPerYear: number;
  totalPeriods: number;
  effectiveAnnualCouponRate: Decimal;
  effectivePeriodCouponRate: Decimal;
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

export interface FrenchMethodResult {
  periods: CashFlowPeriod[];
  summary: CalculationSummary;
}

// Helper functions (unchanged)
function getFrequencyDays(frequency: PaymentFrequency): number {
  switch (frequency) {
    case PaymentFrequency.daily: return 1;
    case PaymentFrequency.monthly: return 30;
    case PaymentFrequency.bimonthly: return 60;
    case PaymentFrequency.quarterly: return 120; // 4 meses
    case PaymentFrequency.semi_annual: return 180;
    case PaymentFrequency.annual: return 360;
    default: return 180;
  }
}

function getPeriodsPerYear(frequency: PaymentFrequency, daysPerYear: number = 360): number {
  const frequencyDays = getFrequencyDays(frequency);
  return daysPerYear / frequencyDays;
}

function nominalToEffectiveAnnual(nominalRate: Decimal, compoundingPeriodsPerYear: number): Decimal {
  const rateDecimal = nominalRate.div(100);
  const compoundingRate = rateDecimal.div(compoundingPeriodsPerYear);
  return new Decimal(1).plus(compoundingRate).pow(compoundingPeriodsPerYear).minus(1);
}

function effectiveAnnualToPeriod(effectiveAnnualRate: Decimal, periodsPerYear: number): Decimal {
  return new Decimal(1).plus(effectiveAnnualRate).pow(new Decimal(1).div(periodsPerYear)).minus(1);
}

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

function calculateEffectivePeriodRate(
  interestRate: Decimal,
  interestRateType: InterestRateType,
  compoundingFrequency: CompoundingFrequency | undefined,
  paymentFrequency: PaymentFrequency,
  daysPerYear: number
): Decimal {
  const periodsPerYear = getPeriodsPerYear(paymentFrequency, daysPerYear);
  if (interestRateType === InterestRateType.effective) {
    return effectiveAnnualToPeriod(interestRate.div(100), periodsPerYear);
  } else {
    if (!compoundingFrequency) {
      throw new Error('Compounding frequency is required for nominal rates');
    }
    const compoundingPaymentFreq = compoundingToPaymentFrequency(compoundingFrequency);
    const compoundingPeriodsPerYear = getPeriodsPerYear(compoundingPaymentFreq, daysPerYear);
    const effectiveAnnual = nominalToEffectiveAnnual(interestRate, compoundingPeriodsPerYear);
    return effectiveAnnualToPeriod(effectiveAnnual, periodsPerYear);
  }
}

function generatePaymentDates(
  emissionDate: Date,
  totalPeriods: number,
  paymentFrequency: PaymentFrequency
): Date[] {
  const dates: Date[] = [emissionDate];
  for (let i = 1; i <= totalPeriods; i++) {
    let nextDate: Date;
    switch (paymentFrequency) {
      case PaymentFrequency.daily: nextDate = addDays(emissionDate, i); break;
      case PaymentFrequency.monthly: nextDate = addMonths(emissionDate, i); break;
      case PaymentFrequency.bimonthly: nextDate = addMonths(emissionDate, i * 2); break;
      case PaymentFrequency.quarterly: nextDate = addMonths(emissionDate, i * 3); break;
      case PaymentFrequency.semi_annual: nextDate = addMonths(emissionDate, i * 6); break;
      case PaymentFrequency.annual: nextDate = addMonths(emissionDate, i * 12); break;
      default: nextDate = addMonths(emissionDate, i * 6);
    }
    dates.push(nextDate);
  }
  return dates;
}

function calculateInitialCosts(
  data: CashFlowFormData,
  comercialValue: Decimal
): { emitterCosts: Decimal; bondholderCosts: Decimal } {
  let emitterCosts = new Decimal(0);
  let bondholderCosts = new Decimal(0);
  const structurationCost = comercialValue.mul(data.structuration).div(100);
  const colocationCost = comercialValue.mul(data.colocation).div(100);
  const flotationCost = comercialValue.mul(data.flotation).div(100);
  const cavaliCost = comercialValue.mul(data.cavali).div(100);
  if (data.structurationApplyTo === Actor.emitter || data.structurationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(structurationCost);
  }
  if (data.structurationApplyTo === Actor.bondholder || data.structurationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(structurationCost);
  }
  if (data.colocationApplyTo === Actor.emitter || data.colocationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(colocationCost);
  }
  if (data.colocationApplyTo === Actor.bondholder || data.colocationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(colocationCost);
  }
  if (data.flotationApplyTo === Actor.emitter || data.flotationApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(flotationCost);
  }
  if (data.flotationApplyTo === Actor.bondholder || data.flotationApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(flotationCost);
  }
  if (data.cavaliApplyTo === Actor.emitter || data.cavaliApplyTo === Actor.both) {
    emitterCosts = emitterCosts.plus(cavaliCost);
  }
  if (data.cavaliApplyTo === Actor.bondholder || data.cavaliApplyTo === Actor.both) {
    bondholderCosts = bondholderCosts.plus(cavaliCost);
  }
  return { emitterCosts, bondholderCosts };
}

/**
 * Main French method calculation function
 */
export function calculateFrenchMethod(data: CashFlowFormData): FrenchMethodResult {
  // Convert input data to Decimal for precision
  const comercialValue = new Decimal(data.comercialValue);
  const interestRate = new Decimal(data.interestRate);
  const cok = new Decimal(data.cok);
  const incomeTax = new Decimal(data.income_tax);
  const prima = new Decimal(data.prima || 0);

  // Forzar frecuencia de pago a cuatrimestral (4 meses)
  const forcedPaymentFrequency = PaymentFrequency.quarterly;
  const periodsPerYear = getPeriodsPerYear(forcedPaymentFrequency, data.daysPerYear);
  const totalPeriods = new Decimal(data.years).mul(periodsPerYear).toNumber();
  const frequencyDays = getFrequencyDays(forcedPaymentFrequency);

  // Calcular tasa efectiva del periodo usando la frecuencia forzada
  const effectivePeriodRate = calculateEffectivePeriodRate(
    interestRate,
    data.interestRateType,
    data.compoundingFrequency,
    forcedPaymentFrequency,
    data.daysPerYear
  );

  // Convert COK to period rate
  const periodCOK = effectiveAnnualToPeriod(cok.div(100), periodsPerYear);

  // Calculate effective annual rate for display
  const effectiveAnnualRate = new Decimal(1).plus(effectivePeriodRate).pow(periodsPerYear).minus(1);

  // Generar fechas de pago usando la frecuencia forzada
  const paymentDates = generatePaymentDates(data.emissionDate, totalPeriods, forcedPaymentFrequency);

  // Count non-grace periods for French method amortization
  let nonGracePeriods = totalPeriods;
  const gracePeriodMap = new Map<number, string>();
  data.gracePeriod.forEach(gp => {
    if (gp.type === GracePeriodType.total || gp.type === GracePeriodType.partial) {
      nonGracePeriods--;
      gracePeriodMap.set(gp.period, gp.type === GracePeriodType.total ? 'T' : 'P');
    } else {
      gracePeriodMap.set(gp.period, 'S');
    }
  });
  for (let i = 1; i <= totalPeriods; i++) {
    if (!gracePeriodMap.has(i)) {
      gracePeriodMap.set(i, 'S');
    }
  }

  // Calculate constant quota for non-grace periods using annuity formula
  let constantQuota = new Decimal(0);
  if (nonGracePeriods > 0) {
    const rate = effectivePeriodRate;
    const n = nonGracePeriods;
    constantQuota = comercialValue
      .mul(rate)
      .mul(new Decimal(1).plus(rate).pow(n))
      .div(new Decimal(1).plus(rate).pow(n).minus(1));
  }

  // Calculate periods
  const periods: CashFlowPeriod[] = [];
  let remainingBond = comercialValue;

  // Period 0 (emission)
  const initialCosts = calculateInitialCosts(data, comercialValue);
  const emitterPeriod0Flow = comercialValue.minus(initialCosts.emitterCosts);
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
    emitterFlowWithShield: emitterPeriod0Flow,
    bondholderFlow: bondholderPeriod0Flow,
    actualFlow: new Decimal(0),
    faXTerm: new Decimal(0),
    convexityFactor: new Decimal(0)
  });

  // Premium calculation
  let premiumBase = new Decimal(0);
  if (data.applyPrimaIn === ApplyPrimaIn.beginning) {
    premiumBase = comercialValue;
  }
  let lastPeriodInitialBond = new Decimal(0);

  // Calculate remaining periods
  for (let i = 1; i <= totalPeriods; i++) {
    const gracePeriodType = gracePeriodMap.get(i) || 'S';
    const isTotalGrace = gracePeriodType === 'T';
    const isPartialGrace = gracePeriodType === 'P';

    // Save initial bond for the last period
    if (i === totalPeriods) {
      lastPeriodInitialBond = remainingBond;
    }

    // Calculate interest (coupon) on remaining bond
    const coupon = remainingBond.mul(effectivePeriodRate);

    // Calculate quota and amortization
    let quota = new Decimal(0);
    let amortization = new Decimal(0);
    if (isTotalGrace) {
      // Total grace: no payment
      quota = new Decimal(0);
      amortization = new Decimal(0);
    } else if (isPartialGrace) {
      // Partial grace: pay only interest
      quota = coupon;
      amortization = new Decimal(0);
    } else {
      // Standard period: constant quota
      quota = constantQuota;
      amortization = quota.minus(coupon);
    }

    // Calculate premium (only in the last period)
    let premiumAmount = new Decimal(0);
    if (i === totalPeriods) {
      if (data.applyPrimaIn === ApplyPrimaIn.end) {
        premiumBase = lastPeriodInitialBond;
      }
      premiumAmount = premiumBase.mul(prima).div(100);
    }

    // Calculate shield
    const shield = coupon.mul(incomeTax).div(100);

    // Calculate flows
    const emitterFlow = quota.plus(premiumAmount);
    const emitterFlowWithShield = emitterFlow.minus(shield);
    const bondholderFlow = quota.plus(premiumAmount);

    // Discount factor for present value
    const discountFactor = new Decimal(1).plus(periodCOK).pow(i);
    const actualFlow = bondholderFlow.div(discountFactor);

    // FA x Plazo
    const periodDaysRatio = new Decimal(frequencyDays).div(data.daysPerYear);
    const faXTerm = actualFlow.mul(i).mul(periodDaysRatio);

    // Convexity factor
    const convexityFactor = actualFlow.mul(i).mul(i + 1);

    periods.push({
      period: i,
      programmingDate: paymentDates[i],
      gracePeriodType,
      bond: remainingBond,
      coupon: coupon.negated(),
      quota: quota.negated(),
      amortization: amortization.negated(),
      premium: premiumAmount.negated(),
      shield,
      emitterFlow: emitterFlow.negated(),
      emitterFlowWithShield: emitterFlowWithShield.negated(),
      bondholderFlow,
      actualFlow,
      faXTerm,
      convexityFactor
    });

    // Update remaining bond
    remainingBond = remainingBond.minus(amortization);
  }

  // Calculate summary metrics
  const totalActualFlow = periods.slice(1).reduce((sum, p) => sum.plus(p.actualFlow), new Decimal(0));
  const totalFAXTerm = periods.slice(1).reduce((sum, p) => sum.plus(p.faXTerm), new Decimal(0));
  const totalConvexityFactor = periods.slice(1).reduce((sum, p) => sum.plus(p.convexityFactor), new Decimal(0));

  const actualPrice = periods.slice(1).reduce((sum, p) => {
    const discountFactor = new Decimal(1).plus(periodCOK).pow(p.period);
    return sum.plus(p.bondholderFlow.div(discountFactor));
  }, new Decimal(0));

  const bondholderFlowPeriod0 = periods[0].bondholderFlow;
  const utility = bondholderFlowPeriod0.plus(actualPrice);

  const duration = totalFAXTerm.div(totalActualFlow);

  const frequencyAdjustment = new Decimal(data.daysPerYear).div(frequencyDays);
  const convexityDenominator = new Decimal(1).plus(periodCOK).pow(2)
    .mul(totalActualFlow)
    .mul(frequencyAdjustment.pow(2));
  const convexity = totalConvexityFactor.div(convexityDenominator);

  const modifiedDuration = duration.div(new Decimal(1).plus(periodCOK));

  // Calculate TCEA and TREA
  const emitterFlows = periods.map(p => p.emitterFlow.toNumber());
  const emitterFlowsWithShield = periods.map(p => p.emitterFlowWithShield.toNumber());
  const bondholderFlows = periods.map(p => p.bondholderFlow.toNumber());

  let emitterTCEA: Decimal;
  let emitterTCEAWithShield: Decimal;
  let bondholderTREA: Decimal;

  try {
    const emitterIRRPeriod = irr(emitterFlows);
    emitterTCEA = new Decimal(1).plus(emitterIRRPeriod).pow(periodsPerYear).minus(1).mul(100);
    const emitterIRRWithShieldPeriod = irr(emitterFlowsWithShield);
    emitterTCEAWithShield = new Decimal(1).plus(emitterIRRWithShieldPeriod).pow(periodsPerYear).minus(1).mul(100);
    const bondholderIRRPeriod = irr(bondholderFlows);
    bondholderTREA = new Decimal(1).plus(bondholderIRRPeriod).pow(periodsPerYear).minus(1).mul(100);
  } catch {
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
export function testFrenchMethod(): FrenchMethodResult {
  const testData: CashFlowFormData = {
    currency: "USD",
    interestRateType: InterestRateType.nominal,
    compoundingFrequency: CompoundingFrequency.daily,
    daysPerYear: 360,
    bondName: "Test Bond",
    interestRate: 7.5,
    nominalValue: 1000,
    comercialValue: 1000,
    paymentFrequency: PaymentFrequency.semi_annual,
    years: 3,
    amortizationMethod: AmortizationMethod.french,
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
    cok: 2.436,
    income_tax: 30,
    gracePeriod: [
      { period: 1, type: GracePeriodType.partial, duration: 0 },
      { period: 2, type: GracePeriodType.partial, duration: 0 }
    ],
    applyPrimaIn: ApplyPrimaIn.beginning,
  };

  return calculateFrenchMethod(testData);
}

/**
 * Modified calculateGermanBondSchedule to use French method
 */
export function calculateFrenchBondSchedule(input: PaymentPlanInput): PaymentRow[] {
  // Convert input to CashFlowFormData format
  const formData: CashFlowFormData = {
    currency: "USD",
    interestRateType: input.interestRateType === "nominal" ? InterestRateType.nominal : InterestRateType.effective,
    compoundingFrequency: stringToCompoundingFrequency(input.compoundingFrequency),
    daysPerYear: 360,
    bondName: "Bond",
    interestRate: input.annualInterestRate,
    nominalValue: input.nominalValue,
    comercialValue: input.comercialValue,
    paymentFrequency: stringToPaymentFrequency(input.paymentFrequency),
    years: input.years,
    amortizationMethod: AmortizationMethod.french,
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

  // Calculate using the French method
  const result = calculateFrenchMethod(formData);

  // Premium calculation
  let premiumBase = 0;
  if (formData.applyPrimaIn === ApplyPrimaIn.beginning) {
    premiumBase = Number(result.periods[0]?.bond ?? 0);
  } else {
    premiumBase = Number(result.periods[result.periods.length - 1]?.bond ?? 0);
  }
  const premiumAmount = (formData.prima || 0) * premiumBase / 100;

  // Convert to PaymentRow format
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