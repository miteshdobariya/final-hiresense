import nodemailer from "nodemailer"

const DEFAULT_SENDER = process.env.EMAIL_FROM || "miteshdobariya2206@gmail.com"
const GMAIL_USER = process.env.GMAIL_USER || DEFAULT_SENDER

let transporter: nodemailer.Transporter | null = null

function ensureTransporter() {
  if (transporter) return transporter

  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing GMAIL_APP_PASSWORD. Provide a Gmail App Password to enable email alerts.")
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  return transporter
}

export function getSenderAddress() {
  return DEFAULT_SENDER
}

export async function sendMail(options: nodemailer.SendMailOptions) {
  const mailer = ensureTransporter()
  return mailer.sendMail({
    from: getSenderAddress(),
    ...options,
  })
}

