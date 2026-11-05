import { headers } from "next/headers";
import { Workbench } from "./workbench";

export const dynamic = "force-dynamic";

export default async function Home({ language = "zh" }: { language?: "zh" | "en" | "it" }) {
  const requestHeaders = await headers();
  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const name = encodedName && requestHeaders.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
    ? decodeURIComponent(encodedName)
    : requestHeaders.get("oai-authenticated-user-email")?.split("@")[0] ?? "Demo owner";
  return <Workbench userName={name} initialLanguage={language} />;
}
