import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/supabase-provider";

export const metadata: Metadata = {
  title: "Instagram Scraper Dashboard",
  description: "MVP de scraping y análisis de perfiles de Instagram",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans antialiased">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
