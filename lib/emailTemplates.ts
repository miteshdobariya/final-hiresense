import { formatProctoringEventType } from "@/lib/proctoring"
import { getSenderAddress } from "@/lib/mailer"

export interface ProctoringAlertEmailDetails {
  candidateName?: string
  candidateEmail?: string
  candidateId?: string
  eventType: string
  emittedAt: string
  roundName?: string
  details?: Record<string, unknown>
  dashboardUrl?: string
}

function stringifyDetails(details?: Record<string, unknown>) {
  if (!details) return "N/A"
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

export function buildProctoringAlertEmail(details: ProctoringAlertEmailDetails) {
  const readableType = formatProctoringEventType(details.eventType)
  const subject = `Proctoring alert: ${details.candidateName || details.candidateEmail || details.candidateId || "Candidate"} - ${readableType}`
  const eventTime = new Date(details.emittedAt).toLocaleString()
  const detailString = stringifyDetails(details.details)

  const html = `
    <p>Hello,</p>
    <p>The candidate <strong>${details.candidateName || details.candidateEmail || details.candidateId || "Unknown"}</strong> triggered a <strong>${readableType}</strong> proctoring alert at <strong>${eventTime}</strong>.</p>
    ${details.roundName ? `<p>Round: <strong>${details.roundName}</strong></p>` : ""}
    <p><strong>Details</strong></p>
    <pre style="padding:12px;border-radius:8px;background:#f5f5f5;white-space:pre-wrap;font-family:monospace;">${detailString}</pre>
    ${details.dashboardUrl ? `<p>You can review and take action here: <a href="${details.dashboardUrl}">${details.dashboardUrl}</a></p>` : ""}
    <p>Regards,<br/>${getSenderAddress()}</p>
  `

  const text = `Hello,

The candidate ${details.candidateName || details.candidateEmail || details.candidateId || "Unknown"} triggered a ${readableType} proctoring alert at ${eventTime}.${details.roundName ? `\nRound: ${details.roundName}` : ""}

Details:
${detailString}

${details.dashboardUrl ? `Review: ${details.dashboardUrl}\n\n` : ""}Regards,
${getSenderAddress()}`

  return { subject, html, text }
}

