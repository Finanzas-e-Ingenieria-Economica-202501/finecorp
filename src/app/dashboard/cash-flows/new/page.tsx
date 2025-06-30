"use client";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    AmortizationMethod,
    CompoundingFrequency,
    GracePeriodType,
    InterestRateType,
    PaymentFrequency,
    Actor,
} from "@/zod/cash-flow.enums";
import { CashFlowFormValidator } from "@/zod/cash-flow-form.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createCashFlowAction } from "@/services/cash-flow.service";

export default function NewCashFlowPage() {
    const formState = useForm({
        resolver: zodResolver(CashFlowFormValidator),
        defaultValues: {
            currency: "USD",
            bondName: "Bond Name",
            interestRateType: InterestRateType.effective,
            compoundingFrequency: CompoundingFrequency.annual,
            interestRate: 5.0,
            nominalValue: 100000,
            comercialValue: 100000,
            paymentFrequency: PaymentFrequency.monthly,
            years: 1,
            amortizationMethod: AmortizationMethod.german,
            emissionDate: new Date(),
            prima: 0,
            structuration: 0,
            colocation: 0,
            flotation: 0,
            cavali: 0,
            structurationApplyTo: Actor.emitter,
            colocationApplyTo: Actor.emitter,
            flotationApplyTo: Actor.both,
            cavaliApplyTo: Actor.both,
            cok: 0,
            income_tax: 0,
            gracePeriod: [],
        },
    });

    const interestRateType = useWatch({
        control: formState.control,
        name: "interestRateType",
    });
    const years = useWatch({
        control: formState.control,
        name: "years",
    });
    const paymentFrequency = useWatch({
        control: formState.control,
        name: "paymentFrequency",
    });
    const { fields, append, remove } = useFieldArray({
        control: formState.control,
        name: "gracePeriod",
    });

    // Grace period add form state
    const [selectedPeriod, setSelectedPeriod] = useState(1);
    const [selectedType, setSelectedType] = useState<GracePeriodType>(
        GracePeriodType.none
    );
    const [loading, setLoading] = useState(false);

    // Helper: calculate total payment periods based on years and payment frequency
    const getPaymentPeriodsPerYear = (frequency: PaymentFrequency): number => {
        switch (frequency) {
            case PaymentFrequency.annual:
                return 1;
            case PaymentFrequency.semi_annual:
                return 2;
            case PaymentFrequency.quarterly:
                return 4;
            case PaymentFrequency.bimonthly:
                return 6;
            case PaymentFrequency.monthly:
                return 12;
            case PaymentFrequency.daily:
                return 365;
            default:
                return 1;
        }
    };

    const calculateTotalPeriods = (): number => {
        const yearsValue = typeof years === 'string' ? parseInt(years) || 0 : years || 0;
        const periodsPerYear = getPaymentPeriodsPerYear(paymentFrequency);
        return yearsValue * periodsPerYear;
    };

    // Helper: get available periods (not already in gracePeriod)
    const usedPeriods = fields.map((f) => f.period);
    const totalPeriods = calculateTotalPeriods();
    const availablePeriods = Array.from(
        { length: totalPeriods },
        (_, i) => i + 1
    ).filter((p) => !usedPeriods.includes(p));

    // Update selectedPeriod when available periods change
    useEffect(() => {
        if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriod)) {
            setSelectedPeriod(availablePeriods[0]);
        }
    }, [availablePeriods, selectedPeriod]);

    // Add grace period entry
    const handleAddGracePeriod = () => {
        if (!selectedPeriod || !selectedType || availablePeriods.length === 0) return;
        append({
            period: selectedPeriod,
            type: selectedType,
            duration: selectedType === GracePeriodType.none ? 0 : 1,
        });
        // Reset selectors to the first available period, or 1 if none available
        const nextAvailablePeriod = availablePeriods.filter(p => p !== selectedPeriod)[0];
        setSelectedPeriod(nextAvailablePeriod || 1);
        setSelectedType(GracePeriodType.none);
    };

    const onSubmit = formState.handleSubmit(async (data) => {
        setLoading(true);
        try {
            // Convert string values to numbers before submitting
            const processedData = {
                ...data,
                interestRate: typeof data.interestRate === 'string' ? parseFloat(data.interestRate) || 0 : data.interestRate,
                nominalValue: typeof data.nominalValue === 'string' ? parseFloat(data.nominalValue) || 0 : data.nominalValue,
                comercialValue: typeof data.comercialValue === 'string' ? parseFloat(data.comercialValue) || 0 : data.comercialValue,
                years: typeof data.years === 'string' ? parseInt(data.years) || 1 : data.years,
                prima: typeof data.prima === 'string' ? parseFloat(data.prima) || 0 : data.prima,
                structuration: typeof data.structuration === 'string' ? parseFloat(data.structuration) || 0 : data.structuration,
                colocation: typeof data.colocation === 'string' ? parseFloat(data.colocation) || 0 : data.colocation,
                flotation: typeof data.flotation === 'string' ? parseFloat(data.flotation) || 0 : data.flotation,
                cavali: typeof data.cavali === 'string' ? parseFloat(data.cavali) || 0 : data.cavali,
                cok: typeof data.cok === 'string' ? parseFloat(data.cok) || 0 : data.cok,
                income_tax: typeof data.income_tax === 'string' ? parseFloat(data.income_tax) || 0 : data.income_tax,
                gracePeriod: data.gracePeriod.map(gp => ({
                    ...gp,
                    duration: typeof gp.duration === 'string' ? parseInt(gp.duration) || 0 : gp.duration,
                })),
            };

            const result = await createCashFlowAction(processedData);
            if (result && result.errors) {
                toast.error("Validation error. Please check your input.");
                // Optionally show field errors with toast or setError
                setLoading(false);
                return;
            }
            toast.success("Bond created successfully!");
            // Redirect is handled by server action
        } catch (err) {
            console.error("Error creating bond:", err);
            toast.error("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    });

    return (
        <div className="flex flex-col items-center justify-center h-full w-full px-4">
            {loading && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 flex flex-col items-center gap-4 shadow-lg">
                        <svg
                            className="animate-spin h-8 w-8 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8z"
                            ></path>
                        </svg>
                        <span className="text-lg font-medium">
                            Creating bond...
                        </span>
                    </div>
                </div>
            )}
            <Form {...formState}>
                <form onSubmit={onSubmit} className="w-full max-w-[600px]">
                    <div className="space-y-4">
                        {/* --- Sección de datos del bono --- */}
                        <FormField
                            control={formState.control}
                            name="bondName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bond Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Bond Name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formState.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select currency" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="USD">
                                                USD - US Dollar
                                            </SelectItem>
                                            <SelectItem value="PEN">
                                                PEN - Sol Peruano
                                            </SelectItem>
                                            <SelectItem value="EUR">
                                                EUR - Euro
                                            </SelectItem>
                                            <SelectItem value="JPY">
                                                JPY - Yen Japonés
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    {/* Quitar grid y poner todo en vertical */}
                    <div className="flex flex-col gap-4">
                        {/* Interest Rate Type */}
                        <FormField
                            control={formState.control}
                            name="interestRateType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interest Rate Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select interest rate type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={InterestRateType.nominal}>
                                                Nominal
                                            </SelectItem>
                                            <SelectItem value={InterestRateType.effective}>
                                                Effective
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Compounding Frequency: only show if Nominal */}
                        {interestRateType === InterestRateType.nominal && (
                            <FormField
                                control={formState.control}
                                name="compoundingFrequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Compounding Frequency</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select compounding frequency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={CompoundingFrequency.annual}>
                                                    Annual
                                                </SelectItem>
                                                <SelectItem value={CompoundingFrequency.semi_annual}>
                                                    Semi-Annual
                                                </SelectItem>
                                                <SelectItem value={CompoundingFrequency.quarterly}>
                                                    Quarterly
                                                </SelectItem>
                                                <SelectItem value={CompoundingFrequency.bimonthly}>
                                                    Bimonthly
                                                </SelectItem>
                                                <SelectItem value={CompoundingFrequency.monthly}>
                                                    Monthly
                                                </SelectItem>
                                                <SelectItem value={CompoundingFrequency.daily}>
                                                    Daily
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {/* Interest Rate */}
                        <FormField
                            control={formState.control}
                            name="interestRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interest Rate (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="5.0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Nominal Value */}
                        <FormField
                            control={formState.control}
                            name="nominalValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nominal Value</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="100000"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Comercial Value */}
                        <FormField
                            control={formState.control}
                            name="comercialValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Commercial Value</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="100000"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Payment Frequency */}
                        <FormField
                            control={formState.control}
                            name="paymentFrequency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Frequency</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment frequency" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={PaymentFrequency.annual}>
                                                Annual
                                            </SelectItem>
                                            <SelectItem value={PaymentFrequency.semi_annual}>
                                                Semi-Annual
                                            </SelectItem>
                                            <SelectItem value={PaymentFrequency.quarterly}>
                                                Quarterly
                                            </SelectItem>
                                            <SelectItem value={PaymentFrequency.bimonthly}>
                                                Bimonthly
                                            </SelectItem>
                                            <SelectItem value={PaymentFrequency.monthly}>
                                                Monthly
                                            </SelectItem>
                                            <SelectItem value={PaymentFrequency.daily}>
                                                Daily
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Years */}
                        <FormField
                            control={formState.control}
                            name="years"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Years</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="1"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Amortization Method */}
                        <FormField
                            control={formState.control}
                            name="amortizationMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amortization Method</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select amortization method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={AmortizationMethod.german}>
                                                German
                                            </SelectItem>
                                            <SelectItem value={AmortizationMethod.french}>
                                                French
                                            </SelectItem>
                                            <SelectItem value={AmortizationMethod.american}>
                                                American
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Emission Date */}
                        <FormField
                            control={formState.control}
                            name="emissionDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Emission Date</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={
                                                field.value
                                                    ? new Date(field.value)
                                                          .toISOString()
                                                          .split("T")[0]
                                                    : ""
                                            }
                                            onChange={(e) =>
                                                field.onChange(
                                                    new Date(e.target.value)
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                            <h3 className="font-semibold text-lg">Grace Periods</h3>
                            {totalPeriods > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Total payment periods: {totalPeriods} (based on {typeof years === 'string' ? years : years || 0} year{(typeof years === 'string' ? parseInt(years) : years || 0) !== 1 ? 's' : ''} with {paymentFrequency.replace('_', '-')} payments)
                                </p>
                            )}
                            {availablePeriods.length === 0 && totalPeriods > 0 && (
                                <p className="text-sm text-amber-600">
                                    All payment periods have grace periods assigned
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Period selector */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Period
                                </label>
                                <Select
                                    value={selectedPeriod.toString()}
                                    onValueChange={(val) =>
                                        setSelectedPeriod(Number(val))
                                    }
                                    disabled={availablePeriods.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select period" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availablePeriods.map((p) => (
                                            <SelectItem
                                                key={p}
                                                value={p.toString()}
                                            >
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Type
                                </label>
                                <Select
                                    value={selectedType}
                                    onValueChange={(val) =>
                                        setSelectedType(
                                            val as (typeof GracePeriodType)[keyof typeof GracePeriodType]
                                        )
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem
                                            value={GracePeriodType.none}
                                        >
                                            None
                                        </SelectItem>
                                        <SelectItem
                                            value={GracePeriodType.partial}
                                        >
                                            Partial
                                        </SelectItem>
                                        <SelectItem
                                            value={GracePeriodType.total}
                                        >
                                            Total
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                onClick={handleAddGracePeriod}
                                disabled={availablePeriods.length === 0}
                            >
                                Add
                            </Button>
                        </div>
                        {/* List of added grace periods */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {fields.map((field, idx) => (
                                <div
                                    key={field.id}
                                    className="border rounded-md p-3 flex flex-col gap-2 bg-muted/30"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            Period {field.period}
                                        </span>
                                        <button
                                            type="button"
                                            className="ml-auto text-red-500 hover:underline"
                                            onClick={() => remove(idx)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <FormField
                                        control={formState.control}
                                        name={`gracePeriod.${idx}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem
                                                            value={
                                                                GracePeriodType.none
                                                            }
                                                        >
                                                            None
                                                        </SelectItem>
                                                        <SelectItem
                                                            value={
                                                                GracePeriodType.partial
                                                            }
                                                        >
                                                            Partial
                                                        </SelectItem>
                                                        <SelectItem
                                                            value={
                                                                GracePeriodType.total
                                                            }
                                                        >
                                                            Total
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Duration only if not NONE */}
                                    <FormField
                                        control={formState.control}
                                        name={`gracePeriod.${idx}.duration`}
                                        render={({ field: durationField }) => (
                                            <FormItem>
                                                <FormLabel>Duration</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        disabled={
                                                            formState.getValues(
                                                                `gracePeriod.${idx}.type`
                                                            ) ===
                                                            GracePeriodType.none
                                                        }
                                                        {...durationField}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Bond Costs Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Bond Costs</h3>
                        
                        {/* Premium */}
                        <FormField
                            control={formState.control}
                            name="prima"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Premium (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Structuring */}
                        <FormField
                            control={formState.control}
                            name="structuration"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Structuring (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formState.control}
                            name="structurationApplyTo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apply Structuring to</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={Actor.emitter}>
                                                Emitter
                                            </SelectItem>
                                            <SelectItem value={Actor.bondholder}>
                                                Bondholder
                                            </SelectItem>
                                            <SelectItem value={Actor.both}>
                                                Both
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Placement */}
                        <FormField
                            control={formState.control}
                            name="colocation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Placement (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formState.control}
                            name="colocationApplyTo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apply Placement to</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={Actor.emitter}>
                                                Emitter
                                            </SelectItem>
                                            <SelectItem value={Actor.bondholder}>
                                                Bondholder
                                            </SelectItem>
                                            <SelectItem value={Actor.both}>
                                                Both
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Flotation */}
                        <FormField
                            control={formState.control}
                            name="flotation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flotation (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formState.control}
                            name="flotationApplyTo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apply Flotation to</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={Actor.emitter}>
                                                Emitter
                                            </SelectItem>
                                            <SelectItem value={Actor.bondholder}>
                                                Bondholder
                                            </SelectItem>
                                            <SelectItem value={Actor.both}>
                                                Both
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* CAVALI */}
                        <FormField
                            control={formState.control}
                            name="cavali"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CAVALI (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formState.control}
                            name="cavaliApplyTo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apply CAVALI to</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={Actor.emitter}>
                                                Emitter
                                            </SelectItem>
                                            <SelectItem value={Actor.bondholder}>
                                                Bondholder
                                            </SelectItem>
                                            <SelectItem value={Actor.both}>
                                                Both
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    {/* Financial Rates Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Financial Rates</h3>
                        
                        {/* COK */}
                        <FormField
                            control={formState.control}
                            name="cok"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>COK (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Income Tax */}
                        <FormField
                            control={formState.control}
                            name="income_tax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Income Tax (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Botón de Create en la parte inferior derecha */}
                    <div className="flex justify-end mt-8 w-full">
                        <Button type="submit" className="min-w-[120px]">
                            Create
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
