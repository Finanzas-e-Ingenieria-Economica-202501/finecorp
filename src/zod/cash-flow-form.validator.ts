import { z } from "zod";
import {
  AmortizationMethod,
  CompoundingFrequency,
  GracePeriodType,
  InterestRateType,
  PaymentFrequency,
  Actor,
} from "./cash-flow.enums";

export const CashFlowFormValidator = z.object({
  // --- Configuración general ---
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters long"),
  interestRateType: z.nativeEnum(InterestRateType),
  compoundingFrequency: z.nativeEnum(CompoundingFrequency).optional(),
  daysPerYear: z.coerce.number().min(1, "Days per year must be positive").default(360),

  // --- Datos del bono ---
  bondName: z.string().min(1, "Bond name is required"),
  interestRate: z.coerce.number().min(0, "Interest rate must be a positive number"), // Expressed as percentage (e.g., 7.5 for 7.5%)
  nominalValue: z.coerce.number().min(0, "Nominal value must be a positive number"),
  comercialValue: z.coerce.number().min(0, "Commercial value must be a positive number"),

  paymentFrequency: z.nativeEnum(PaymentFrequency),
  years: z.coerce.number().min(1, "Years must be a positive number"),
  amortizationMethod: z.nativeEnum(AmortizationMethod),

  emissionDate: z.coerce.date(),

  // --- Costos (expressed as percentages, e.g., 0.8 for 0.8%) ---
  prima: z.coerce.number().min(0, "Premium must be positive").optional().default(0),
  structuration: z.coerce.number().min(0, "Structuring must be positive").optional().default(0),
  colocation: z.coerce.number().min(0, "Placement must be positive").optional().default(0),
  flotation: z.coerce.number().min(0, "Flotation must be positive").optional().default(0),
  cavali: z.coerce.number().min(0, "CAVALI must be positive").optional().default(0),

  structurationApplyTo: z.nativeEnum(Actor).default(Actor.emitter),
  colocationApplyTo: z.nativeEnum(Actor).default(Actor.emitter),
  flotationApplyTo: z.nativeEnum(Actor).default(Actor.both),
  cavaliApplyTo: z.nativeEnum(Actor).default(Actor.both),

  // COK is effective annual rate by default (expressed as percentage)
  cok: z.coerce.number().min(0, "COK must be positive"),
  // Income tax rate (expressed as percentage, e.g., 30 for 30%)
  income_tax: z.coerce.number().min(0, "Income tax must be positive").default(0),

  // --- Plazo de gracia ---
  gracePeriod: z.array(z.object({
    period: z.number().min(1, "Period must be at least 1"),
    type: z.nativeEnum(GracePeriodType).default(GracePeriodType.none),
    duration: z.number().min(0, "Grace period duration must be 0 or more").optional(),
  })).default([]),
})
// --- Validaciones cruzadas ---
.refine(data => {
  if (data.interestRateType === InterestRateType.nominal) {
    return !!data.compoundingFrequency;
  }
  return true;
}, {
  message: "Compounding frequency is required when interest rate type is nominal",
  path: ["compoundingFrequency"]
})
