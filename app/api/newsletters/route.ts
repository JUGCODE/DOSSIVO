import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterIssueLocales, newsletterIssues } from "@/db/schema";
import { PREVIEW_NEWSLETTER_ISSUE, validatePublishableNewsletter } from "@/lib/newsletter-core";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const issueRows = await db.select().from(newsletterIssues)
      .where(eq(newsletterIssues.status, "published"))
      .orderBy(desc(newsletterIssues.editionDate))
      .limit(52);
    const localeRows = issueRows.length
      ? await db.select().from(newsletterIssueLocales).where(inArray(newsletterIssueLocales.issueId, issueRows.map((issue) => issue.id)))
      : [];
    const storedIssues = issueRows.map((issue) => {
      const translations = Object.fromEntries(localeRows.filter((row) => row.issueId === issue.id).map((row) => [row.locale, {
        ...JSON.parse(row.contentJson),
        subject: row.subject,
        title: row.title,
        summary: row.summary,
      }]));
      const canonical = JSON.parse(issue.canonicalFactsJson) as { sources?: Array<{ label: string; url: string }> };
      return {
        id: issue.id,
        slug: issue.slug,
        editionDate: issue.editionDate,
        sourceCutoffAt: issue.sourceCutoffAt,
        publishedAt: issue.publishedAt,
        status: issue.status,
        sources: canonical.sources ?? [],
        translations,
      };
    }).filter((issue) => validatePublishableNewsletter(issue).ok);
    const issues = [...storedIssues, PREVIEW_NEWSLETTER_ISSUE]
      .filter((issue, index, all) => all.findIndex((candidate) => candidate.slug === issue.slug) === index)
      .sort((left, right) => right.editionDate.localeCompare(left.editionDate));
    return Response.json({ issues, deliveryActive: false });
  } catch (error) {
    return Response.json({
      issues: [PREVIEW_NEWSLETTER_ISSUE],
      deliveryActive: false,
      warning: error instanceof Error ? error.message : "Newsletter storage is unavailable",
    });
  }
}
