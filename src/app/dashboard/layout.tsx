import { jwtVerify } from "@/services/jwt.service";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("token")?.value;

  try {
    await jwtVerify(token as string);
  } catch (error) {
    console.error("Error verifying JWT:", error);
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {children}
    </div>
  );
}
