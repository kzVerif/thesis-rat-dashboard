import TokenManagement from "./_components/TokenManagement";
import { getTokensSnapshot } from "./_lib/tokens-server";

export default async function TokensPage() {
  const snapshot = await getTokensSnapshot();
  return <div className="mx-auto w-full max-w-7xl"><header className="mb-6 sm:mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Tokens</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">จัดการ Enrollment Tokens</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">สร้างและจัดการ Token สำหรับลงทะเบียน Agent พร้อมกำหนดโควตาและวันหมดอายุ โดยใช้สิทธิ์ tokens.manage</p></header><TokenManagement snapshot={snapshot} /></div>;
}
