"use client";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    AmortizationMethod,
    CashFlowFormValidator,
    CompoundingFrequency,
    GracePeriodType,
    InterestRateType,
    PaymentFrequency,
} from "@/zod/cash-flow-form.validator";
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
            interestRateType: InterestRateType.EFFECTIVE,
            compoundingFrequency: CompoundingFrequency.ANNUAL,
            interestRate: 5.0,
            nominalValue: 100000,
            comercialValue: 100000,

            paymentFrequency: PaymentFrequency.MONTHLY,
            numberOfPeriods: 12,
            amortizationMethod: AmortizationMethod.GERMAN,
            emissionDate: new Date(),
            maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),

            gracePeriod: [],
            issuer: {
                rate: 0,
                premium: 0,
                structuring: 0,
                placement: 0,
                flotation: 0,
                cavali: 0,
            },
            investor: {
                rate: 0,
                premium: 0,
                structuring: 0,
                placement: 0,
                flotation: 0,
                cavali: 0,
            },
        },
    });

    const numberOfPeriods = useWatch({ control: formState.control, name: "numberOfPeriods" });
    const { fields, append, remove } = useFieldArray({
        control: formState.control,
        name: "gracePeriod",
    });

    // Grace period add form state
    const [selectedPeriod, setSelectedPeriod] = useState(1);
    const [selectedType, setSelectedType] = useState(GracePeriodType.NONE);
    const [loading, setLoading] = useState(false);

    // Helper: get available periods (not already in gracePeriod)
    const usedPeriods = fields.map((f) => f.period);
    const availablePeriods = Array.from({ length: numberOfPeriods || 0 }, (_, i) => i + 1).filter(
        (p) => !usedPeriods.includes(p)
    );

    // Add grace period entry
    const handleAddGracePeriod = () => {
        if (!selectedPeriod || !selectedType) return;
        append({ period: selectedPeriod, type: selectedType, duration: selectedType === GracePeriodType.NONE ? 0 : 1 });
        // Reset selectors
        setSelectedPeriod(availablePeriods[0] || 1);
        setSelectedType(GracePeriodType.NONE);
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
                        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        <span className="text-lg font-medium">Creating bond...</span>
                    </div>
                </div>
            )}
            <Form {...formState}>
                <form onSubmit={onSubmit} className="w-full">
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
                                    <FormDescription>
                                        This is your public display name.
                                    </FormDescription>
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
                                    <FormDescription>
                                        Select the currency for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            <SelectItem value={InterestRateType.NOMINAL}>Nominal</SelectItem>
                                            <SelectItem value={InterestRateType.EFFECTIVE}>Effective</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the type of interest rate for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Compounding Frequency */}
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
                                            <SelectItem value={CompoundingFrequency.ANNUAL}>Annual</SelectItem>
                                            <SelectItem value={CompoundingFrequency.SEMI_ANNUAL}>Semi-Annual</SelectItem>
                                            <SelectItem value={CompoundingFrequency.QUARTERLY}>Quarterly</SelectItem>
                                            <SelectItem value={CompoundingFrequency.BIMONTHLY}>Bimonthly</SelectItem>
                                            <SelectItem value={CompoundingFrequency.MONTHLY}>Monthly</SelectItem>
                                            <SelectItem value={CompoundingFrequency.DAILY}>Daily</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the compounding frequency for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Interest Rate */}
                        <FormField
                            control={formState.control}
                            name="interestRate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interest Rate (%)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="5.0"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the interest rate for the bond.
                                    </FormDescription>
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
                                            type="number"
                                            min="0"
                                            placeholder="100000"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the nominal value of the bond.
                                    </FormDescription>
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
                                    <FormLabel>Comercial Value</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="100000"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the comercial value of the bond.
                                    </FormDescription>
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
                                            <SelectItem value={PaymentFrequency.ANNUAL}>Annual</SelectItem>
                                            <SelectItem value={PaymentFrequency.SEMI_ANNUAL}>Semi-Annual</SelectItem>
                                            <SelectItem value={PaymentFrequency.QUARTERLY}>Quarterly</SelectItem>
                                            <SelectItem value={PaymentFrequency.BIMONTHLY}>Bimonthly</SelectItem>
                                            <SelectItem value={PaymentFrequency.MONTHLY}>Monthly</SelectItem>
                                            <SelectItem value={PaymentFrequency.DAILY}>Daily</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the payment frequency for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Number of Periods */}
                        <FormField
                            control={formState.control}
                            name="numberOfPeriods"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Periods</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="12"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(
                                                    parseInt(e.target.value) || 1
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter the number of periods for the bond.
                                    </FormDescription>
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
                                            <SelectItem value={AmortizationMethod.GERMAN}>German</SelectItem>
                                            <SelectItem value={AmortizationMethod.FRENCH}>French</SelectItem>
                                            <SelectItem value={AmortizationMethod.AMERICAN}>American</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the amortization method for the bond.
                                    </FormDescription>
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
                                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                                            onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Select the emission date for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* Maturity Date */}
                        <FormField
                            control={formState.control}
                            name="maturityDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Maturity Date</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                                            onChange={(e) => field.onChange(new Date(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Select the maturity date for the bond.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Grace Periods</h3>
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Period selector */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Period</label>
                                <Select
                                    value={selectedPeriod.toString()}
                                    onValueChange={val => setSelectedPeriod(Number(val))}
                                    disabled={availablePeriods.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select period" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availablePeriods.map((p) => (
                                            <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <Select
                                    value={selectedType}
                                    onValueChange={val => setSelectedType(val as GracePeriodType)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={GracePeriodType.NONE}>None</SelectItem>
                                        <SelectItem value={GracePeriodType.PARTIAL}>Partial</SelectItem>
                                        <SelectItem value={GracePeriodType.TOTAL}>Total</SelectItem>
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
                                <div key={field.id} className="border rounded-md p-3 flex flex-col gap-2 bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Period {field.period}</span>
                                        <button
                                            type="button"
                                            className="ml-auto text-red-500 hover:underline"
                                            onClick={() => remove(idx)}
                                        >Remove</button>
                                    </div>
                                    <FormField
                                        control={formState.control}
                                        name={`gracePeriod.${idx}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={GracePeriodType.NONE}>None</SelectItem>
                                                        <SelectItem value={GracePeriodType.PARTIAL}>Partial</SelectItem>
                                                        <SelectItem value={GracePeriodType.TOTAL}>Total</SelectItem>
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
                                                        type="number"
                                                        min="0"
                                                        disabled={formState.getValues(`gracePeriod.${idx}.type`) === GracePeriodType.NONE}
                                                        value={durationField.value ?? 0}
                                                        onChange={e => durationField.onChange(Number(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    {formState.getValues(`gracePeriod.${idx}.type`) === GracePeriodType.NONE
                                                        ? "No grace period for this period."
                                                        : "Set the duration for this grace period (in periods)."}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Issuer Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Issuer Costs</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={formState.control} name="issuer.premium" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Premium (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="issuer.structuring" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Structuring (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="issuer.placement" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Placement (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="issuer.flotation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flotation (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="issuer.cavali" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CAVALI (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Investor Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Investor Costs</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={formState.control} name="investor.premium" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Premium (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="investor.structuring" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Structuring (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="investor.placement" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Placement (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="investor.flotation" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flotation (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={formState.control} name="investor.cavali" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CAVALI (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    {/* Botón de Create en la parte inferior derecha */}
                    <div className="flex justify-end mt-8 w-full">
                        <Button type="submit" className="min-w-[120px]">Create</Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
