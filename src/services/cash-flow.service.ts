"use server";

import prisma from "@/lib/prisma";
import { CashFlowFormValidator } from "@/zod/cash-flow-form.validator";
import { redirect } from "next/navigation";
import type { compounding_frequency, payment_frequency } from "@/prisma/client";
import { PATHS } from "@/lib/defaults";
import { getCurrentUser } from "@/services/auth.service";

interface Bond {
  id: string;
  name: string;
  emissionDate: string;
  nominalValue: number;
}

export async function createCashFlowAction(formData: unknown) {
  // Validate with Zod
  const parsed = CashFlowFormValidator.safeParse(formData);
  if (!parsed.success) {
    // Return errors for client handling
    return { errors: parsed.error.flatten() };
  }
  const data = parsed.data;

  // DEBUG: Log all data before creation
  console.log("[createCashFlowAction] Data to create:", JSON.stringify(data, null, 2));

  // Helper to map enums to DB values (for semi-annual, etc)
  function mapEnum(val: string | undefined, allowNull = false): compounding_frequency | payment_frequency | null | undefined {
    if (!val) return allowNull ? null : undefined;
    if (val === "semi-annual") return "semi_annual";
    return val as compounding_frequency | payment_frequency;
  }

  // Get current user
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("No active user session");
  }

  // Save bond_valuation
  const bond = await prisma.bond_valuation.create({
    data: {
      user_id: user.id, // Associate bond with current user
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
      issuer_premium: data.issuer.premium,
      issuer_structuring: data.issuer.structuring,
      issuer_placement: data.issuer.placement,
      issuer_flotation: data.issuer.flotation,
      issuer_cavali: data.issuer.cavali,
      investor_rate: data.investor.rate,
      investor_premium: data.investor.premium,
      investor_structuring: data.investor.structuring,
      investor_placement: data.investor.placement,
      investor_flotation: data.investor.flotation,
      investor_cavali: data.investor.cavali,
      bond_grace_period: data.gracePeriod.length > 0 ? {
        create: data.gracePeriod.map((gp) => ({
          period: gp.period,
          type: gp.type,
          duration: gp.duration ?? 0,
        })),
      } : undefined,
    },
    include: { bond_grace_period: true },
  });

  // Redirect to the detail page
  redirect(PATHS.DASHBOARD.CASH_FLOWS.BY_ID(bond.id.toString()));
}

export async function deleteCashFlowAction(id: string) {
  if (!id) return;
  await prisma.bond_valuation.delete({ where: { id } });
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/cash-flows");
  } catch {}
}

export async function getAllCashFlows(): Promise<Bond[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rawBonds = await prisma.bond_valuation.findMany({
    where: { user_id: user.id }, // Only fetch bonds for current user
    orderBy: { emission_date: "desc" },
    select: {
      id: true,
      bond_name: true,
      emission_date: true,
      nominal_value: true,
    },
  });
  return rawBonds.map((b) => ({
    id: b.id,
    name: b.bond_name,
    emissionDate: b.emission_date instanceof Date ? b.emission_date.toISOString() : String(b.emission_date),
    nominalValue: Number(b.nominal_value),
  }));
}
