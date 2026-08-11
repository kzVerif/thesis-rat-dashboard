import type { Metadata } from "next";
import { Kanit, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const kanit = Kanit({
  subsets: ["thai", "latin"], // ⚠️ สำคัญมาก: ต้องมี 'thai' ไม่งั้นตัวอักษรไทยจะแสดงเป็นสี่เหลี่ยม
  weight: ["300", "400", "500", "700"], // เลือกเฉพาะน้ำหนักที่ต้องการใช้ เพื่อลดขนาดไฟล์
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAT_System",
  description: "ระบบควบคุมและจัดการอุปกรณ์ระยะไกล",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        kanit.className,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="flex flex-col">
        <NextTopLoader />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
