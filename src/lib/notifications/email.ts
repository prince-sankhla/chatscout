import "server-only";

export type AdminNotificationType = "approved" | "rejected" | "requested_changes" | "archived" | "unpublished" | "restored" | "health_alert";

type AdminNotification = {
  type: AdminNotificationType;
  to: string | null;
  communityName: string;
  note?: string | null;
  link?: string | null;
};

export async function sendAdminNotification(notification: AdminNotification) {
  if (!notification.to) return { status: "skipped" as const, reason: "missing_recipient" as const };
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const from = process.env.EMAIL_FROM?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (provider !== "resend" || !from || !resendKey) {
    console.info("ChatScout email notification unavailable: provider not configured.");
    return { status: "unavailable" as const, reason: "provider_not_configured" as const };
  }
  const action = notification.type === "health_alert" ? "needs attention" : notification.type.replace("_", " ");
  const text = [
    `Your ChatScout community "${notification.communityName}" ${action}.`,
    notification.note ? `Details: ${notification.note}` : null,
    notification.link ? `Open ChatScout: ${notification.link}` : null,
  ].filter(Boolean).join("\n\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: notification.to, subject: `ChatScout update: ${notification.communityName}`, text }),
  });
  if (!response.ok) {
    console.info("ChatScout email notification unavailable: provider request failed.");
    return { status: "failed" as const, reason: "provider_request_failed" as const };
  }
  return { status: "sent" as const };
}
