import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberDude Live Internship 2025",
  description:
    "Discover the CyberDude Live Internship 2025 - an immersive program connecting talented interns with industry leaders. Explore profiles, projects, and opportunities in technology and innovation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable}  antialiased`}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
