// Este archivo está deprecado. Usar src/lib/env.ts en su lugar.
// Se mantiene para compatibilidad hacia atrás.
export const DEFAULTS = {
    SALT: 10,
    JWT_SECRET: process.env.JWT_SECRET || "default",
    JWT_EXPIRES_IN: Number.parseInt(process.env.JWT_EXPIRES_IN || "3600"),
}

export const PATHS = {
    ROOT: "/",
    DASHBOARD: {
        HOME: "/dashboard/home",
        CASH_FLOWS: {
            ROOT: "/dashboard/cash-flows",
            NEW: "/dashboard/cash-flows/new",
            BY_ID: (id: string) => `/dashboard/cash-flows/${id}`,
            EDIT: (id: string) => `/dashboard/cash-flows/edit/${id}`,
        }
    },
    LOGIN: "/",
    REGISTER: "/",
}