"use server";
import { DEFAULTS } from "@/lib/defaults";
import jwt from "jsonwebtoken";

export async function jwtSign({
  username,
  id,
}: {
  username: string;
  id: string;
}) {
  const options: jwt.SignOptions = {
    expiresIn: DEFAULTS.JWT_EXPIRES_IN,
  };

  const token = jwt.sign({ username, id }, DEFAULTS.JWT_SECRET, options);

  return token;
}

export async function jwtVerify(token: string) {
  try {
    const decoded = jwt.verify(token, DEFAULTS.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    throw new Error("Invalid token");
  }
}