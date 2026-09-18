# Alyra Labs — ro'yxatdan o'tish (auth) tizimini olib tashlash

Bu papkada **faqat o'zgargan fayllar** bor. Ularni GitHub'da eski fayllar ustiga
qo'ying (papka tuzilishi bir xil), 2 ta faylni esa o'chirib tashlang.

## 1) O'chiriladigan fayllar

```
src/components/auth/AuthForm.tsx      ← email/parol formasi
src/lib/firebase/auth.ts              ← signUp / signIn / signOut / subscribeAuth
```

Boshqa hech qayerda ular import qilinmaydi (quyidagi o'zgarishlardan keyin).

## 2) Ustiga yoziladigan / qo'shiladigan fayllar (18 ta)

| Fayl | Nima qilindi |
|---|---|
| `src/store/authStore.ts` | Har bir brauzerda doimiy mahalliy `LOCAL_USER` bor. `isLabBlocked()` → `false`, `assertLabActionAllowed()` → `true`, `openAuthGate()` va `recordGuestChemicalAdd()` — bo'sh. Ya'ni "2 ta modda" chegarasi va auth-gate butunlay o'chdi. |
| `src/components/auth/AuthProvider.tsx` | Firebase Auth kuzatuvi olib tashlandi; profil localStorage'dan o'qiladi. `layout.tsx` o'zgarmadi. |
| `src/components/auth/AuthGateModal.tsx` | Endi `null` qaytaradi (modal hech qachon chiqmaydi). |
| `src/gamification/GuestCapBanner.tsx` | Endi `null` qaytaradi (mehmon banneri yo'q). |
| `src/components/auth/NavChrome.tsx` | Log in / Sign up / Log out tugmalari olib tashlandi. |
| `src/desk/LabOverflowMenu.tsx` | ⋯ menyudan email, Log in / Sign up / Log out olib tashlandi. |
| `src/components/marketing/LandingPage.tsx` | "Log in" havolalari → "Open the atelier"; kirgan foydalanuvchini `/lab`ga majburan yuborish olib tashlandi (bosh sahifa o'zgarmay qoldi). |
| `src/app/login/page.tsx` | `/lab`ga redirect (eski havolalar buzilmasin). |
| `src/app/signup/page.tsx` | `/lab`ga redirect. |
| `src/lib/client/authHeaders.ts` | Firebase ID token o'rniga oddiy JSON header + `X-Guest-Id` (faqat rate-limit uchun). Endi hech qachon `null` emas — shuning uchun Chat, Explain, OCR/Scan ishlaydi. |
| `src/lib/server/requireAuth.ts` | `requireFirebaseUser()` endi 401/503 qaytarmaydi: har bir tashrifchiga `guest:...` uid beradi. Rate-limit o'z holicha qoldi. |
| `src/lib/firebase/profile.ts` | Profil serverga emas, **localStorage**ga saqlanadi (`alyra-local-profile`). Eksport nomlari va tiplar o'zgarmadi. |
| `src/lib/firebase/inventionsSync.ts` | Bulutga sinxronizatsiya o'chirildi (ixtirolar brauzerda saqlanadi). |
| `src/gamification/useDailyStarVisit.ts` | Kunlik ★ endi serversiz, brauzerda beriladi (kuniga 1 ta). |
| `src/lib/firebase/formulas.ts` | Market'ga formula nashr qilish endi hisobsiz ishlaydi — ma'lumot brauzerda saqlanadi. |
| `src/lib/firebase/studies.ts` | Panel-study yaratish va baholash ham hisobsiz, brauzerda. |
| `src/lib/firebase/localStore.ts` | **YANGI fayl** — Market uchun oddiy localStorage yordamchilari. |
| `e2e/smoke.spec.ts` | "login page renders" testi o'rniga "/login → /lab redirect" testi. |

## 3) Nimalar o'zgarmadi

Kimyo dvigateli, Lab/Desk, Perfume Atelier, Perfumer Chat, Wear, Market UI,
goals/gamification, dizayn — hech biriga tegilmadi. `layout.tsx`, `LabShell.tsx`,
`deskStore.ts`, `ProfileForm.tsx` va boshqalar o'z holicha qoldi: ular
`useAuthStore`ni chaqirishda davom etadi, lekin endi u doim "kirgan" holatni
qaytaradi.

## 4) Muhim eslatmalar

- **Firebase env kalitlari endi majburiy emas.** Faqat `GROQ_API_KEY` (Chat/Explain
  uchun) kerak bo'ladi. `NEXT_PUBLIC_FIREBASE_*` bo'lmasa ham sayt ishlaydi.
- **Progress endi brauzerda** saqlanadi (`zustand persist` + localStorage). Turli
  qurilmalar orasida sinxronizatsiya yo'q — bu hisobsiz rejimning tabiiy natijasi.
- **Market endi mahalliy**: nashr qilingan formulalar, panel-study va baholar
  faqat nashr qilgan odamning brauzerida ko'rinadi (hisob bo'lmagani uchun umumiy,
  hamma ko'radigan market imkonsiz). Agar keyinchalik umumiy market kerak bo'lsa,
  server tomonida anonim yozuvga ruxsat beruvchi API yozish kerak bo'ladi.
- `src/lib/firebase/client.ts` endi hech qayerda ishlatilmaydi — xohlasangiz uni
  ham o'chirib tashlashingiz mumkin (majburiy emas).
- **Teacher / Join / Study** sahifalari sinf tizimi uchun bo'lib, ular Firebase
  Admin'ga tayanadi; tegilmadi.

## 5) Tekshirish

```bash
npm install
npm run typecheck
npm run lint
npm run dev
```
