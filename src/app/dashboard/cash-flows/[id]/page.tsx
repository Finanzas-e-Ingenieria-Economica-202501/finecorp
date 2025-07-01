"use server";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateGermanMethod, CashFlowFormData } from "@/lib/german-method-calculator";
import { InterestRateType, PaymentFrequency, CompoundingFrequency, AmortizationMethod, Actor, GracePeriodType } from "@/zod/cash-flow.enums";
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

  // Helper function to convert string frequency to enum
  function stringToPaymentFrequency(frequency: string): PaymentFrequency {
    switch (frequency) {
      case 'daily': return PaymentFrequency.daily;
      case 'monthly': return PaymentFrequency.monthly;
      case 'bimonthly': return PaymentFrequency.bimonthly;
      case 'quarterly': return PaymentFrequency.quarterly;
      case 'semi_annual': return PaymentFrequency.semi_annual;
      case 'annual': return PaymentFrequency.annual;
      default: return PaymentFrequency.semi_annual;
    }
  }

  function stringToCompoundingFrequency(frequency?: string): CompoundingFrequency | undefined {
    if (!frequency) return undefined;
    switch (frequency) {
      case 'daily': return CompoundingFrequency.daily;
      case 'monthly': return CompoundingFrequency.monthly;
      case 'bimonthly': return CompoundingFrequency.bimonthly;
      case 'quarterly': return CompoundingFrequency.quarterly;
      case 'semi_annual': return CompoundingFrequency.semi_annual;
      case 'annual': return CompoundingFrequency.annual;
      default: return CompoundingFrequency.daily;
    }
  }

  function stringToActor(actor?: string): Actor {
    switch (actor) {
      case 'emitter': return Actor.emitter;
      case 'bondholder': return Actor.bondholder;
      case 'both': return Actor.both;
      default: return Actor.emitter;
    }
  }

  function stringToGracePeriodType(type: string): GracePeriodType {
    switch (type) {
      case 'none': return GracePeriodType.none;
      case 'partial': return GracePeriodType.partial;
      case 'total': return GracePeriodType.total;
      default: return GracePeriodType.none;
    }
  }

  // Prepare input for calculation using the new German method
  const formData: CashFlowFormData = {
    currency: bond.currency || "USD",
    interestRateType: bond.interest_rate_type === "nominal" ? InterestRateType.nominal : InterestRateType.effective,
    compoundingFrequency: stringToCompoundingFrequency(bond.compounding_frequency || undefined),
    daysPerYear: bond.days_per_year || 360,
    bondName: bond.bond_name || "Bond",
    interestRate: Number(bond.interest_rate),
    nominalValue: Number(bond.nominal_value),
    comercialValue: Number(bond.comercial_value),
    paymentFrequency: stringToPaymentFrequency(bond.payment_frequency),
    years: bond.years,
    amortizationMethod: AmortizationMethod.german,
    emissionDate: bond.emission_date,
    prima: Number(bond.prima || 0),
    structuration: Number(bond.structuration || 0),
    colocation: Number(bond.colocation || 0),
    flotation: Number(bond.flotation || 0),
    cavali: Number(bond.cavali || 0),
    structurationApplyTo: stringToActor(bond.structuration_apply_to || undefined),
    colocationApplyTo: stringToActor(bond.colocation_apply_to || undefined),
    flotationApplyTo: stringToActor(bond.flotation_apply_to || undefined),
    cavaliApplyTo: stringToActor(bond.cavali_apply_to || undefined),
    cok: Number(bond.cok || 0),
    income_tax: Number(bond.income_tax || 0),
    gracePeriod: bond.bond_grace_period.map(gp => ({
      period: gp.period,
      type: stringToGracePeriodType(gp.type || 'none'),
      duration: gp.duration ?? undefined,
    }))
  };

  // Calculate using the new German method
  const result = calculateGermanMethod(formData);
  const { periods: schedule, summary } = result;

  return (
    <div className="w-full max-w-full mx-auto py-8 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-6">Cronograma de Pagos - Método Alemán</h1>
      
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Bono</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Frecuencia del cupón:</span>
                <span>{summary.couponFrequency} días</span>
              </div>
              <div className="flex justify-between">
                <span>Períodos por año:</span>
                <span>{summary.periodsPerYear}</span>
              </div>
              <div className="flex justify-between">
                <span>Total de períodos:</span>
                <span>{summary.totalPeriods}</span>
              </div>
              <div className="flex justify-between">
                <span>TEA (Tasa Efectiva Anual):</span>
                <span>{summary.effectiveAnnualCouponRate.toFixed(5)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Tasa efectiva período:</span>
                <span>{summary.effectivePeriodCouponRate.toFixed(3)}%</span>
              </div>
              <div className="flex justify-between">
                <span>COK del período:</span>
                <span>{summary.periodCOK.toFixed(3)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costos y Precio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Costos iniciales emisor:</span>
                <span>{Number(summary.initialEmitterCosts.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Costos iniciales bonista:</span>
                <span>{Number(summary.initialBondholderCosts.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Precio actual:</span>
                <span>{Number(summary.actualPrice.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Utilidad/Pérdida:</span>
                <span>{Number(summary.utility.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores de Rentabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duración:</span>
                <span>{summary.duration.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Convexidad:</span>
                <span>{summary.convexity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Duración modificada:</span>
                <span>{summary.modifiedDuration.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TCEA Emisor:</span>
                <span>{summary.emitterTCEA.toFixed(5)}%</span>
              </div>
              <div className="flex justify-between">
                <span>TCEA Emisor c/Escudo:</span>
                <span>{summary.emitterTCEAWithShield.toFixed(5)}%</span>
              </div>
              <div className="flex justify-between">
                <span>TREA Bonista:</span>
                <span>{summary.bondholderTREA.toFixed(5)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Table */}
      <h2 className="text-xl font-semibold mb-4">Flujo de Caja Detallado</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Fecha Programada</TableHead>
            <TableHead>Plazo de Gracia</TableHead>
            <TableHead>Bono</TableHead>
            <TableHead>Cupón (Interés)</TableHead>
            <TableHead>Cuota</TableHead>
            <TableHead>Amort.</TableHead>
            <TableHead>Prima</TableHead>
            <TableHead>Escudo</TableHead>
            <TableHead>Flujo Emisor</TableHead>
            <TableHead>Flujo Emisor c/Escudo</TableHead>
            <TableHead>Flujo Bonista</TableHead>
            <TableHead>Flujo Act.</TableHead>
            <TableHead>FA x Plazo</TableHead>
            <TableHead>Factor p/Convexidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map(row => (
            <TableRow key={row.period}>
              <TableCell>{row.period}</TableCell>
              <TableCell>{row.programmingDate.toLocaleDateString('es-ES')}</TableCell>
              <TableCell>{row.gracePeriodType}</TableCell>
              <TableCell>{Number(row.bond.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.coupon.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.quota.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.amortization.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.premium.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.shield.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.emitterFlow.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.emitterFlowWithShield.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.bondholderFlow.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.actualFlow.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.faXTerm.toString()).toLocaleString('es-ES', { style: 'currency', currency: bond.currency || 'USD' })}</TableCell>
              <TableCell>{Number(row.convexityFactor.toString()).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
