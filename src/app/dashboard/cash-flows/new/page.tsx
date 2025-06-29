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
import { useForm } from "react-hook-form";

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
            maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            gracePeriod: {
                type: GracePeriodType.NONE,
                duration: 0,
            },
            issuer: {
                rate: 0,
                taxesOrWithholding: 0,
                fees: 0,
                initialExpenses: 0,
                structuringCosts: 0,
                legalFees: 0,
                otherCosts: 0,
            },
            investor: {
                rate: 0,
                taxesOrWithholding: 0,
                fees: 0,
                initialExpenses: 0,
                structuringCosts: 0,
                legalFees: 0,
                otherCosts: 0,
            },
        },
    });

    const onSubmit = formState.handleSubmit((data) => {
        console.log("Form submitted with data:", data);
    });

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Form {...formState}>
                <form onSubmit={onSubmit}>
                    <FormField
                        control={formState.control}
                        name="bondName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bond Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Bond Name" {...field} />
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
                                <FormControl>
                                    <select
                                        {...field}
                                        className="input input-bordered w-full"
                                    >
                                        <option value="USD">
                                            USD - US Dollar
                                        </option>
                                        <option value="PEN">
                                            PEN - Sol Peruano
                                        </option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="JPY">
                                            JPY - Yen Japonés
                                        </option>
                                    </select>
                                </FormControl>
                                <FormDescription>
                                    Select the currency for the bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator className="my-4" />

                    <FormField
                        control={formState.control}
                        name="interestRateType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Interest Rate Type</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        className="input input-bordered w-full"
                                    >
                                        <option
                                            value={InterestRateType.NOMINAL}
                                        >
                                            Nominal
                                        </option>
                                        <option
                                            value={InterestRateType.EFFECTIVE}
                                        >
                                            Effective
                                        </option>
                                    </select>
                                </FormControl>
                                <FormDescription>
                                    Select the type of interest rate for the
                                    bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={formState.control}
                        name="compoundingFrequency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Compounding Frequency</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        className="input input-bordered w-full"
                                    >
                                        <option
                                            value={CompoundingFrequency.ANNUAL}
                                        >
                                            Annual
                                        </option>
                                        <option
                                            value={
                                                CompoundingFrequency.SEMI_ANNUAL
                                            }
                                        >
                                            Semi-Annual
                                        </option>
                                        <option
                                            value={
                                                CompoundingFrequency.QUARTERLY
                                            }
                                        >
                                            Quarterly
                                        </option>
                                        <option
                                            value={
                                                CompoundingFrequency.BIMONTHLY
                                            }
                                        >
                                            Bimonthly
                                        </option>
                                        <option
                                            value={CompoundingFrequency.MONTHLY}
                                        >
                                            Monthly
                                        </option>
                                        <option
                                            value={CompoundingFrequency.DAILY}
                                        >
                                            Daily
                                        </option>
                                    </select>
                                </FormControl>
                                <FormDescription>
                                    Select the compounding frequency for the
                                    bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator className="my-4" />

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
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter the interest rate for the bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

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
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter the nominal value of the bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

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
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter the comercial value of the bond.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                  
                </form>
            </Form>
        </div>
    );
}
