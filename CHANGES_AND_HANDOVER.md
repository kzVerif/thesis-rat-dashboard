# สรุปรายการเปลี่ยนแปลงและการส่งต่องาน (Handover & Changelog)

เอกสารนี้จัดทำขึ้นเพื่อให้ทีมและผู้พัฒนาเข้าใจถึงการเปลี่ยนแปลงทั้งหมดระหว่าง **Code ภายในโฟลเดอร์นี้** กับ **Code เดิมบน GitHub (`origin/main`)** รวมถึงเหตุผลในการแก้ปัญหา และจุดที่ต้องระวังหรือพัฒนาต่อในอนาคต

---

## 📌 1. ภาพรวมการเปลี่ยนแปลงหลัก (Overview)

1. **แก้ปัญหาระบบ Authentication & Session**: แก้ไขสาเหตุที่ทำให้ผู้ใช้เข้าสู่ระบบสำเร็จแต่ถูกดีดกลับมาหน้า Login
2. **ระบบจัดการ Registration Tokens**: ปรับปรุงจากการจำลองข้อมูล (Mock Data) ในเครื่อง ให้เชื่อมต่อและทำงานร่วมกับ Backend จริง 100%
3. **ความเข้ากันได้ของ Cookie ระหว่าง Dev (HTTP) และ Production (HTTPS)**: รองรับ Cookie ทั้ง `__Host-session` และ `session`

---

## 🔍 2. รายละเอียดการเปลี่ยนแปลงแบ่งตามโมดูล

### 2.1 ระบบ Authentication & Session

#### 📁 `lib/auth.ts`
* **ปัญหาเดิม:** 
  - ฟังก์ชัน `getCurrentUser()` ตรวจสอบเงื่อนไข `!user.email` ซึ่งหากผู้ใช้ไม่มีอีเมล (เช่น บัญชี `admin` หรือผู้ใช้ที่สร้างโดยไม่ระบุ email) ฟังก์ชันจะคืนค่า `null` ทำให้ Server Layout เตะผู้ใช้กลับไปหน้า Login ทันที
  - อ่าน Cookie เฉพาะชื่อ `__Host-session` ซึ่งหากรันบน HTTP/localhost เบราว์เซอร์บางตัวจะปฏิเสธ Secure Cookie
* **สิ่งที่แก้ไข:**
  - ปรับ Type `AuthUser` ให้ `email` และ `display_name` เป็น optional (`email?: string | null`)
  - แก้ไข `getCurrentUser()` ให้ตรวจสอบเฉพาะฟิลด์จำเป็น (`id`, `username`, `role`)
  - ปรับ `authFetch()` ให้อ่านได้ทั้ง `__Host-session` (Production) และ fallback `session` (Development)

#### 📁 `app/api/auth/[...path]/route.ts`
* **ปัญหาเดิม:** 
  - การ Forward Header `set-cookie` แบบเดิมอาจทำให้ Cookie attributes (เช่น `HttpOnly`, `SameSite`, `Path`) สูญหายหรือถูกรวมเป็นก้อนเดียว
* **สิ่งที่แก้ไข:**
  - คงระบบความปลอดภัยเดิมไว้ครบถ้วน (Whitelisted `allowedRoutes` และ CSRF protection)
  - เพิ่มการใช้ `upstream.headers.getSetCookie()` ร่วมกับ `responseHeaders.append("set-cookie", ...)` เพื่อส่งต่อ Cookie ทุกตัวพร้อม Attributes จาก Go Backend สู่ Browser อย่างสมบูรณ์

#### 📁 Server Helpers อื่นๆ (`users-server.ts`, `room-server.ts`, `rbac-server.ts`)
* **สิ่งที่แก้ไข:**
  - ปรับปรุงให้อ่าน Session Cookie ได้ทั้ง `__Host-session` และ `session` เช่นเดียวกันเพื่อความสม่ำเสมอ

#### 📁 `app/(system)/settings/_components/SettingsClient.tsx`
* **สิ่งที่แก้ไข:**
  - ปรับการแสดงผลอีเมลให้รองรับค่า `null` หรือค่าว่าง (`initialUser.email || "-"`)

---

### 2.2 ระบบจัดการ Tokens (`/tokens`)

#### 📁 `app/(system)/tokens/_components/TokenManagement.tsx`
* **ปัญหาเดิม:** 
  - โค้ดเดิมใช้ Mock Data และ Local State ในการสร้าง/แก้ไข/ลบ Token ทำให้ข้อมูลไม่ถูกบันทึกจริงบน Backend
