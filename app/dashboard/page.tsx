import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import Dashboard from "@/components/Dashboard";
export default async function Page() {
  const session = await readSession();
  if (!session) redirect("/");
  return <Dashboard />;
}
