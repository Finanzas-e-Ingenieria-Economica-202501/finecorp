import { testGermanMethod, CashFlowPeriod } from './src/lib/german-method-calculator';
import { format } from 'date-fns';

// Test the German method calculation
console.log('Testing German Method Bond Calculation...\n');

try {
  const result = testGermanMethod();
  
  console.log('=== CALCULATION SUMMARY ===');
  console.log(`Coupon Frequency: ${result.summary.couponFrequency} days`);
  console.log(`Capitalization Days: ${result.summary.capitalizationDays}`);
  console.log(`Periods Per Year: ${result.summary.periodsPerYear}`);
  console.log(`Total Periods: ${result.summary.totalPeriods}`);
  console.log(`Effective Annual Coupon Rate (TEA): ${result.summary.effectiveAnnualCouponRate.toFixed(5)}%`);
  console.log(`Effective Period Coupon Rate: ${result.summary.effectivePeriodCouponRate.toFixed(3)}%`);
  console.log(`Period COK: ${result.summary.periodCOK.toFixed(3)}%`);
  console.log(`Initial Emitter Costs: ${result.summary.initialEmitterCosts.toFixed(2)}`);
  console.log(`Initial Bondholder Costs: ${result.summary.initialBondholderCosts.toFixed(2)}`);
  console.log(`Actual Price: ${result.summary.actualPrice.toFixed(2)}`);
  console.log(`Utility/Loss: ${result.summary.utility.toFixed(2)}`);
  console.log(`Duration: ${result.summary.duration.toFixed(2)}`);
  console.log(`Convexity: ${result.summary.convexity.toFixed(2)}`);
  console.log(`Total: ${result.summary.total.toFixed(2)}`);
  console.log(`Modified Duration: ${result.summary.modifiedDuration.toFixed(2)}`);
  console.log(`Emitter TCEA: ${result.summary.emitterTCEA.toFixed(5)}%`);
  console.log(`Emitter TCEA with Shield: ${result.summary.emitterTCEAWithShield.toFixed(5)}%`);
  console.log(`Bondholder TREA: ${result.summary.bondholderTREA.toFixed(5)}%`);
  
  console.log('\n=== CASH FLOW PERIODS ===');
  console.log('Nº\tFecha\t\t\tGracia\tBono\t\tCupon\t\tCuota\t\tAmort.\t\tPrima\t\tEscudo\t\tFlujo Emisor\tFlujo c/Escudo\tFlujo Bonista\tFlujo Act.\tFA x Plazo\tFactor Convex.');
  
  result.periods.forEach((period: CashFlowPeriod) => {
    const dateStr = format(period.programmingDate, 'dd/MM/yyyy');
    console.log(
      `${period.period}\t${dateStr}\t${period.gracePeriodType}\t${period.bond.toFixed(2)}\t\t${period.coupon.toFixed(2)}\t\t${period.quota.toFixed(2)}\t\t${period.amortization.toFixed(2)}\t\t${period.premium.toFixed(2)}\t\t${period.shield.toFixed(2)}\t\t${period.emitterFlow.toFixed(2)}\t\t${period.emitterFlowWithShield.toFixed(2)}\t\t${period.bondholderFlow.toFixed(2)}\t\t${period.actualFlow.toFixed(2)}\t${period.faXTerm.toFixed(2)}\t${period.convexityFactor.toFixed(2)}`
    );
  });
  
} catch (error) {
  console.error('Error in calculation:', error);
}
