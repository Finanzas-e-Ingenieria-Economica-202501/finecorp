
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logoutUser } from "@/services/auth.service";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logoutUser();
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <main className="w-full max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Panel de Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                        ¡Bienvenido al dashboard! Tu JWT ha sido verificado correctamente.
                    </p>
                    <div className="flex justify-center">
                        <Button onClick={handleLogout} variant="outline">
                            Cerrar Sesión
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}