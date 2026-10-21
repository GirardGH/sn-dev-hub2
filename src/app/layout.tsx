import { cookies } from "next/headers";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { isLanguage, LANGUAGE_COOKIE } from "@/i18n/translate";
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SN Dev Hub",
  description: "ServiceNow Development Manager",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const savedLanguage = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  const language = isLanguage(savedLanguage) ? savedLanguage : "fr";
  return (
    <html lang={language}>
      <body className="antialiased">
        <LanguageProvider initialLanguage={language}>{children}
        <Toaster position="top-right" richColors closeButton /></LanguageProvider>
      </body>
    </html>
  );
}
