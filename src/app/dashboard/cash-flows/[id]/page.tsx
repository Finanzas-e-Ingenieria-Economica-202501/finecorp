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
    annualInterestRate: Number(bond.interest_rate),
    numberOfPeriods: bond.number_of_periods,
    paymentFrequencyInMonths: getMonthsFromFrequency(bond.payment_frequency),
    emissionDate: bond.emission_date,
    gracePeriods: bond.bond_grace_period.map(gp => ({
      period: gp.period,
      type: gp.type,
      duration: gp.duration ?? undefined,
    })),
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Bond Payment Schedule</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Installment</TableHead>
            <TableHead>Interest</TableHead>
            <TableHead>Amortization</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Grace</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map(row => (
            <TableRow key={row.period}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.date.toLocaleDateString()}</TableCell>
              <TableCell>{row.installment.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.interest.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.amortization.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.balance.toLocaleString(undefined, { style: 'currency', currency: bond.currency })}</TableCell>
              <TableCell>{row.graceType}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function getMonthsFromFrequency(freq: string): number {
  switch (freq) {
    case "annual": return 12;
    case "semi_annual": return 6;
    case "quarterly": return 3;
    case "bimonthly": return 2;
    case "monthly": return 1;
    case "daily": return 0; // Not supported
    default: return 1;
  }
}
