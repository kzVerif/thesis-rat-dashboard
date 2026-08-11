import RoomManagement from "./_components/RoomManagement";
import { getRooms } from "./_lib/room-server";

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
          Room Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          จัดการห้อง
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          สร้างและจัดการห้อง พร้อมเพิ่ม Agents เพื่อจัดกลุ่มเครื่องภายในระบบ
        </p>
      </header>

      <RoomManagement initialRooms={rooms} />
    </div>
  );
}
