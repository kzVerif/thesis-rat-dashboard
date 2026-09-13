import { ScanProvider } from "@/components/av-scan/scan-provider";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <ScanProvider>{children}</ScanProvider>;
}
