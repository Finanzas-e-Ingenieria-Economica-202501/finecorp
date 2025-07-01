"use client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { PATHS } from "@/lib/defaults";
import { deleteCashFlowAction } from "@/services/cash-flow.service";
import * as React from "react";

export interface CashFlowListItemProps {
  bond: {
    id: string;
    bond_name: string;
    emission_date: string | Date;
    nominal_value: number | string;
  };
  onDeleted?: () => void;
}

export function CashFlowListItem({ bond, onDeleted }: CashFlowListItemProps) {
  return (
    <li className="border rounded-md p-4 flex flex-col gap-1 bg-muted/30">
      <span className="font-semibold text-lg">
        <Link href={PATHS.DASHBOARD.CASH_FLOWS.BY_ID(bond.id)} className="hover:underline text-primary">
          {bond.bond_name}
        </Link>
      </span>
      <span className="text-sm text-muted-foreground">
        Fecha de creación: {new Date(bond.emission_date).toLocaleDateString()}
      </span>
      <span className="text-sm">
        Nominal: {Number(bond.nominal_value).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
      </span>
      <div className="flex gap-2 mt-2">
        <Link href={PATHS.DASHBOARD.CASH_FLOWS.EDIT(bond.id)}>
          <Button type="button" variant="outline" size="sm">
            Editar
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm">Eliminar</Button>
          </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este flujo de caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar `{bond.bond_name}`?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await deleteCashFlowAction(bond.id);
                  if (onDeleted) onDeleted();
                  else window.location.reload();
                }}
              >
                Eliminar
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </li>
  );
}
