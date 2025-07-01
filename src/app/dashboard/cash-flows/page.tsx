import { getCurrentUser } from "@/services/auth.service";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { CashFlowListItem } from "@/components/cash-flow-list-item";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/lib/defaults";

export default async function CashFlowsPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const bonds = await prisma.bond_valuation.findMany({
    where: { user_id: user.id }, // Only fetch bonds for current user
    orderBy: { emission_date: "desc" },
    select: {
      id: true,
      bond_name: true,
      emission_date: true,
      nominal_value: true,
    },
  });


  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Tus Cash Flows</h1>
      {bonds.length === 0 ? (
        <div className="border rounded-lg p-8 flex flex-col items-center justify-center bg-muted/30 text-center">
          <span className="text-lg font-semibold mb-2">No tienes cash flows registrados</span>
          <span className="text-muted-foreground mb-6">Crea tu primer flujo de caja para comenzar.</span>
          <Link href={PATHS.DASHBOARD.CASH_FLOWS.NEW}>
            <Button className="mt-2">Crear</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {bonds.map(bond => (
            <CashFlowListItem
              key={bond.id}
              bond={{
                ...bond,
                nominal_value: Number(bond.nominal_value),
                emission_date: bond.emission_date instanceof Date ? bond.emission_date.toISOString() : String(bond.emission_date),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}