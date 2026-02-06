import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY in env");
}

const resend = new Resend(RESEND_API_KEY);

const FROM_NAME = process.env.MAIL_FROM_NAME || "Spike";
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || "onboarding@resend.dev"; 
// later after buying domain: no-reply@yourdomain.com

export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject || (!html && !text)) {
    throw new Error("sendEmail requires: to, subject, and html or text");
  }

  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}
