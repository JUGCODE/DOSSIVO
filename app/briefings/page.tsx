import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('briefings');
import type { Metadata } from "next";
import { BriefingCenter } from "./briefing-center";

export const dynamic = "force-dynamic";

export default function BriefingsPage() {
  return <BriefingCenter />;
}
