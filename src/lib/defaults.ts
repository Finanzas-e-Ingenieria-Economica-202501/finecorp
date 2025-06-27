// Este archivo está deprecado. Usar src/lib/env.ts en su lugar.
// Se mantiene para compatibilidad hacia atrás.
export const DEFAULTS = {
    SALT: 10,
    JWT_SECRET: process.env.JWT_SECRET || "default",
    JWT_EXPIRES_IN: Number.parseInt(process.env.JWT_EXPIRES_IN || "3600"),
}