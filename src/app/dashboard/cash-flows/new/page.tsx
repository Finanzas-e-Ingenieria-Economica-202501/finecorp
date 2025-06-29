"use client";
import { AmortizationMethod, CashFlowFormValidator, CompoundingFrequency, GracePeriodType, InterestRateType, PaymentFrequency } from "@/zod/cash-flow-form.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";


export default function NewCashFlowPage() {

    const formState = useForm({
        resolver: zodResolver(CashFlowFormValidator),
        defaultValues: {
            currency: "USD",
            interestRateType: InterestRateType.EFFECTIVE,
            compoundingFrequency: CompoundingFrequency.ANNUAL,
            bondName: "Bond Name",
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
            },
        },
    });

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-2xl font-bold mb-4">New Cash Flow Simulation</h1>
      <p className="text-gray-600">This page is under construction.</p>
      <p className="text-gray-600">Please check back later!</p>
    </div>
  );
}