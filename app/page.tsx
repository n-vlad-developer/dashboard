import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import LoginScreen from "@/components/LoginScreen";
export default async function Home() {
  const session = await readSession();
  if (session) redirect("/dashboard");
  return <LoginScreen />;
}
