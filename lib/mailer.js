// Optional email notification when a lead is captured. Safe to run with no
// SMTP configured at all — the lead is always saved to the dashboard first;
// this just tries to also ping the business owner's inbox.

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function getTransport() {
  if (!nodemailer) return null;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function notifyLead(client, lead) {
  const to = client.contactEmail;
  if (!to) return;

  const transport = getTransport();
  if (!transport) return; // not configured — lead still lives in the dashboard

  await transport.sendMail({
    from: process.env.LEAD_NOTIFY_FROM || process.env.SMTP_USER,
    to,
    subject: `New lead from your ChatPilot widget — ${lead.name}`,
    text: [
      `New lead captured on ${client.businessName}'s website:`,
      '',
      `Name: ${lead.name}`,
      `Email: ${lead.email || '-'}`,
      `Phone: ${lead.phone || '-'}`,
      `Message: ${lead.message || '-'}`,
      '',
      `Captured at: ${lead.createdAt}`
    ].join('\n')
  });
}

module.exports = { notifyLead };
