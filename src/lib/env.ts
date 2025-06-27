import { z } from "zod";

const envSchema = z.object({
  JWT_SECRET: z.string().min(10, "JWT_SECRET debe tener al menos 10 caracteres"),
  JWT_EXPIRES_IN: z.string().regex(/^\d+$/, "JWT_EXPIRES_IN debe ser un número").transform(Number),
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL válida"),
  DIRECT_URL: z.string().url("DIRECT_URL debe ser una URL válida"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Validar variables de entorno al importar este módulo
const env = envSchema.parse(process.env);

export const DEFAULTS = {
  SALT: 10,
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
} as const;
