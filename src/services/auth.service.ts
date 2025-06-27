"use server";

import { DEFAULTS } from "@/lib/defaults";
import prisma from "@/lib/prisma";
import { JWTPayload } from "@/types/jwt.types";
import { UserValidator } from "@/zod/user.validator";
import bcrypt from "bcrypt";
import { jwtSign, jwtVerify } from "./jwt.service";
import { cookies } from "next/headers";

export async function registerUser({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<{ username: string; id: string; token: string }> {
  if (await prisma.users.findUnique({ where: { username } })) {
    throw new Error("Username already exists");
  }

  const validation = UserValidator.safeParse({ username, password });
  
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const hashedPassword = await bcrypt.hash(password, DEFAULTS.SALT);

  const user = await prisma.users.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  const token = await jwtSign({ username: user.username, id: user.id });

  return { username: user.username, id: user.id, token };
}

export async function loginUser({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const user = await prisma.users.findUnique({ where: { username } });
  const cookiesStore = await cookies();

  if (!user) {
    // User not found to avoid register view, so we just create a new user
    // I know we should not do this in production, but for this demo we can do it :3
    const result = await registerUser({ username, password });

  cookiesStore.set("token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULTS.JWT_EXPIRES_IN, // Usar el mismo tiempo de expiración que el JWT
    path: "/",
  });

    return result;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const token = await jwtSign({ username: user.username, id: user.id });

  cookiesStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULTS.JWT_EXPIRES_IN, // Usar el mismo tiempo de expiración que el JWT
    path: "/",
  });

  return { username: user.username, id: user.id, token };
}

export async function logoutUser() {
  const cookiesStore = await cookies();
  
  cookiesStore.delete("token");
}

export async function getCurrentUser(): Promise<JWTPayload> {
  const token = (await cookies()).get("token")?.value;
  
  if (!token) {
    throw new Error("No token found");
  }
  
  try {
    const decoded = await jwtVerify(token);
    return decoded;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw new Error("Invalid token");
  }
}
