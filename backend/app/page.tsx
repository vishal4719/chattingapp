import { redirect } from "next/navigation";
import { getFrontendUrl } from "@/lib/env";

export default function Home() {
  redirect(getFrontendUrl());
}
