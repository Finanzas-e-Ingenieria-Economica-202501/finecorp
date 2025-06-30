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
  numberOfPeriods: z.coerce.number().min(1, "Number of periods must be a positive number"),

  amortizationMethod: z.nativeEnum(AmortizationMethod),

  emissionDate: z.coerce.date(),
  maturityDate: z.coerce.date(),

  prima: z.coerce.number().min(0, "Premium must be positive").optional(), // % Prima
  structuration: z.coerce.number().min(0, "Structuring must be positive").optional(), // % Estructuración
  colocation: z.coerce.number().min(0, "Placement must be positive").optional(), // % Colocación
  flotation: z.coerce.number().min(0, "Flotation must be positive").optional(), // % Flotación
  cavali: z.coerce.number().min(0, "CAVALI must be positive").optional(), // % CAVALI

  structurationApplyTo: z.nativeEnum(Actor),
  colocationApplyTo: z.nativeEnum(Actor),
  flotationApplyTo: z.nativeEnum(Actor),
  cavaliApplyTo: z.nativeEnum(Actor),

  // --- Plazo de gracia ---
  gracePeriod: z.array(z.object({
    period: z.number().min(1, "Period must be at least 1"),
    type: z.nativeEnum(GracePeriodType).default(GracePeriodType.none),
    duration: z.number().min(0, "Grace period duration must be 0 or more").optional(),
  })),
})

// --- Validaciones cruzadas ---
.refine(data => data.maturityDate > data.emissionDate, {
  message: "Maturity date must be after emission date",
  path: ["maturityDate"]
})
.refine(data => {
  if (data.interestRateType === InterestRateType.nominal) {
    return !!data.compoundingFrequency;
  }
  return true;
}, {
  message: "Compounding frequency is required when interest rate type is nominal",
  path: ["compoundingFrequency"]
})
