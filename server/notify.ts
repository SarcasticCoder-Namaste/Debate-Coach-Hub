import type { Coach, Lead, PracticeShare, PracticeShareComment, User } from "@shared/schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "coach-admin@example.com";

function asLines(s: string) {
  return s.split("\n").map((l) => `   ${l}`).join("\n");
}

export async function sendBookingConfirmation(lead: Lead, coach: Coach) {
  const subject = `Your booking request with ${coach.name}`;
  const body = `Hi ${lead.studentName},

Thanks for requesting a session with ${coach.name}!

  Coach:    ${coach.name}
  Format:   ${lead.format}
  Slot:     ${lead.slot}
  Length:   ${lead.durationMin} minutes

What you said you want to work on:
${asLines(lead.goals)}

${coach.name} will reach out to ${lead.email} within 24 hours to confirm
the slot and send a meeting link. If you don't hear back, just reply to
this message.

— DebateMastery
`;
  console.log(
    `\n[notify→student] To: ${lead.email}\n[notify→student] Subject: ${subject}\n${body}\n`,
  );
}

function formatTimestamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function originFromEnv(): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://your-app.example.com"
  );
}

export async function sendCommentNotification(
  user: User,
  share: PracticeShare,
  comments: PracticeShareComment[],
) {
  if (comments.length === 0) return;
  const origin = originFromEnv();
  const link = `${origin.replace(/\/$/, "")}/share/${share.id}`;
  const greeting = user.name ? `Hi ${user.name},` : "Hi there,";
  const intro =
    comments.length === 1
      ? `${comments[0]!.coachName} just left a new comment on your clip "${share.topic}".`
      : `You have ${comments.length} new comments on your clip "${share.topic}".`;
  const lines = comments
    .map(
      (c) =>
        `  • [${formatTimestamp(c.timestampSec)}] ${c.coachName}: ${c.comment}`,
    )
    .join("\n");
  const subject =
    comments.length === 1
      ? `${comments[0]!.coachName} commented on your debate clip`
      : `${comments.length} new comments on your debate clip`;
  const body = `${greeting}

${intro}

${lines}

Watch the clip and reply: ${link}

You're receiving this because you uploaded a debate clip on DebateMastery.
To stop these emails, open Account Settings and turn off comment notifications.

— DebateMastery
`;
  console.log(
    `\n[notify→student] To: ${user.email}\n[notify→student] Subject: ${subject}\n${body}\n`,
  );
}

export async function sendAdminLeadAlert(lead: Lead, coach: Coach) {
  const subject = `New lead: ${lead.studentName} → ${coach.name}`;
  const body = `New booking request just came in.

  Coach:        ${coach.name}
  Student:      ${lead.studentName} <${lead.email}>
  Format:       ${lead.format}
  Slot:         ${lead.slot}
  Length:       ${lead.durationMin} minutes
  Practice link: ${lead.sessionLink ?? "(none)"}

Goals:
${asLines(lead.goals)}

View in admin: /admin/leads
`;
  console.log(
    `\n[notify→admin] To: ${ADMIN_EMAIL}\n[notify→admin] Subject: ${subject}\n${body}\n`,
  );
}
