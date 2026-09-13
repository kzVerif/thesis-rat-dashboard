import type { ScanComputer } from "@/app/(system)/av-scans/_lib/types";
import { isTerminal, jobFinished, statusLabels, type ScanJob } from "./virus-scan";

const escape = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const date = (value?: string | null) => value && !Number.isNaN(Date.parse(value))
  ? new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "—";
const modes = { quick: "สแกนด่วน (Quick)", full: "สแกนทั้งเครื่อง (Full)", custom: "สแกนเส้นทางที่กำหนด (Custom)" };

export function buildScanReport(job: ScanJob, computers: ScanComputer[], exportedAt = new Date()) {
  const statusLabel = (status: keyof typeof statusLabels) => job.source === "api" && status === "QUEUED" ? "รอดำเนินการ (PENDING)" : statusLabels[status];
  const unit = job.source === "api" ? "รายการ" : "เครื่อง";
  const inventory = new Map(computers.map(computer => [computer.id, computer]));
  const count = (status: string) => job.targets.filter(target => target.status === status).length;
  const total = job.complete ? Math.max(job.expected ?? 0, job.targets.length) : job.expected;
  const rooms = [...new Set(job.targets.map(target => inventory.get(target.agent_id)?.room || "ไม่ทราบห้อง"))];
  const summary = [
    ["สั่งงานทั้งหมด", total === undefined ? "ยังไม่ทราบจำนวนทั้งหมด" : `${total} เครื่อง`],
    ["มีข้อมูลในรายงาน", `${job.targets.length} ${unit}`],
    ["สแกนสำเร็จ", `${count("SUCCEEDED")} ${unit}`],
    ["สแกนไม่สำเร็จ", `${count("FAILED")} ${unit}`],
    ["ยกเลิก", `${count("CANCELLED")} ${unit}`],
    ["หมดอายุ", `${count("EXPIRED")} ${unit}`],
    ["ยังไม่ได้รับผลสุดท้าย", `${job.targets.filter(target => !isTerminal(target.status)).length} ${unit}`],
    ["ยังไม่มีข้อมูลรายเครื่อง", total === undefined ? "ยังไม่ทราบ" : `${Math.max(0, total - job.targets.length)} เครื่อง`],
  ];
  const rows = job.targets.map((target, index) => {
    const computer = inventory.get(target.agent_id);
    return `<tr><td>${index + 1}</td><td>${escape(computer?.hostname || target.agent_id)}<br><small>${escape(computer?.ip || "ไม่ทราบ IP")}</small></td><td>${escape(computer?.room || "ไม่ทราบห้อง")}</td><td>${escape(statusLabel(target.status))}</td><td>${escape(date(target.finished_at))}</td></tr>`;
  }).join("");
  const details = job.targets.map((target, index) => {
    const computer = inventory.get(target.agent_id);
    return `<article><h3>${index + 1}. ${escape(computer?.hostname || target.agent_id)} — ${escape(statusLabel(target.status))}</h3>
      <p>ห้อง: ${escape(computer?.room || "ไม่ทราบห้อง")} · IP: ${escape(computer?.ip || "ไม่ทราบ IP")}</p>
      <p>Agent ID: ${escape(target.agent_id)}<br>${job.source === "api" ? "Result ID" : "Request ID"}: ${escape(target.request_id)}</p>
      ${job.source === "api" ? `<p>Command ID: ${escape(target.result?.command_id)}<br>ไฟล์ที่สแกน: ${escape(target.result?.total_files_scanned)}<br>ภัยคุกคามที่พบ: ${escape(target.result?.threats_found)}</p>` : ""}
      <p>ประเภท: ${escape(modes[target.scan_type])}${target.path ? `<br>เส้นทาง: ${escape(target.path)}` : ""}</p>
      <p>สร้าง: ${escape(date(target.created_at))}<br>เริ่ม: ${escape(date(target.started_at))}<br>สิ้นสุด: ${escape(date(target.finished_at))}</p>
      ${target.message ? `<p>${escape(target.message)}</p>` : ""}
      <h4>รายงานจาก Antivirus / Agent</h4>
      ${target.result ? `<pre>${escape(JSON.stringify(target.result, null, 2))}</pre>` : "<p>ยังไม่ได้รับรายงานจากเครื่อง</p>"}
      ${target.result?.report && typeof target.result.report === "object" && "output_truncated" in target.result.report && target.result.report.output_truncated === true ? "<p>รายงานถูกตัดทอนจาก Agent</p>" : ""}
    </article>`;
  }).join("");
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escape(`AV-Scan-${job.id}`)}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body { margin: 24px auto; max-width: 1000px; padding: 0 20px; color: #172033; background: white; font: 14px/1.65 Tahoma, "Leelawadee UI", sans-serif; overflow-wrap: anywhere; }
      h1 { font-size: 25px; margin-bottom: 4px; } h2 { font-size: 19px; margin-top: 28px; } h3 { font-size: 16px; } h4 { margin-bottom: 6px; }
      p { margin: 6px 0; white-space: pre-wrap; } small { color: #475569; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
      .stat { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; } .stat strong { display: block; }
      .note { border-left: 3px solid #64748b; padding: 8px 12px; background: #f1f5f9; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 12px; } th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; } th { background: #f1f5f9; } th:first-child { width: 7%; }
      article { border-top: 1px solid #cbd5e1; margin-top: 20px; padding-top: 8px; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.6 Tahoma, "Leelawadee UI", sans-serif; }
      button { padding: 10px 18px; cursor: pointer; } .toolbar { margin-bottom: 24px; }
      @media print { body { margin: 0; max-width: none; padding: 0; font-size: 11px; } .toolbar { display: none; } thead { display: table-header-group; } tr, .stat { break-inside: avoid; } h2, h3, h4 { break-after: avoid; } pre { font-size: 10px; } }
    </style></head><body>
    <div class="toolbar"><button id="print-report" type="button">บันทึก PDF / พิมพ์รายงาน</button><p>เลือกปลายทาง “บันทึกเป็น PDF / Save as PDF” ในหน้าต่างพิมพ์</p></div>
    <h1>รายงานผลการสแกน Antivirus</h1><p>Job ID: ${escape(job.id)}</p>
    <p>ประเภทการสแกน: ${escape(modes[job.mode])}${job.path ? `<br>เส้นทาง: ${escape(job.path)}` : ""}</p>
    <p>ห้องของเครื่องที่มีข้อมูล: ${escape(rooms.join(", ") || "ยังไม่มีข้อมูล")}</p>
    <p>${job.source === "api" ? "สร้างผลสแกนแรกที่พบ" : "สร้างงาน"}: ${escape(date(job.createdAt))}<br>ออกรายงาน: ${escape(date(exportedAt.toISOString()))} (เวลาไทย)</p>
    <p>สถานะงาน: ${job.source === "api" ? "ไม่สามารถยืนยันสถานะทั้งงานจากผลสแกนที่มีได้" : jobFinished(job) ? "สิ้นสุดการดำเนินการ" : "ยังไม่ได้รับผลครบทุกเครื่อง"}</p>
    ${!job.complete ? `<p class="note">${job.source === "api" ? "API ผลสแกนไม่ระบุจำนวนเครื่องที่สั่งทั้งหมด รายงานรวมผลที่โหลดได้ ณ การ Reload ครั้งล่าสุด จำนวนผลอาจไม่เท่ากับจำนวนเครื่องที่สั่ง" : "ข้อมูลรายชื่อเครื่องยังไม่ครบหรือยังไม่ได้รับการยืนยัน รายงานนี้เป็นผลชั่วคราวตามข้อมูลที่โหลดได้"}</p>` : ""}
    <div class="summary">${summary.map(([label, value]) => `<div class="stat">${escape(label)}<strong>${escape(value)}</strong></div>`).join("")}</div>
    <p class="note">สแกนสำเร็จหมายถึงกระบวนการสแกนเสร็จ ไม่ได้ยืนยันว่าไม่พบไวรัส โปรดอ่านรายงานจาก Antivirus ของแต่ละเครื่อง ชื่อเครื่อง ห้อง และ IP อ้างอิงข้อมูลปัจจุบัน ณ เวลาออกรายงาน</p>
    <h2>ผลการสแกนรายเครื่อง</h2><table><thead><tr><th>ลำดับ</th><th>เครื่อง / IP</th><th>ห้อง</th><th>สถานะ</th><th>เวลาสิ้นสุด</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>รายละเอียดผลการสแกน</h2>${details}</body></html>`;
}

export function exportScanReport(job: ScanJob, computers: ScanComputer[]) {
  const report = window.open("", "_blank");
  if (!report) throw new Error("เบราว์เซอร์บล็อกหน้าต่างรายงาน กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง");
  report.opener = null;
  report.document.open();
  report.document.write(buildScanReport(job, computers));
  report.document.close();
  report.document.getElementById("print-report")?.addEventListener("click", () => report.print());
  void report.document.fonts.ready.then(() => {
    if (!report.closed) { report.focus(); report.print(); }
  });
}
