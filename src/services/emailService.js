const { Resend } = require('resend');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let client;

const getClient = () => {
  if (client) return client;
  if (!env.RESEND_API_KEY) return null;
  client = new Resend(env.RESEND_API_KEY);
  return client;
};

const BRAND = env.BRAND_COLOR;
const BRAND_DARK = '#8f1e1f';
const TEXT = '#18181b';
const TEXT_MUTED = '#52525b';
const TEXT_FAINT = '#71717a';
const BORDER = '#e4e4e7';
const BG_SOFT = '#fafafa';
const BG_PAGE = '#f4f4f5';

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const layout = ({ preheader, title, bodyHtml }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${TEXT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader || '')}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_PAGE};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:0;background:${BRAND};height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="width:32px;height:32px;background:${BRAND};color:#ffffff;border-radius:6px;text-align:center;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:15px;font-weight:700;line-height:32px;">g</td>
                      <td style="padding-left:10px;font-size:16px;font-weight:600;color:${TEXT};letter-spacing:-0.01em;">${escapeHtml(env.APP_NAME)}</td>
                    </tr></table>
                  </td>
                  <td style="text-align:right;font-size:12px;color:${TEXT_FAINT};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Secure account access</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;font-weight:700;color:${TEXT};letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
              <div style="font-size:15px;line-height:1.65;color:${TEXT_MUTED};">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BG_SOFT};border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${TEXT_FAINT};">
              You are receiving this email because someone requested an action on your ${escapeHtml(env.APP_NAME)} account.
              If this wasn't you, you can safely ignore this message &mdash; no changes will be made.
              <br /><br />
              Need help? Contact <a href="mailto:${escapeHtml(env.SUPPORT_EMAIL)}" style="color:${BRAND};text-decoration:none;">${escapeHtml(env.SUPPORT_EMAIL)}</a>.
              <br /><br />
              <span style="color:#a1a1aa;">&copy; ${new Date().getFullYear()} ${escapeHtml(env.APP_NAME)}. All rights reserved.</span>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;margin:16px auto 0;text-align:center;font-size:11px;color:#a1a1aa;line-height:1.5;">
          This is an automated message. Please do not reply directly to this email.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const codeBlock = (code, label, expiresInMinutes) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="padding:22px 24px;background:${BG_SOFT};border:1px solid ${BORDER};border-radius:10px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${TEXT_FAINT};font-weight:600;margin-bottom:10px;">
          ${escapeHtml(label)}
        </div>
        <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;letter-spacing:10px;font-weight:700;color:${BRAND};line-height:1.1;">
          ${escapeHtml(code)}
        </div>
        <div style="font-size:12px;color:${TEXT_FAINT};margin-top:12px;">
          Expires in <strong style="color:${TEXT_MUTED};">${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}</strong>
        </div>
      </td>
    </tr>
  </table>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:8px 0;font-size:13px;color:${TEXT_FAINT};width:110px;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:13px;color:${TEXT};font-weight:500;">${escapeHtml(value)}</td>
  </tr>`;

const button = (href, text) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:8px;background:${BRAND};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.01em;">
          ${escapeHtml(text)}
        </a>
      </td>
    </tr>
  </table>`;

const send = async ({ to, subject, html, text }) => {
  const c = getClient();
  if (!c) {
    logger.warn(`[email:mock] Resend not configured — logging message instead of sending`);
    logger.info(`[email:mock] to=${to} subject="${subject}"`);
    logger.info(`[email:mock] text: ${text}`);
    return { mocked: true };
  }
  const { data, error } = await c.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject,
    html,
    text,
    reply_to: env.EMAIL_REPLY_TO || undefined,
  });
  if (error) {
    logger.error(`[email] send failed: ${error.message || error.name}`);
    throw new Error(`Failed to send email: ${error.message || 'unknown error'}`);
  }
  return data;
};

