import LoginForm from "./LoginForm";
import { cookies } from "next/headers";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const registered = cookieStore.get("resident_registration_success")?.value === "1";
  return <LoginForm registered={registered} />;
}
