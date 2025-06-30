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

  // --- Datos del bono ---
  bondName: z.string().min(1, "Bond name is required"),
  interestRate: z.coerce.number().min(0, "Interest rate must be a positive number"),
  nominalValue: z.coerce.number().min(0, "Nominal value must be a positive number"),
  comercialValue: z.coerce.number().min(0, "Commercial value must be a positive number"),

  paymentFrequency: z.nativeEnum(PaymentFrequency),
  years: z.coerce.number().min(1, "Years must be a positive number"),
  amortizationMethod: z.nativeEnum(AmortizationMethod),

  emissionDate: z.coerce.date(),

  prima: z.coerce.number().min(0, "Premium must be positive").optional(),
  structuration: z.coerce.number().min(0, "Structuring must be positive").optional(),
  colocation: z.coerce.number().min(0, "Placement must be positive").optional(),
  flotation: z.coerce.number().min(0, "Flotation must be positive").optional(),
  cavali: z.coerce.number().min(0, "CAVALI must be positive").optional(),

  structurationApplyTo: z.nativeEnum(Actor),
  colocationApplyTo: z.nativeEnum(Actor),
  flotationApplyTo: z.nativeEnum(Actor),
  cavaliApplyTo: z.nativeEnum(Actor),

  cok: z.coerce.number().min(0, "COK must be positive"),
  income_tax: z.coerce.number().min(0, "Income tax must be positive").default(0),

  // --- Plazo de gracia ---
  gracePeriod: z.array(z.object({
    period: z.number().min(1, "Period must be at least 1"),
    type: z.nativeEnum(GracePeriodType).default(GracePeriodType.none),
    duration: z.number().min(0, "Grace period duration must be 0 or more").optional(),
  })),
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
