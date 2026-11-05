import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { newsletterSubscriptions } from "@/db/schema";
import { maskEmail, NEWSLETTER_CONSENT_VERSION, NEWSLETTER_LANGUAGES } from "@/lib/newsletter-core";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ canSubscribe: false, subscription: null });
  try {
    const [subscription] = await getDb().select().from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.userId, user.userId)).limit(1);
    return Response.json({
      canSubscribe: true,
      email: maskEmail(user.email),
      subscription: subscription ? publicSubscription(subscription) : null,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load newsletter preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to save newsletter preferences" }, { status: 401 });
  try {
    const input: unknown = await request.json();
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return Response.json({ error: "A newsletter preference object is required" }, { status: 400 });
    }
    const payload = input as Record<string, unknown>;
    const now = new Date().toISOString();
    const db = getDb();
    if (payload.action === "unsubscribe") {
      const [updated] = await db.update(newsletterSubscriptions).set({
        status: "unsubscribed",
        unsubscribedAt: now,
        updatedAt: now,
      }).where(eq(newsletterSubscriptions.userId, user.userId)).returning();
      return Response.json({ subscription: updated ? publicSubscription(updated) : null });
    }
    if (typeof payload.language !== "string" || !NEWSLETTER_LANGUAGES.includes(payload.language)) {
      return Response.json({ error: "A supported newsletter language is required" }, { status: 400 });
    }
    const locale = payload.language;
    if (payload.action === "update_language") {
      const [existing] = await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.userId, user.userId)).limit(1);
      if (!existing || existing.status === "unsubscribed") return Response.json({ error: "No active newsletter preference to update" }, { status: 409 });
      const [updated] = await db.update(newsletterSubscriptions).set({ locale, email: user.email, updatedAt: now })
        .where(eq(newsletterSubscriptions.userId, user.userId)).returning();
      return Response.json({ email: maskEmail(user.email), subscription: publicSubscription(updated) });
    }
    if (payload.action !== "subscribe" || payload.consent !== true) {
      return Response.json({ error: "Explicit newsletter consent is required" }, { status: 400 });
    }
    const [subscription] = await db.insert(newsletterSubscriptions).values({
      userId: user.userId,
      email: user.email,
      locale,
      status: "pending_delivery",
      consentVersion: NEWSLETTER_CONSENT_VERSION,
      consentSource: "briefings-center",
      consentedAt: now,
      confirmedAt: null,
      unsubscribedAt: null,
      unsubscribeTokenHash: null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscriptions.userId,
      set: {
        email: user.email,
        locale,
        status: "pending_delivery",
        consentVersion: NEWSLETTER_CONSENT_VERSION,
        consentSource: "briefings-center",
        consentedAt: now,
        confirmedAt: null,
        unsubscribedAt: null,
        updatedAt: now,
      },
    }).returning();
    return Response.json({ email: maskEmail(user.email), subscription: publicSubscription(subscription) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save newsletter preferences" }, { status: 500 });
  }
}

function publicSubscription(subscription: typeof newsletterSubscriptions.$inferSelect) {
  return {
    locale: subscription.locale,
    status: subscription.status,
    consentedAt: subscription.consentedAt,
    confirmedAt: subscription.confirmedAt,
    unsubscribedAt: subscription.unsubscribedAt,
  };
}
