// @ts-nocheck
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BwengePlus - E-Learning Platform",
  description: "Premium online courses, MOOC & SPOC education platform integrated with Ongera",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {googleClientId ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            <Providers>
              {children}
            </Providers>
          </GoogleOAuthProvider>
        ) : (
          <Providers>
            {children}
          </Providers>
        )}
      </body>
    </html>
  );
}