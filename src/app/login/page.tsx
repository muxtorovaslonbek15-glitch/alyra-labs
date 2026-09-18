import { redirect } from "next/navigation";

/** Ro'yxatdan o'tish / kirish olib tashlandi — eski havolalar labga yo'naltiriladi. */
export default function LoginPage() {
  redirect("/lab");
}
