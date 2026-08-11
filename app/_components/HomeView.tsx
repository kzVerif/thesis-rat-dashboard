import type { HomeSnapshot } from "../_lib/types";

export default function HomeView({ snapshot }: { snapshot: HomeSnapshot }) {
  return (
    <main className="container">
      <p>Hello world</p>
      <p className="text-xs text-slate-500">Data source: {snapshot.source}</p>
    </main>
  );
}

