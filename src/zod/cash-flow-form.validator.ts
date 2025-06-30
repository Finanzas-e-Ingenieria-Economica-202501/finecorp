import { z } from "zod";

export enum InterestRateType {
  NOMINAL = "nominal",
  EFFECTIVE = "effective",
}

export enum CompoundingFrequency {
  ANNUAL = "annual",
  SEMI_ANNUAL = "semi-annual",
  QUARTERLY = "quarterly",
  BIMONTHLY = "bimonthly",
  MONTHLY = "monthly",
  DAILY = "daily",
}

export enum PaymentFrequency {
  ANNUAL = "annual",
  SEMI_ANNUAL = "semi-annual",
  QUARTERLY = "quarterly",
  BIMONTHLY = "bimonthly",
  MONTHLY = "monthly",
  DAILY = "daily",
}

export enum AmortizationMethod {
  GERMAN = "german",
  FRENCH = "french",
  AMERICAN = "american",
}

export enum GracePeriodType {
  NONE = "none",
  PARTIAL = "partial",
  TOTAL = "total",
}

// Reusable cost fields for issuer and investor
const CostFields = z.object({
  premium: z.coerce.number().min(0, "Premium must be positive").optional(), // % Prima
  structuring: z.coerce.number().min(0, "Structuring must be positive").optional(), // % Estructuración
  placement: z.coerce.number().min(0, "Placement must be positive").optional(), // % Colocación
  flotation: z.coerce.number().min(0, "Flotation must be positive").optional(), // % Flotación
  cavali: z.coerce.number().min(0, "CAVALI must be positive").optional(), // % CAVALI
});

export const CashFlowFormValidator = z.object({
  // --- Configuración general ---
  currency: z.string().min(1, "Currency is required").max(3, "Currency must be 3 characters long"),
  interestRateType: z.nativeEnum(InterestRateType),
  compoundingFrequency: z.nativeEnum(CompoundingFrequency).optional(),

  // --- Datos del bono ---
  bondName: z.string().min(1, "Bond name is required"),
  interestRate: z.coerce.number().min(0, "Interest rate must be a positive number"),
  nominalValue: z.number().min(0, "Nominal value must be a positive number"),
  comercialValue: z.number().min(0, "Commercial value must be a positive number"),

  paymentFrequency: z.nativeEnum(PaymentFrequency),
  numberOfPeriods: z.number().min(1, "Number of periods must be a positive number"),

  amortizationMethod: z.nativeEnum(AmortizationMethod),

  emissionDate: z.date(),
  maturityDate: z.date(),

  // --- Plazo de gracia ---
  gracePeriod: z.array(z.object({
    period: z.number().min(1, "Period must be at least 1"),
    type: z.nativeEnum(GracePeriodType).default(GracePeriodType.NONE),
    duration: z.number().min(0, "Grace period duration must be 0 or more").optional(),
  })),

  // --- Perspectiva del emisor ---
  issuer: z.object({
    rate: z.coerce.number().min(0, "Issuer rate (TCEA) must be positive"),
  }).merge(CostFields),

  // --- Perspectiva del bonista/inversor ---
  investor: z.object({
    rate: z.coerce.number().min(0, "Investor rate (TREA) must be positive"),
  }).merge(CostFields),
})

// --- Validaciones cruzadas ---
.refine(data => {
  if (data.interestRateType === InterestRateType.NOMINAL) {
    return !!data.compoundingFrequency;
  }
  return true;
}, {
  message: "Compounding frequency is required when interest rate type is nominal",
  path: ["compoundingFrequency"]
})
.refine(data => data.maturityDate > data.emissionDate, {
  message: "Maturity date must be after emission date",
  path: ["maturityDate"]
})
