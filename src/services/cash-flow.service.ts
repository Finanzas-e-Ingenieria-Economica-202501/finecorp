"use server";

import prisma from "@/lib/prisma";
import { CashFlowFormValidator } from "@/zod/cash-flow-form.validator";
import { redirect } from "next/navigation";
import type { compounding_frequency, payment_frequency } from "@/prisma/client";

export async function createCashFlowAction(formData: unknown) {
  // Validate with Zod
  const parsed = CashFlowFormValidator.safeParse(formData);
  if (!parsed.success) {
    // Return errors for client handling
    return { errors: parsed.error.flatten() };
  }
  const data = parsed.data;

  // Helper to map enums to DB values (for semi-annual, etc)
  function mapEnum(val: string | undefined, allowNull = false): compounding_frequency | payment_frequency | null | undefined {
    if (!val) return allowNull ? null : undefined;
    if (val === "semi-annual") return "semi_annual";
    return val as compounding_frequency | payment_frequency;
  }

  // Save bond_valuation
  const bond = await prisma.bond_valuation.create({
    data: {
      currency: data.currency,
      interest_rate_type: data.interestRateType,
      compounding_frequency: mapEnum(data.compoundingFrequency, true) as compounding_frequency | null,
      bond_name: data.bondName,
      interest_rate: data.interestRate,
      nominal_value: data.nominalValue,
      comercial_value: data.comercialValue,
      payment_frequency: mapEnum(data.paymentFrequency) as payment_frequency,
      number_of_periods: data.numberOfPeriods,
      amortization_method: data.amortizationMethod,
      emission_date: data.emissionDate,
      maturity_date: data.maturityDate,
      issuer_rate: data.issuer.rate,
      issuer_taxes_or_withholding: data.issuer.taxesOrWithholding,
      issuer_fees: data.issuer.fees,
      issuer_initial_expenses: data.issuer.initialExpenses,
      issuer_structuring_costs: data.issuer.structuringCosts,
      issuer_legal_fees: data.issuer.legalFees,
      issuer_other_costs: data.issuer.otherCosts,
      investor_rate: data.investor.rate,
      investor_taxes_or_withholding: data.investor.taxesOrWithholding,
      investor_fees: data.investor.fees,
      investor_initial_expenses: data.investor.initialExpenses,
      investor_structuring_costs: data.investor.structuringCosts,
      investor_legal_fees: data.investor.legalFees,
      investor_other_costs: data.investor.otherCosts,
      bond_grace_period: {
        create: data.gracePeriod.map((gp) => ({
          period: gp.period,
          type: gp.type,
          duration: gp.duration ?? 0,
        })),
      },
    },
    include: { bond_grace_period: true },
  });

  // Redirect to the detail page
  redirect(`/cash-flows/${bond.id}`);
}
