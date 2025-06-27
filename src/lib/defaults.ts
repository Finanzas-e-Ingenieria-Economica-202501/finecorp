export const DEFAULTS =  {
    SALT: 10,
    JWT_SECRET: process.env.JWT_SECRET || "default",
    JWT_EXPIRES_IN: Number.parseInt(process.env.JWT_EXPIRES_IN || "3600"),
}