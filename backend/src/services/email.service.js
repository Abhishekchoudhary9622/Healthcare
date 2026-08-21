const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null;

const isConfigured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!isConfigured()) {
      logger.warn('[EMAIL SKIPPED] "' + subject + '" to ' + to + ' — set EMAIL_USER + EMAIL_PASS in .env to enable');
      return true;
    }
    const info = await getTransporter().sendMail({
      from: '"' + (process.env.EMAIL_FROM_NAME || 'HealthSync') + '" <' + (process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER) + '>',
      to, subject, text, html: html || buildHtml(subject, text),
    });
    logger.info('[EMAIL SENT] ' + info.messageId + ' to ' + to);
    return true;
  } catch (err) {
    logger.error('[EMAIL FAILED] to ' + to + ': ' + err.message);
    if (err.responseCode === 535 || err.code === 'EAUTH') transporter = null;
    throw err;
  }
};

const buildHtml = (subject, text) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${subject}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:0}.wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}.hdr{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;text-align:center}.hdr h1{color:#fff;margin:0;font-size:22px;font-weight:700}.hdr p{color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px}.body{padding:28px 32px;color:#374151;line-height:1.7;font-size:14px}.body pre{white-space:pre-wrap;font-family:inherit;margin:0}.ftr{background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb}</style>
</head><body><div class="wrap">
<div class="hdr"><h1>HealthSync</h1><p>Healthcare Appointment &amp; Follow-up Manager</p></div>
<div class="body"><pre>${text || ''}</pre></div>
<div class="ftr">© ${new Date().getFullYear()} HealthSync. Automated message — do not reply.</div>
</div></body></html>`;

module.exports = { sendEmail, isConfigured };
