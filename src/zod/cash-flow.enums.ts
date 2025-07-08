// Enums for cash flow form, matching Prisma schema
enum AmortizationMethod {
  german = "german",
  french = "french",
  american = "american",
}

enum CompoundingFrequency {
  annual = "annual",
  semi_annual = "semi_annual",
  quarterly = "quarterly",
  bimonthly = "bimonthly",
  monthly = "monthly",
  daily = "daily",
}

enum GracePeriodType {
  none = "none",
  partial = "partial",
  total = "total",
}

enum InterestRateType {
  nominal = "nominal",
  effective = "effective",
}

enum PaymentFrequency {
  annual = "annual",
  semi_annual = "semi_annual",
  quarterly = "quarterly",
  bimonthly = "bimonthly",
  monthly = "monthly",
  daily = "daily",
}

enum Actor {
  emitter = "emitter",
  bondholder = "bondholder",
  both = "both",
}

enum ApplyPrimaIn {
  beginning = "beginning",
  end = "end",
}

export {
  AmortizationMethod,
  CompoundingFrequency,
  GracePeriodType,
  InterestRateType,
  PaymentFrequency,
  Actor,
  ApplyPrimaIn
};
