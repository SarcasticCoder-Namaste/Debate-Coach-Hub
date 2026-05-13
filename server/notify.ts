import type { Coach, Lead } from "@shared/schema";

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
