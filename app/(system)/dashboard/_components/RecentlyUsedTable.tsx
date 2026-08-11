import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SuccessBadge, PendingBadge, FailBadge } from "@/components/ui/statusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentCommands = [
  {
    id: "CMD-001",
    command: "Shutdown",
    target: "PC-LAB-01",
    user: "Admin",
    status: "success",
    duration: "2.3s",
    timestamp: "2 นาทีที่แล้ว",
  },
  {
    id: "CMD-002",
    command: "Restart",
    target: "PC-LAB-05",
    user: "Teacher A",
    status: "success",
    duration: "5.1s",
    timestamp: "5 นาทีที่แล้ว",
  },
  {
    id: "CMD-003",
    command: "Lock Screen",
    target: "PC-LAB-12",
    user: "Admin",
    status: "pending",
    duration: "-",
    timestamp: "8 นาทีที่แล้ว",
  },
  {
    id: "CMD-004",
    command: "File Transfer",
    target: "PC-LAB-03",
    user: "Teacher B",
    status: "success",
    duration: "12.4s",
    timestamp: "15 นาทีที่แล้ว",
  },
  {
    id: "CMD-005",
    command: "Screenshot",
    target: "PC-LAB-08",
    user: "Admin",
    status: "failed",
    duration: "-",
    timestamp: "22 นาทีที่แล้ว",
  },
  {
    id: "CMD-006",
    command: "Remote Desktop",
    target: "PC-LAB-15",
    user: "Teacher A",
    status: "success",
    duration: "1.8s",
    timestamp: "30 นาทีที่แล้ว",
  },
  {
    id: "CMD-007",
    command: "Execute Script",
    target: "PC-LAB-02",
    user: "Admin",
    status: "success",
    duration: "3.7s",
    timestamp: "45 นาทีที่แล้ว",
  },
  {
    id: "CMD-008",
    command: "Sync Files",
    target: "PC-LAB-10",
    user: "Teacher C",
    status: "failed",
    duration: "-",
    timestamp: "1 ชั่วโมงที่แล้ว",
  },
  {
    id: "CMD-009",
    command: "Mouse Control",
    target: "PC-LAB-07",
    user: "Admin",
    status: "success",
    duration: "0.5s",
    timestamp: "1 ชั่วโมงที่แล้ว",
  },
  {
    id: "CMD-010",
    command: "Clear Data",
    target: "PC-LAB-14",
    user: "Teacher B",
    status: "pending",
    duration: "-",
    timestamp: "2 ชั่วโมงที่แล้ว",
  },
]

export function RecentlyUsedTable() {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          คำสั่งล่าสุด
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ประวัติการใช้งานคำสั่ง 10 รายการล่าสุด
        </p>
      </div>
      <Table className="min-w-[760px]">
         <TableHeader className="bg-gray-50 dark:bg-gray-950/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>คำสั่ง</TableHead>
            <TableHead>เครื่องเป้าหมาย</TableHead>
            <TableHead>ผู้ใช้</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-right">ระยะเวลา</TableHead>
            <TableHead>เวลา</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
           {recentCommands.map((cmd) => {
            return (
              <TableRow key={cmd.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {cmd.command}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {cmd.target}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {cmd.user.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {cmd.user}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {cmd.status === "success" ? <SuccessBadge /> : cmd.status === "failed" ? <FailBadge /> : <PendingBadge />}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                  {cmd.duration}
                </TableCell>
                <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                  {cmd.timestamp}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          {/* <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$2,500.00</TableCell>
          </TableRow> */}
        </TableFooter>
      </Table>
    </div>
  );
}
