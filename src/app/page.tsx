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
import { toast } from "sonner";

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
            router.push(PATHS.DASHBOARD.CASH_FLOWS.ROOT);
        } catch (error) {
            console.log("Login error:", error);
            toast.error(
                error instanceof Error ? error.message : "Error al iniciar sesión. Intenta de nuevo."
            );
        }
    });

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <Form {...formState}>
                <form onSubmit={onSubmit} className="w-full max-w-md">
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Bienvenido a Finecorp</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={formState.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Usuario</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Usuario"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Este es tu nombre de usuario público.
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
                                        <FormLabel>Contraseña</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Contraseña"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Esta es tu contraseña para iniciar sesión.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={formState.formState.isSubmitting}>
                                {formState.formState.isSubmitting ? (
                                    <span>Cargando...</span>
                                ) : (
                                    <span>Iniciar Sesión</span>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </main>
    );
}
