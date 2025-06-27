"use server";
import { DEFAULTS } from "@/lib/defaults";
import { JWTPayload } from "@/types/jwt.types";
import jwt from "jsonwebtoken";

export async function jwtSign({
  username,
  id,
}: {
  username: string;
  id: string;
}): Promise<string> {
  const options: jwt.SignOptions = {
    expiresIn: DEFAULTS.JWT_EXPIRES_IN,
  };

  const token = jwt.sign({ username, id }, DEFAULTS.JWT_SECRET, options);

  return token;
}

export async function jwtVerify(token: string): Promise<JWTPayload> {
  try {
    const decoded = jwt.verify(token, DEFAULTS.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new Error("Invalid token");
  }
}

export async function refreshToken(token: string): Promise<string> {
  try {
    const decoded = await jwtVerify(token);

    // Verificar si el token expira en menos de 5 minutos
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = decoded.exp || 0;
    const timeUntilExpiration = expirationTime - currentTime;

    // Si expira en menos de 5 minutos (300 segundos), generar un nuevo token
    if (timeUntilExpiration < 300) {
      return await jwtSign({ username: decoded.username, id: decoded.id });
    }

    return token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw new Error("Invalid token for refresh");
  }
}