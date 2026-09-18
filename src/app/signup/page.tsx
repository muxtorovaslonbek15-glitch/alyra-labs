import { redirect } from "next/navigation";

/** Ro'yxatdan o'tish olib tashlandi — eski havolalar labga yo'naltiriladi. */
export default function SignupPage() {
  redirect("/lab");
}
