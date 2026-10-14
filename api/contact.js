// POST /api/contact — emails a message from the portfolio's iMessage chat to you via Nodemailer.
// Runs as a Vercel serverless function; vite.config.ts also mounts it during `npm run dev`.
//
// Env vars (set in Vercel → Project → Settings → Environment Variables, or in .env.local):
//   SMTP_USER   the address that sends the email (e.g. your Gmail)
//   SMTP_PASS   its password — for Gmail, a 16-character App Password, not your normal password
//   CONTACT_TO  where messages should land (defaults to SMTP_USER)
//   SMTP_HOST / SMTP_PORT  optional, default to Gmail (smtp.gmail.com:465)
import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE = 5000;
const MAX_SUBJECT = 200;
const MESSAGE_ID_RE = /^<[^\s<>]{1,250}@[^\s<>]{1,250}>$/;

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const send = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

// Vercel pre-parses JSON bodies; plain Node (the dev server) hands us a stream.
const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) throw new Error('Body too large');
  }
  return JSON.parse(raw || '{}');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { ok: false, error: 'Invalid request' });
  }

  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();
  // One line only, so it can't break out of the Subject header.
  const subject = String(body.subject ?? '').replace(/\s+/g, ' ').trim();
  // Honeypot: real visitors never fill this hidden field.
  if (body.website) return send(res, 200, { ok: true });
  if (!EMAIL_RE.test(email) || email.length > 254) return send(res, 400, { ok: false, error: 'Invalid email' });
  if (!subject || subject.length > MAX_SUBJECT) return send(res, 400, { ok: false, error: 'Invalid subject' });
  if (!message || message.length > MAX_MESSAGE) return send(res, 400, { ok: false, error: 'Invalid message' });

  const { SMTP_USER, SMTP_PASS, CONTACT_TO, SMTP_HOST = 'smtp.gmail.com', SMTP_PORT = '465' } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('[contact] SMTP_USER / SMTP_PASS are not set');
    return send(res, 500, { ok: false, error: 'Email is not configured' });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const from = `"Portfolio iMessage" <${SMTP_USER}>`;
  const to = CONTACT_TO || SMTP_USER;
  const title = `Portfolio inquiry: ${subject}`;

  // Follow-up note: sent as a reply to the first email so Gmail keeps it in the same thread.
  if (body.followup) {
    const inReplyTo = String(body.inReplyTo ?? '');
    const thread = MESSAGE_ID_RE.test(inReplyTo) ? { inReplyTo, references: [inReplyTo] } : {};
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: email,
        subject: `Re: ${title}`,
        ...thread,
        text: `Added note from ${email}:\n\n${message}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:560px">
  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Added note</p>
  <p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(message)}</p>
  <p style="margin:0;color:#888;font-size:13px">From <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a> via your portfolio's iMessage chat.</p>
</div>`,
      });
      return send(res, 200, { ok: true, id: info.messageId });
    } catch (err) {
      console.error('[contact] follow-up sendMail failed:', err);
      return send(res, 502, { ok: false, error: 'Could not send right now' });
    }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: title,
      text: `What they want to build:\n${subject}\n\nDetails:\n${message}\n\nEmail: ${email}\n\n— Sent from your portfolio's iMessage chat. Just hit reply to answer them.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:560px">
  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.08em">What they want to build</p>
  <p style="margin:0 0 20px;font-size:18px;font-weight:600">${escapeHtml(subject)}</p>
  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Details</p>
  <p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(message)}</p>
  <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Email</p>
  <p style="margin:0 0 24px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
  <p style="margin:0;color:#888;font-size:13px">Sent from your portfolio's iMessage chat. Just hit reply to answer them.</p>
</div>`,
    });
    return send(res, 200, { ok: true, id: info.messageId });
  } catch (err) {
    console.error('[contact] sendMail failed:', err);
    return send(res, 502, { ok: false, error: 'Could not send right now' });
  }
}
