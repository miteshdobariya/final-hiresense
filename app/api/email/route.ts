import { NextRequest, NextResponse } from "next/server";
import { sendMail, getSenderAddress } from "@/lib/mailer";
import { buildProctoringAlertEmail } from "@/lib/emailTemplates";

// Add type definitions for email template functions
interface CandidateAssignmentDetails {
  candidateName: string;
  interviewerName: string;
  interviewDate: string;
  interviewTime: string;
  duration: string | number;
  interviewFormat: string;
  timeZone: string;
}

interface InterviewerAssignmentDetails {
  interviewerName: string;
  candidateName: string;
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  duration: string | number;
  interviewFormat: string;
  timeZone: string;
}

interface AssignmentNotificationDetails {
  assigneeName: string;
  assigneeRole: string;
  candidateName: string;
  candidateEmail: string;
  interviewDate: string;
  interviewTime: string;
  duration: string | number;
  interviewFormat: string;
  timeZone: string;
  assignedBy: string;
}

interface CandidateUnassignmentDetails {
  candidateName: string;
}

function getCandidateAssignmentEmail({ candidateName, interviewerName, interviewDate, interviewTime, duration, interviewFormat, timeZone }: CandidateAssignmentDetails) {
  const subject = "Your Interview Has Been Scheduled at DEVX COMMERCE";
  const html = `
    <p>Dear <strong>${candidateName}</strong>,</p>
    <p>We are pleased to inform you that your interview has been scheduled with <strong>DEVX COMMERCE</strong>.</p>
    <ul>
      <li><strong>Interview Date:</strong> ${interviewDate}</li>
      <li><strong>Time:</strong> ${interviewTime} (${timeZone})</li>
      <li><strong>Duration:</strong> ${duration} minutes</li>
      <li><strong>Interview Format:</strong> ${interviewFormat}</li>
      <li><strong>Assigned Interviewer:</strong> ${interviewerName}</li>
    </ul>
    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Best regards,<br/>DEVX COMMERCE HR Team</p>
  `;
  const text = `Dear ${candidateName},\n\nWe are pleased to inform you that your interview has been scheduled with DEVX COMMERCE.\n\nInterview Date: ${interviewDate}\nTime: ${interviewTime} (${timeZone})\nDuration: ${duration} minutes\nInterview Format: ${interviewFormat}\nAssigned Interviewer: ${interviewerName}\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,\nDEVX COMMERCE HR Team`;
  return { subject, html, text };
}

function getInterviewerAssignmentEmail({ interviewerName, candidateName, candidateEmail, interviewDate, interviewTime, duration, interviewFormat, timeZone }: InterviewerAssignmentDetails) {
  const subject = "New Candidate Assigned for Interview";
  const html = `
    <p>Dear <strong>${interviewerName}</strong>,</p>
    <p>A new candidate has been assigned to you for an interview at <strong>DEVX COMMERCE</strong>.</p>
    <ul>
      <li><strong>Candidate Name:</strong> ${candidateName}</li>
      <li><strong>Email:</strong> ${candidateEmail}</li>
      <li><strong>Interview Date:</strong> ${interviewDate}</li>
      <li><strong>Time:</strong> ${interviewTime} (${timeZone})</li>
      <li><strong>Duration:</strong> ${duration} minutes</li>
      <li><strong>Interview Format:</strong> ${interviewFormat}</li>
    </ul>
    <p>Please review the candidate's profile and be prepared for the interview.</p>
    <p>Best regards,<br/>DEVX COMMERCE HR Team</p>
  `;
  const text = `Dear ${interviewerName},\n\nA new candidate has been assigned to you for an interview at DEVX COMMERCE.\n\nCandidate Name: ${candidateName}\nEmail: ${candidateEmail}\nInterview Date: ${interviewDate}\nTime: ${interviewTime} (${timeZone})\nDuration: ${duration} minutes\nInterview Format: ${interviewFormat}\n\nPlease review the candidate's profile and be prepared for the interview.\n\nBest regards,\nDEVX COMMERCE HR Team`;
  return { subject, html, text };
}

function getAssignmentNotificationEmail({ assigneeName, assigneeRole, candidateName, candidateEmail, interviewDate, interviewTime, duration, interviewFormat, timeZone, assignedBy }: AssignmentNotificationDetails) {
  const subject = `New Candidate Assigned for Interview (${assigneeRole})`;
  const html = `
    <p>Dear <strong>${assigneeName}</strong>,</p>
    <p>A new candidate has been assigned to you for an interview at <strong>DEVX COMMERCE</strong>.</p>
    <ul>
      <li><strong>Candidate Name:</strong> ${candidateName}</li>
      <li><strong>Email:</strong> ${candidateEmail}</li>
      <li><strong>Interview Date:</strong> ${interviewDate}</li>
      <li><strong>Time:</strong> ${interviewTime} (${timeZone})</li>
      <li><strong>Duration:</strong> ${duration} minutes</li>
      <li><strong>Interview Format:</strong> ${interviewFormat}</li>
      <li><strong>Assigned By:</strong> ${assignedBy}</li>
    </ul>
    <p>Please review the candidate's profile and be prepared for the interview.</p>
    <p>Best regards,<br/>DEVX COMMERCE HR Team</p>
  `;
  const text = `Dear ${assigneeName},\n\nA new candidate has been assigned to you for an interview at DEVX COMMERCE.\n\nCandidate Name: ${candidateName}\nEmail: ${candidateEmail}\nInterview Date: ${interviewDate}\nTime: ${interviewTime} (${timeZone})\nDuration: ${duration} minutes\nInterview Format: ${interviewFormat}\nAssigned By: ${assignedBy}\n\nPlease review the candidate's profile and be prepared for the interview.\n\nBest regards,\nDEVX COMMERCE HR Team`;
  return { subject, html, text };
}

function getCandidateUnassignmentEmail({ candidateName }: CandidateUnassignmentDetails) {
  const subject = "Interview Update from DEVX COMMERCE";
  const html = `
    <p>Dear <strong>${candidateName}</strong>,</p>
    <p>We regret to inform you that your scheduled interview at <strong>DEVX COMMERCE</strong> has been <strong>canceled</strong> due to some misconduct. We will inform you if and when a new interview is assigned in the future.</p>
    <p>If you have any questions, please reply to this email.</p>
    <p>Best regards,<br/>DEVX COMMERCE HR Team</p>
  `;
  const text = `Dear ${candidateName},\n\nWe regret to inform you that your scheduled interview at DEVX COMMERCE has been canceled due to some misconduct. We will inform you if and when a new interview is assigned in the future.\n\nIf you have any questions, please reply to this email.\n\nBest regards,\nDEVX COMMERCE HR Team`;
  return { subject, html, text };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, ...details } = body;

    let subject = "";
    let html = "";
    let text = "";

    if (type === "candidate-assignment") {
      ({ subject, html, text } = getCandidateAssignmentEmail(details));
    } else if (type === "interviewer-assignment") {
      ({ subject, html, text } = getInterviewerAssignmentEmail(details));
    } else if (type === "assignment-notification") {
      ({ subject, html, text } = getAssignmentNotificationEmail(details));
    } else if (type === "candidate-unassignment") {
      ({ subject, html, text } = getCandidateUnassignmentEmail(details));
    } else if (type === "proctoring-alert") {
      ({ subject, html, text } = buildProctoringAlertEmail(details));
    } else {
      // fallback to generic
      subject = body.subject;
      html = body.html;
      text = body.text;
    }

    const fromAddress = getSenderAddress();

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return NextResponse.json({ success: false, error: "Recipient list is empty." }, { status: 400 });
    }

    const info = await sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 