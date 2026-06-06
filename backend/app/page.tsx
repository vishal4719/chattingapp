import { redirect } from "next/navigation";
import { getFrontendUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Home() {
  redirect(getFrontendUrl());
}
