"use server";

import prisma from "@/lib/prisma";
import { CashFlowFormValidator } from "@/zod/cash-flow-form.validator";
import { redirect } from "next/navigation";
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
      compounding_frequency: data.compoundingFrequency ?? null,
      bond_name: data.bondName,
      interest_rate: data.interestRate,
      nominal_value: data.nominalValue,
      comercial_value: data.comercialValue,
      payment_frequency: data.paymentFrequency,
      years: data.years, // years es requerido, no puede ser undefined
      amortization_method: data.amortizationMethod,
      emission_date: data.emissionDate,
      prima: data.prima ?? 0,
      structuration: data.structuration ?? 0,
      colocation: data.colocation ?? 0,
      flotation: data.flotation ?? 0,
      cavali: data.cavali ?? 0,
      structuration_apply_to: data.structurationApplyTo,
      colocation_apply_to: data.colocationApplyTo,
      flotation_apply_to: data.flotationApplyTo,
      cavali_apply_to: data.cavaliApplyTo,
      cok: typeof data.cok === "number" ? data.cok : undefined,
      income_tax: typeof data.income_tax === "number" ? data.income_tax : undefined,
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
