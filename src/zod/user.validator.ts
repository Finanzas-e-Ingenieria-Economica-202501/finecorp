import { z } from "zod";

export 
const UserValidator = z.object({
    username: z.string().min(1, "Username is required").max(20, "Username must be at most 20 characters"),
    password: z.string().min(6, "Password must be at least 6 characters").max(30, "Password must be at most 30 characters"),
});