"use server";

import { DEFAULTS } from "@/lib/defaults";
import prisma from "@/lib/prisma";
import { UserValidator } from "@/zod/user.validator";
import { hash } from "bcrypt";



export async function registerUser({ username, password }: { username: string, password: string }) {
    if (await prisma.users.findUnique({ where: { username } })) {
        throw new Error("Username already exists");
    }

    UserValidator.safeParse({ username, password });

    const hashedPassword = await hash(password, DEFAULTS.SALT);

    prisma.users.create({
        data: {
            username,
            hashedPassword,
        },
    });

    return true;
}