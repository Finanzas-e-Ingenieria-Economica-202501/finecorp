"use client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PATHS } from "@/lib/defaults";
import { loginUser } from "@/services/auth.service";
import { UserValidator } from "@/zod/user.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";


export default function Home() {
    const router = useRouter();
    const formState = useForm<z.infer<typeof UserValidator>>({
        resolver: zodResolver(UserValidator),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const onSubmit = formState.handleSubmit(async (data) => {
        try {
            const result = await loginUser(data);
            console.log(result);
            router.push("/dashboard/home");
        } catch (error) {
            console.log("Login error:", error);
            // Aquí podrías mostrar un toast o mensaje de error
            router.push(PATHS.LOGIN);
        }
    });

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Form {...formState}>
                <form onSubmit={onSubmit} className="w-full max-w-md">
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Welcome to Finecorp</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={formState.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Username"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            This is your public display name.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={formState.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            This is your password for logging
                                            in.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full">
                                <span>Login</span>
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </main>
    );
}
