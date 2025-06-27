export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La verificación JWT ahora se maneja en el middleware
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {children}
    </div>
  );
}
