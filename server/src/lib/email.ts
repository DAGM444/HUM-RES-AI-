import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  cc?: string | string[];
  bcc?: string | string[];
  html?: string;
  from?: string;
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string | false;
  accepted: string[];
  rejected: string[];
  simulated?: boolean;
}

let cachedTransporter: Transporter | null = null;
let isEthereal = false;
let isConsoleFallback = false;

/**
 * Returns or initializes a Nodemailer transporter.
 * If SMTP credentials are configured in environment variables, standard SMTP is used.
 * Otherwise, attempts to create an Ethereal test account.
 * If Ethereal creation fails (e.g. offline), falls back to a stream/JSON transport logging to console.
 */
export async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secureEnv = process.env.SMTP_SECURE;

  if (host && user && pass) {
    const portNum = Number(port) || 587;
    const isSecure = secureEnv !== undefined ? secureEnv === 'true' : portNum === 465;

    cachedTransporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
    });

    console.log(`[Email] Configured custom SMTP transporter for ${host}:${portNum}`);
    return cachedTransporter;
  }

  // Fallback to Ethereal test account
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log(`[Email] Configured Ethereal test account: ${testAccount.user}`);
    return cachedTransporter;
  } catch (error) {
    console.warn('[Email] Could not create Ethereal test account, falling back to console transport:', error);
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    isConsoleFallback = true;
    return cachedTransporter;
  }
}

/**
 * Dispatches an email using the active transporter.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const transporter = await getTransporter();

  const from = options.from ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    '"HR Department" <hr@company.com>';

  const html = options.html || options.body.replace(/\n/g, '<br />');

  const mailOptions: SendMailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    text: options.body,
    html,
  };

  if (options.cc) {
    mailOptions.cc = options.cc;
  }
  if (options.bcc) {
    mailOptions.bcc = options.bcc;
  }

  const info = await transporter.sendMail(mailOptions);

  let previewUrl: string | false = false;
  if (isEthereal) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Ethereal Preview URL: ${previewUrl}`);
    }
  }

  if (isConsoleFallback) {
    console.log('[Email Simulation Dispatch]', {
      from,
      to: options.to,
      subject: options.subject,
      body: options.body,
      metadata: options.metadata,
    });
  }

  return {
    messageId: info.messageId || `msg-${Date.now()}`,
    previewUrl,
    accepted: Array.isArray(info.accepted) ? (info.accepted as string[]) : [String(options.to)],
    rejected: Array.isArray(info.rejected) ? (info.rejected as string[]) : [],
    simulated: isConsoleFallback,
  };
}
