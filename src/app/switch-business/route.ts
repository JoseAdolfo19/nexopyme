import { redirect } from "next/navigation";
import { switchBusiness } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");

  if (!to) redirect("/dashboard");

  const ok = await switchBusiness(to);
  redirect(ok ? "/dashboard" : "/onboarding");
}