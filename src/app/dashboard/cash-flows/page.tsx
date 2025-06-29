import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PATHS } from "@/lib/defaults";
import { deleteCashFlowAction } from "@/services/cash-flow.service";
import Link from "next/link";

interface Bond {
  id: string;
  name: string;
  emissionDate: string;
  nominalValue: number;
}

export default function CashFlowsPage({ bonds }: { bonds: Bond[] }) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Tus Cash Flows</h1>
      <ul className="space-y-4">
        {bonds.map(bond => (
          <li key={bond.id} className="border rounded-md p-4 flex flex-col gap-1 bg-muted/30">
            <span className="font-semibold text-lg">
              <Link href={PATHS.DASHBOARD.CASH_FLOWS.BY_ID(bond.id)} className="hover:underline text-primary">
                {bond.name}
              </Link>
            </span>
            <span className="text-sm text-muted-foreground">Fecha de creación: {new Date(bond.emissionDate).toLocaleDateString()}</span>
            <span className="text-sm">Nominal: {bond.nominalValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="mt-2 w-fit">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this cash flow?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Are you sure you want to delete `{bond.name}`?
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