"use server";
import { DEFAULTS } from "@/lib/defaults";
import jwt from "jsonwebtoken";

export async function jwtSign({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const options: jwt.SignOptions = {
    expiresIn: DEFAULTS.JWT_EXPIRES_IN,
  };

  const token = jwt.sign({ username, password }, DEFAULTS.JWT_SECRET, options);

  return token;
}
