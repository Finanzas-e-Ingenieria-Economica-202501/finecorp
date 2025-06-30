import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PATHS } from "@/lib/defaults";
import { deleteCashFlowAction } from "@/services/cash-flow.service";
import Link from "next/link";
import { getCurrentUser } from "@/services/auth.service";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

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
      <ul className="space-y-4">
        {bonds.map(bond => (
          <li key={bond.id} className="border rounded-md p-4 flex flex-col gap-1 bg-muted/30">
            <span className="font-semibold text-lg">
              <Link href={PATHS.DASHBOARD.CASH_FLOWS.BY_ID(bond.id)} className="hover:underline text-primary">
                {bond.bond_name}
              </Link>
            </span>
            <span className="text-sm text-muted-foreground">Fecha de creación: {new Date(bond.emission_date).toLocaleDateString()}</span>
            <span className="text-sm">Nominal: {Number(bond.nominal_value).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="mt-2 w-fit">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this cash flow?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Are you sure you want to delete `{bond.bond_name}`?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => { 
                        await deleteCashFlowAction(bond.id);
                        // Opcional: recargar la página o actualizar el estado para reflejar el borrado
                        window.location.reload();
                      }}
                    >
                      Delete
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </div>
  );
}