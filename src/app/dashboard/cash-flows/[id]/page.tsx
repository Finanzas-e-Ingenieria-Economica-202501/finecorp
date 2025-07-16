"use server";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    calculateGermanMethod,
    CashFlowFormData,
} from "@/lib/german-method-calculator";
import {
    InterestRateType,
    PaymentFrequency,
    CompoundingFrequency,
    AmortizationMethod,
    Actor,
    GracePeriodType,
    ApplyPrimaIn,
} from "@/zod/cash-flow.enums";
import { generateFinancialInterpretations } from "@/lib/financial-interpretations";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth.service";
import { notFound } from "next/navigation";

export default async function CashFlowDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    // Get user (for future ownership validation, not used now)
    try {
        await getCurrentUser();
    } catch {
        notFound();
    }

    const id = (await params).id;

    // Fetch bond and grace periods
    const bond = await prisma.bond_valuation.findUnique({
        where: { id },
        include: { bond_grace_period: true },
    });

    // Si no hay user_id, solo mostrar si existe el bono
    if (!bond) notFound();

    // Helper function to convert string frequency to enum
    function stringToPaymentFrequency(frequency: string): PaymentFrequency {
        switch (frequency) {
            case "daily":
                return PaymentFrequency.daily;
            case "monthly":
                return PaymentFrequency.monthly;
            case "bimonthly":
                return PaymentFrequency.bimonthly;
            case "quarterly":
                return PaymentFrequency.quarterly;
            case "semi_annual":
                return PaymentFrequency.semi_annual;
            case "annual":
                return PaymentFrequency.annual;
            default:
                return PaymentFrequency.semi_annual;
        }
    }

    function stringToCompoundingFrequency(
        frequency?: string
    ): CompoundingFrequency | undefined {
        if (!frequency) return undefined;
        switch (frequency) {
            case "daily":
                return CompoundingFrequency.daily;
            case "monthly":
                return CompoundingFrequency.monthly;
            case "bimonthly":
                return CompoundingFrequency.bimonthly;
            case "quarterly":
                return CompoundingFrequency.quarterly;
            case "semi_annual":
                return CompoundingFrequency.semi_annual;
            case "annual":
                return CompoundingFrequency.annual;
            default:
                return CompoundingFrequency.daily;
        }
    }

    function stringToActor(actor?: string): Actor {
        switch (actor) {
            case "emitter":
                return Actor.emitter;
            case "bondholder":
                return Actor.bondholder;
            case "both":
                return Actor.both;
            default:
                return Actor.emitter;
        }
    }

    function stringToGracePeriodType(type: string): GracePeriodType {
        switch (type) {
            case "none":
                return GracePeriodType.none;
            case "partial":
                return GracePeriodType.partial;
            case "total":
                return GracePeriodType.total;
            default:
                return GracePeriodType.none;
        }
    }

    function stringToApplyPrimaIn(applyPrimaIn?: string): ApplyPrimaIn {
        switch (applyPrimaIn) {
            case "beginning":
                return ApplyPrimaIn.beginning;
            case "end":
                return ApplyPrimaIn.end;
            default:
                return ApplyPrimaIn.end;
        }
    }

    // Preparar input para cálculo según método seleccionado
    const formData: CashFlowFormData = {
        currency: bond.currency || "USD",
        interestRateType:
            bond.interest_rate_type === "nominal"
                ? InterestRateType.nominal
                : InterestRateType.effective,
        compoundingFrequency: stringToCompoundingFrequency(
            bond.compounding_frequency || undefined
        ),
        daysPerYear: bond.days_per_year || 360,
        bondName: bond.bond_name || "Bond",
        interestRate: Number(bond.interest_rate),
        nominalValue: Number(bond.nominal_value),
        comercialValue: Number(bond.comercial_value),
        paymentFrequency: stringToPaymentFrequency(bond.payment_frequency),
        years: bond.years,
        amortizationMethod: bond.amortization_method === "french"
            ? AmortizationMethod.french
            : AmortizationMethod.german,
        emissionDate: bond.emission_date,
        prima: Number(bond.prima || 0),
        structuration: Number(bond.structuration || 0),
        colocation: Number(bond.colocation || 0),
        flotation: Number(bond.flotation || 0),
        cavali: Number(bond.cavali || 0),
        structurationApplyTo: stringToActor(
            bond.structuration_apply_to || undefined
        ),
        colocationApplyTo: stringToActor(bond.colocation_apply_to || undefined),
        flotationApplyTo: stringToActor(bond.flotation_apply_to || undefined),
        cavaliApplyTo: stringToActor(bond.cavali_apply_to || undefined),
        cok: Number(bond.cok || 0),
        income_tax: Number(bond.income_tax || 0),
        gracePeriod: bond.bond_grace_period.map((gp) => ({
            period: gp.period,
            type: stringToGracePeriodType(gp.type || "none"),
            duration: gp.duration ?? undefined,
        })),
        applyPrimaIn: stringToApplyPrimaIn(bond.apply_prima_in || undefined),
    };

    // Calcular según método seleccionado
    let schedule, summary;
    if (formData.amortizationMethod === AmortizationMethod.french) {
        // Importar dinámicamente el método francés
        const { calculateFrenchMethod } = await import("@/lib/french-method");
        const result = calculateFrenchMethod(formData);
        schedule = result.periods;
        summary = result.summary;
    } else {
        const result = calculateGermanMethod(formData);
        schedule = result.periods;
        summary = result.summary;
    }

    // Generate financial interpretations
    const interpretations = generateFinancialInterpretations(
        summary,
        Number(bond.nominal_value),
        Number(bond.comercial_value),
        Number(bond.cok || 0)
    );

    return (
        <div className="w-full max-w-full mx-auto py-8 overflow-x-auto px-4">
            <h1 className="text-2xl font-bold mb-6">
                Cronograma de Pagos - Método Alemán
            </h1>

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
                                <span>
                                    {summary.effectiveAnnualCouponRate.toFixed(
                                        5
                                    )}
                                    %
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tasa efectiva del período:</span>
                                <span>
                                    {summary.effectivePeriodCouponRate.toFixed(
                                        3
                                    )}
                                    %
                                </span>
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
                                <span>Costos iniciales del emisor:</span>
                                <span>
                                    {Number(
                                        summary.initialEmitterCosts.toString()
                                    ).toLocaleString("es-ES", {
                                        style: "currency",
                                        currency: bond.currency || "USD",
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Costos iniciales del bonista:</span>
                                <span>
                                    {Number(
                                        summary.initialBondholderCosts.toString()
                                    ).toLocaleString("es-ES", {
                                        style: "currency",
                                        currency: bond.currency || "USD",
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Precio actual:</span>
                                <span>
                                    {Number(
                                        summary.actualPrice.toString()
                                    ).toLocaleString("es-ES", {
                                        style: "currency",
                                        currency: bond.currency || "USD",
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Utilidad/Pérdida:</span>
                                <span>
                                    {Number(
                                        summary.utility.toString()
                                    ).toLocaleString("es-ES", {
                                        style: "currency",
                                        currency: bond.currency || "USD",
                                    })}
                                </span>
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
                                <span>
                                    {summary.modifiedDuration.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>TCEA del Emisor:</span>
                                <span>{summary.emitterTCEA.toFixed(5)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>TCEA del Emisor c/Escudo:</span>
                                <span>
                                    {summary.emitterTCEAWithShield.toFixed(5)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>TREA del Bonista:</span>
                                <span>
                                    {summary.bondholderTREA.toFixed(5)}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Interpretations Section */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                    Análisis e Interpretaciones Financieras
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Análisis de Riesgo y Sensibilidad</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-blue-700 dark:text-blue-300">
                                    Duración Modificada
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interpretations.duracionModificada}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-purple-700 dark:text-purple-300">
                                    Convexidad
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interpretations.convexidad}
                                </p>
                            </div>
                            {interpretations.volatilidad && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2 text-amber-700 dark:text-amber-300">
                                        Volatilidad
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {interpretations.volatilidad}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Análisis de Precios y Rentabilidad</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-green-700 dark:text-green-300">
                                    Relación Precio / Rendimiento
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interpretations.priceRendimiento}
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-indigo-700 dark:text-indigo-300">
                                    Precio Actual
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interpretations.precioActual}
                                </p>
                            </div>
                            <div className="p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg">
                                <h4 className="font-medium text-sm mb-2 text-cyan-700 dark:text-cyan-300">
                                    Utilidad/Pérdida
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {interpretations.utilidadPerdida}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">Análisis de Tasas de Rentabilidad</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2 text-red-700 dark:text-red-300">
                                        TCEA del Emisor
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {interpretations.tceaEmisor}
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2 text-orange-700 dark:text-orange-300">
                                        TCEA del Emisor con Escudo
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {interpretations.tceaEmisorEscudo}
                                    </p>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                                    <h4 className="font-medium text-sm mb-2 text-emerald-700 dark:text-emerald-300">
                                        TREA del Bonista
                                    </h4>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {interpretations.treaBonista}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Conclusión General */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-lg">📊</span>
                                Conclusión Ejecutiva
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                                    {interpretations.conclusionGeneral.split('**').map((segment, index) => {
                                        if (index % 2 === 1) {
                                            // This is a bold segment
                                            return <strong key={index} className="font-semibold text-gray-900 dark:text-gray-100">{segment}</strong>;
                                        }
                                        // This is regular text
                                        return <span key={index}>{segment}</span>;
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Cash Flow Table */}
            <h2 className="text-xl font-semibold mb-4">
                Cronograma de Flujos de Caja Detallado
            </h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-center">Nº</TableHead>
                        <TableHead className="text-center">
                            Fecha Programada
                        </TableHead>
                        <TableHead className="text-center">
                            Período de Gracia
                        </TableHead>
                        <TableHead className="text-center">
                            Saldo del Bono
                        </TableHead>
                        <TableHead className="text-center">
                            Cupón (Interés)
                        </TableHead>
                        <TableHead className="text-center">
                            Cuota Total
                        </TableHead>
                        <TableHead className="text-center">
                            Amortización
                        </TableHead>
                        <TableHead className="text-center">Prima</TableHead>
                        <TableHead className="text-center">
                            Escudo Fiscal
                        </TableHead>
                        <TableHead className="text-center">
                            Flujo del Emisor
                        </TableHead>
                        <TableHead className="text-center">
                            Flujo del Emisor c/Escudo
                        </TableHead>
                        <TableHead className="text-center">
                            Flujo del Bonista
                        </TableHead>
                        <TableHead className="text-center">
                            Flujo Actualizado
                        </TableHead>
                        <TableHead className="text-center">
                            FA × Plazo
                        </TableHead>
                        <TableHead className="text-center">
                            Factor de Convexidad
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schedule.map((row) => (
                        <TableRow key={row.period}>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>
                                {row.programmingDate.toLocaleDateString(
                                    "es-ES"
                                )}
                            </TableCell>
                            <TableCell>{row.gracePeriodType}</TableCell>
                            <TableCell
                                className={
                                    Number(row.bond.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.bond.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.coupon.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.coupon.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.quota.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.quota.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.amortization.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.amortization.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.premium.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.premium.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.shield.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.shield.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.emitterFlow.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.emitterFlow.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(
                                        row.emitterFlowWithShield.toString()
                                    ) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.emitterFlowWithShield.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.bondholderFlow.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.bondholderFlow.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.actualFlow.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.actualFlow.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.faXTerm.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.faXTerm.toString())
                                ).toLocaleString("es-ES", {
                                    style: "currency",
                                    currency: bond.currency || "USD",
                                })}
                            </TableCell>
                            <TableCell
                                className={
                                    Number(row.convexityFactor.toString()) < 0
                                        ? "text-red-400"
                                        : "text-blue-400"
                                }
                            >
                                {Math.abs(
                                    Number(row.convexityFactor.toString())
                                ).toLocaleString("es-ES", {
                                    maximumFractionDigits: 2,
                                })}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
