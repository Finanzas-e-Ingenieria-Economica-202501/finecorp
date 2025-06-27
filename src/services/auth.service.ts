"use server";

import { DEFAULTS } from "@/lib/defaults";
import prisma from "@/lib/prisma";
import { UserValidator } from "@/zod/user.validator";
import bcrypt from "bcrypt";



export async function registerUser({ username, password }: { username: string, password: string }) : Promise<{ username: string, password: string }> {
    if (await prisma.users.findUnique({ where: { username } })) {
        throw new Error("Username already exists");
    }

    UserValidator.safeParse({ username, password });

    const hashedPassword = await bcrypt.hash(password, DEFAULTS.SALT);

    const user = await prisma.users.create({
        data: {
            username,
            password: hashedPassword,
        },
    });

    return {username: user.username, password};
}

export async function loginUser({ username, password }: { username: string, password: string }) {
    const user = await prisma.users.findUnique({ where: { username } });

    if (!user) {
        // User not found to avoid register view, so we just create a new user
        // I know we should not do this in production, but for this demo we can do it :3
        const result = await registerUser({ username, password });
        return result;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new Error("Invalid password");
    }

    return user;
}