* **สิ่งที่แก้ไข:**
  - เชื่อมต่อกับ Backend ผ่าน API จริง (`listTokens`, `createToken`, `updateToken`, `revokeToken`)
  - ปรับ Dialog สำหรับสร้าง Token, แก้ไขเงื่อนไข (`max_use`, `expires_at`) และการเพิกถอน (Revoke) ให้สะท้อนสถานะจริงจาก Database

#### 📁 `app/(system)/tokens/_lib/tokensClient.ts` *(ไฟล์ใหม่)*
* **หน้าที่:** เป็น Client Service สำหรับยิง Request ไปยัง Proxy `/api/tokens` (GET, POST, PUT, DELETE)

#### 📁 `app/api/tokens/[[...path]]/route.ts` *(ไฟล์ใหม่)*
* **หน้าที่:** Next.js Route Handler ทำหน้าที่เป็น Reverse Proxy ส่งต่อ Request จาก Client ไปยัง Go Backend (`/api/tokens/...`) พร้อมแนบ Cookie ยืนยันตัวตน

---

## ⚠️ 3. จุดที่ต้องระวังและสิ่งที่ควรทำต่อในอนาคต (Future Considerations)

### 1. การตั้งค่า Cookie ใน Production (HTTPS)
* ใน Production ที่ใช้งานผ่าน **HTTPS และ Domain จริง**:
  - Go Backend จะส่ง Cookie ชื่อ `__Host-session` พร้อม flag `Secure=true; HttpOnly; SameSite=Lax; Path=/`
  - ฝั่ง Frontend ถูกออกแบบให้รองรับ `__Host-session` อยู่แล้ว จึงสามารถ deploy ขึ้น Production ได้ทันทีโดยไม่ต้องแก้โค้ด

### 2. การเพิ่ม Route ใหม่ใน Auth Proxy
* หากในอนาคต Backend มีการเพิ่ม Endpoint ภายใต้ `/api/auth/` ใหม่ (เช่น `/api/auth/verify-2fa`):
  - **ต้องเพิ่มชื่อ route นั้นใน `allowedRoutes`** ในไฟล์ `app/api/auth/[...path]/route.ts` เสมอ มิฉะนั้น Next.js Proxy จะตอบกลับเป็น `404 Not Found`

### 3. การจัดการสิทธิ์ (Role-Based Access Control - RBAC) บนหน้าบ้าน
* ปัจจุบัน Sidebar แสดงผลเมนูครบทุกเมนู
* ในอนาคตสามารถนำ `user.role` หรือสิทธิ์จาก `getCurrentUser()` มาทำ Conditional Rendering เพื่อซ่อน/แสดงเมนูตาม Role ของผู้ใช้ได้

### 4. ไฟล์ชั่วคราวที่ไม่ควร Push ขึ้น Git
* ไฟล์ `cookies.txt` (สร้างขึ้นเพื่อทดสอบ curl) **ไม่ควร commit ขึ้น Git**
* ควรตรวจสอบ `.gitignore` ให้ครอบคลุม `.env.local` และ `cookies.txt`

---

## 🛠️ สรุปสถานะไฟล์ในปัจจุบัน

| สถานะ | ไฟล์ | หน้าที่ / การเปลี่ยนแปลง |
| :--- | :--- | :--- |
| **Modified** | `lib/auth.ts` | ปรับ AuthUser type และเพิ่ม session cookie fallback |
| **Modified** | `app/api/auth/[...path]/route.ts` | ผสาน getSetCookie ใน Auth Proxy |
| **Modified** | `app/(system)/users/_lib/users-server.ts` | รองรับ session cookie fallback |
| **Modified** | `app/(system)/rooms/_lib/room-server.ts` | รองรับ session cookie fallback |
| **Modified** | `app/(system)/permissions/_lib/rbac-server.ts` | รองรับ session cookie fallback |
| **Modified** | `app/(system)/settings/_components/SettingsClient.tsx` | รองรับ nullable email |
| **Modified** | `app/(system)/tokens/_components/TokenManagement.tsx` | เชื่อมต่อ API Token จริง |
| **New** | `app/(system)/tokens/_lib/tokensClient.ts` | Token API Client helpers |
| **New** | `app/api/tokens/[[...path]]/route.ts` | Token API Proxy Handler |
| **New** | `CHANGES_AND_HANDOVER.md` | เอกสารส่งต่องานฉบับนี้ |
