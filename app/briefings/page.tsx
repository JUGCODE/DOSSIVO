import type { Metadata } from "next";
import { BriefingCenter } from "./briefing-center";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enterprise Action Briefings · Dossivo",
  description: "Weekly EU Forced Labour Regulation action briefings for global businesses.",
};

export default function BriefingsPage() {
  return <BriefingCenter />;
}
