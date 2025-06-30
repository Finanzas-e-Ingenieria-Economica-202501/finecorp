"use server";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateGermanBondSchedule } from "@/lib/german-method";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth.service";
import { notFound } from "next/navigation";

export default async function CashFlowDetailPage({ params }: { params: { id: string } }) {
  // Get user (for future ownership validation, not used now)
  try {
    await getCurrentUser();
  } catch {
    notFound();
  }

  // Fetch bond and grace periods
  const bond = await prisma.bond_valuation.findUnique({
    where: { id: params.id },
    include: { bond_grace_period: true },
  });

  // Si no hay user_id, solo mostrar si existe el bono
  if (!bond) notFound();

  // Prepare input for calculation
  const schedule = calculateGermanBondSchedule({
    nominalValue: Number(bond.nominal_value),
    comercialValue: Number(bond.comercial_value),
    annualInterestRate: Number(bond.interest_rate),
    interestRateType: bond.interest_rate_type,
    compoundingFrequency: bond.compounding_frequency || undefined,
    paymentFrequency: bond.payment_frequency,
    years: bond.years,
    emissionDate: bond.emission_date,
    gracePeriods: bond.bond_grace_period.map(gp => ({
      period: gp.period,
      type: gp.type as "none" | "partial" | "total",
      duration: gp.duration ?? undefined,
    })),
    prima: Number(bond.prima),
    structuration: Number(bond.structuration),
    colocation: Number(bond.colocation),
    flotation: Number(bond.flotation),
    cavali: Number(bond.cavali),
    structurationApplyTo: bond.structuration_apply_to,
    colocationApplyTo: bond.colocation_apply_to,
    flotationApplyTo: bond.flotation_apply_to,
    cavaliApplyTo: bond.cavali_apply_to,
    cok: Number(bond.cok || 0),
    income_tax: Number(bond.income_tax || 0),
  });

  return (
    <div className="w-full max-w-full mx-auto py-8 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-6">Bond Payment Schedule</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Grace Period</TableHead>
            <TableHead>Bond</TableHead>
            <TableHead>Coupon</TableHead>
            <TableHead>Installment</TableHead>
            <TableHead>Amortization</TableHead>
            <TableHead>Premium</TableHead>
            <TableHead>Shield</TableHead>
            <TableHead>Emitter Flow</TableHead>
            <TableHead>Emitter Flow w/Shield</TableHead>
            <TableHead>Bondholder Flow</TableHead>
            <TableHead>Actualized Flow</TableHead>
            <TableHead>FA x Period</TableHead>
            <TableHead>Convexity Factor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map(row => (
            <TableRow key={row.period}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.date.toLocaleDateString()}</TableCell>
              <TableCell>{row.gracePeriod}</TableCell>
              <TableCell>{row.bond.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.coupon.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.installment.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.amortization.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.premium.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.shield.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.emitterFlow.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.emitterFlowWithShield.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.bondholderFlow.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.actualizedFlow.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.faByPeriod.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.convexityFactor.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
