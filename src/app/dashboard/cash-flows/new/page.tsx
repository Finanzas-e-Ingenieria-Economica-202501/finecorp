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
import React, { useState } from "react";
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
            numberOfPeriods: 12,
            amortizationMethod: AmortizationMethod.german,
            emissionDate: new Date(),
            maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            prima: 0,
            structuration: 0,
            colocation: 0,
            flotation: 0,
            cavali: 0,
            structurationApplyTo: Actor.emitter,
            colocationApplyTo: Actor.emitter,
            flotationApplyTo: Actor.both,
            cavaliApplyTo: Actor.both,
            gracePeriod: [],
        },
    });

    const numberOfPeriods = useWatch({
        control: formState.control,
        name: "numberOfPeriods",
    });
    const interestRateType = useWatch({
        control: formState.control,
        name: "interestRateType",
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

    // Helper: get available periods (not already in gracePeriod)
    const usedPeriods = fields.map((f) => f.period);
    const availablePeriods = Array.from(
        { length: numberOfPeriods || 0 },
        (_, i) => i + 1
    ).filter((p) => !usedPeriods.includes(p));

    // Add grace period entry
    const handleAddGracePeriod = () => {
        if (!selectedPeriod || !selectedType) return;
        append({
            period: selectedPeriod,
            type: selectedType,
            duration: selectedType === GracePeriodType.none ? 0 : 1,
        });
        // Reset selectors
        setSelectedPeriod(availablePeriods[0] || 1);
        setSelectedType(GracePeriodType.none);
    };

    const onSubmit = formState.handleSubmit(async (data) => {
        setLoading(true);
        try {
            const result = await createCashFlowAction(data);
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

                        {/* Selector de moneda */}
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
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Interest Rate Type
                                    </label>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select interest rate type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={InterestRateType.nominal}>
                                                Nominal
                                            </SelectItem>
                                            <SelectItem value={InterestRateType.effective}>
                                                Effective
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        />
                        {/* Compounding Frequency: only show if Nominal */}
                        {interestRateType === InterestRateType.nominal && (
                            <FormField
                                control={formState.control}
                                name="compoundingFrequency"
                                render={({ field }) => (
                                    <div className="flex items-center gap-4 w-full">
                                        <label className="w-40 shrink-0 text-sm font-medium">
                                            Compounding Frequency
                                        </label>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select compounding frequency" />
                                            </SelectTrigger>
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
                                    </div>
                                )}
                            />
                        )}
                        {/* Interest Rate */}
                        <FormField
                            control={formState.control}
                            name="interestRate"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Interest Rate (%)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="5.0"
                                        className="flex-1"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                        {/* Nominal Value */}
                        <FormField
                            control={formState.control}
                            name="nominalValue"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Nominal Value
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="100000"
                                        className="flex-1"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                        {/* Comercial Value */}
                        <FormField
                            control={formState.control}
                            name="comercialValue"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Comercial Value
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="100000"
                                        className="flex-1"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                parseFloat(e.target.value) || 0
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                        {/* Payment Frequency */}
                        <FormField
                            control={formState.control}
                            name="paymentFrequency"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Payment Frequency
                                    </label>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select payment frequency" />
                                        </SelectTrigger>
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
                                </div>
                            )}
                        />
                        {/* Number of Periods */}
                        <FormField
                            control={formState.control}
                            name="numberOfPeriods"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Number of Periods
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="12"
                                        className="flex-1"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                parseInt(e.target.value) || 1
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                        {/* Amortization Method */}
                        <FormField
                            control={formState.control}
                            name="amortizationMethod"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Amortization Method
                                    </label>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select amortization method" />
                                        </SelectTrigger>
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
                                </div>
                            )}
                        />
                        {/* Emission Date */}
                        <FormField
                            control={formState.control}
                            name="emissionDate"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Emission Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={
                                            field.value
                                                ? new Date(field.value)
                                                      .toISOString()
                                                      .split("T")[0]
                                                : ""
                                        }
                                        className="flex-1"
                                        onChange={(e) =>
                                            field.onChange(
                                                new Date(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                        {/* Maturity Date */}
                        <FormField
                            control={formState.control}
                            name="maturityDate"
                            render={({ field }) => (
                                <div className="flex items-center gap-4 w-full">
                                    <label className="w-40 shrink-0 text-sm font-medium">
                                        Maturity Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={
                                            field.value
                                                ? new Date(field.value)
                                                      .toISOString()
                                                      .split("T")[0]
                                                : ""
                                        }
                                        className="flex-1"
                                        onChange={(e) =>
                                            field.onChange(
                                                new Date(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Grace Periods</h3>
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
                                                {/* <FormMessage /> */}
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
                                                        type="number"
                                                        min="0"
                                                        disabled={
                                                            formState.getValues(
                                                                `gracePeriod.${idx}.type`
                                                            ) ===
                                                            GracePeriodType.none
                                                        }
                                                        value={
                                                            durationField.value ??
                                                            0
                                                        }
                                                        onChange={(e) =>
                                                            durationField.onChange(
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                )
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                {/* <FormMessage /> */}
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Bond Costs Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Bond Costs</h3>
                        <div className="flex flex-col gap-4">
                            {/* Premium */}
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Premium (%)
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="prima"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="flex-1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>
                            {/* Structuring */}
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Structuring (%)
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="structuration"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="flex-1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Apply Structuring to
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="structurationApplyTo"
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
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
                                    )}
                                />
                            </div>
                            {/* Placement */}
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Placement (%)
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="colocation"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="flex-1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Apply Placement to
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="colocationApplyTo"
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
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
                                    )}
                                />
                            </div>
                            {/* Flotation */}
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Flotation (%)</label>
                                <FormField
                                    control={formState.control}
                                    name="flotation"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="flex-1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Apply Flotation to
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="flotationApplyTo"
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
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
                                    )}
                                />
                            </div>
                            {/* CAVALI */}
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    CAVALI (%)</label>
                                <FormField
                                    control={formState.control}
                                    name="cavali"
                                    render={({ field }) => (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="flex-1"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex items-center gap-4 w-full">
                                <label className="w-40 shrink-0 text-sm font-medium">
                                    Apply CAVALI to
                                </label>
                                <FormField
                                    control={formState.control}
                                    name="cavaliApplyTo"
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select actor" />
                                            </SelectTrigger>
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
                                    )}
                                />
                            </div>
                        </div>
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