const sendVerificationOtp = ({ to, name, otp, expiresInMinutes }) => {
  const firstName = name ? String(name).split(' ')[0] : 'there';
  const subject = `Your ${env.APP_NAME} verification code`;
  const preheader = `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">
      Welcome to <strong style="color:${TEXT};">${escapeHtml(env.APP_NAME)}</strong>. To finish setting up your account,
      enter the verification code below in the app.
    </p>
    ${codeBlock(otp, 'Verification code', expiresInMinutes)}
    <p style="margin:0 0 14px;">
      For your security, never share this code with anyone. ${escapeHtml(env.APP_NAME)} staff will never ask you for it.
    </p>
    <p style="margin:0;color:${TEXT_FAINT};font-size:13px;">
      Didn't create an account? You can ignore this email &mdash; the code will expire on its own.
    </p>`;

  return send({
    to,
    subject,
    html: layout({ preheader, title: 'Verify your email address', bodyHtml: body }),
    text:
      `Hi ${firstName},\n\n` +
      `Welcome to ${env.APP_NAME}. Your verification code is: ${otp}\n` +
      `This code expires in ${expiresInMinutes} minutes.\n\n` +
      `Never share this code with anyone. ${env.APP_NAME} staff will never ask you for it.\n\n` +
      `Didn't create an account? You can safely ignore this email.`,
  });
};

const sendPasswordResetOtp = ({ to, name, otp, expiresInMinutes }) => {
  const firstName = name ? String(name).split(' ')[0] : 'there';
  const subject = `Reset your ${env.APP_NAME} password`;
  const preheader = `Your password reset code is ${otp}. It expires in ${expiresInMinutes} minutes.`;
  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">
      We received a request to reset the password on your ${escapeHtml(env.APP_NAME)} account.
      Use the code below to continue.
    </p>
    ${codeBlock(otp, 'Password reset code', expiresInMinutes)}
    <p style="margin:0 0 14px;">
      If you didn't request a password reset, someone may be trying to access your account.
      Please review your account activity and consider updating your password.
    </p>
    <p style="margin:0;color:${TEXT_FAINT};font-size:13px;">
      This code can only be used once and will expire automatically.
    </p>`;

  return send({
    to,
    subject,
    html: layout({ preheader, title: 'Password reset requested', bodyHtml: body }),
    text:
      `Hi ${firstName},\n\n` +
      `We received a request to reset the password on your ${env.APP_NAME} account.\n` +
      `Your reset code is: ${otp}\n` +
      `This code expires in ${expiresInMinutes} minutes.\n\n` +
      `If you didn't request a reset, please review your account activity.`,
  });
};

const sendPasswordChangedAlert = ({ to, name, ip, userAgent, when }) => {
  const firstName = name ? String(name).split(' ')[0] : 'there';
  const subject = `Your ${env.APP_NAME} password was changed`;
  const preheader = `Confirmation that your ${env.APP_NAME} password was just changed.`;
  const eventTime = when || new Date();
  const timestamp = eventTime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const body = `
    <p style="margin:0 0 14px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 14px;">
      This is a confirmation that the password for your ${escapeHtml(env.APP_NAME)} account was just changed.
      All other active sessions have been signed out as a precaution.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;padding:16px 20px;background:${BG_SOFT};border:1px solid ${BORDER};border-radius:8px;">
      ${infoRow('When', timestamp)}
      ${ip ? infoRow('IP address', ip) : ''}
      ${userAgent ? infoRow('Device', userAgent.length > 60 ? userAgent.slice(0, 57) + '...' : userAgent) : ''}
    </table>
    <p style="margin:0 0 6px;color:${TEXT};font-weight:600;">Didn't do this?</p>
    <p style="margin:0 0 14px;">
      Your account may be compromised. Reset your password immediately and contact us at
      <a href="mailto:${escapeHtml(env.SUPPORT_EMAIL)}" style="color:${BRAND};text-decoration:none;font-weight:500;">${escapeHtml(env.SUPPORT_EMAIL)}</a>.
    </p>
    ${button(`${env.APP_URL}/forgot-password`, 'Secure my account')}`;

  return send({
    to,
    subject,
    html: layout({ preheader, title: 'Your password was changed', bodyHtml: body }),
    text:
      `Hi ${firstName},\n\n` +
      `Your ${env.APP_NAME} password was just changed on ${timestamp}.\n` +
      `${ip ? `IP: ${ip}\n` : ''}` +
      `${userAgent ? `Device: ${userAgent}\n` : ''}` +
      `\nIf this wasn't you, reset your password immediately and contact ${env.SUPPORT_EMAIL}.`,
  });
};

module.exports = {
  sendVerificationOtp,
  sendPasswordResetOtp,
  sendPasswordChangedAlert,
};
