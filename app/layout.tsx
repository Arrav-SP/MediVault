import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediVault",
  description: "Your secure personal health platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header>
          <nav>
            <strong>
              <Link href="/dashboard">MediVault</Link>
            </strong>

            {" | "}

            <Link href="/dashboard">Dashboard</Link>

            {" | "}

            <Link href="/records">Records</Link>

            {" | "}

            <Link href="/medications">Medications</Link>

            {" | "}

            <Link href="/conditions">Conditions</Link>

            {" | "}

            <Link href="/health-metrics">Health Metrics</Link>

            {" | "}

            <Link href="/goals">Goals</Link>

            {" | "}

            <Link href="/activities">Activities</Link>

            {" | "}

            <Link href="/profile">Profile</Link>
          </nav>
        </header>

        <hr />

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}