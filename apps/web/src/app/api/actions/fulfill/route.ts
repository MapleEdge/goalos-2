import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

interface FulfillRequest {
  actionTitle: string
  goalTitle: string
  goalId?: string
}

interface CalendarInvite {
  title: string
  description: string
  attendees: string[]
  duration: number // minutes
}

interface EmailDraft {
  to: string
  subject: string
  body: string
}

interface FulfillResult {
  actionType: 'calendar_invite' | 'email' | 'schedule_block' | 'generic'
  calendarInvite?: CalendarInvite
  emailDraft?: EmailDraft
  scheduleBlock?: {
    title: string
    description: string
    suggestedDuration: number
  }
  outlookUrl?: string
  googleCalUrl?: string
  mailtoUrl?: string
  message: string
}

// Detect action type from title keywords and derive fulfillment data
function classifyAction(
  title: string,
  goalTitle: string,
  stakeholders: {
    name: string
    organization: string | null
    role: string | null
  }[]
): FulfillResult {
  const lower = title.toLowerCase()

  // Meeting / Schedule patterns
  if (
    lower.includes('schedule') ||
    lower.includes('meeting') ||
    lower.includes('meet with') ||
    lower.includes('set up') ||
    lower.includes('office hours')
  ) {
    const person = extractPerson(title, stakeholders)
    const invite: CalendarInvite = {
      title: title,
      description: `Related to goal: ${goalTitle}\n\nAction: ${title}`,
      attendees: person?.email ? [person.email] : [],
      duration: 30,
    }

    const calParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: invite.title,
      details: invite.description,
    })

    const outlookParams = new URLSearchParams({
      subject: invite.title,
      body: invite.description,
    })

    return {
      actionType: 'calendar_invite',
      calendarInvite: invite,
      googleCalUrl: `https://calendar.google.com/calendar/render?${calParams.toString()}`,
      outlookUrl: `https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
      message: `Ready to schedule: "${title}"`,
    }
  }

  // Email patterns
  if (
    lower.includes('email') ||
    lower.includes('send') ||
    lower.includes('reach out') ||
    lower.includes('contact') ||
    lower.includes('follow up') ||
    lower.includes('ask') ||
    lower.includes('request')
  ) {
    const person = extractPerson(title, stakeholders)
    const subject = deriveEmailSubject(title, goalTitle)
    const body = deriveEmailBody(title, goalTitle)

    const mailtoParams = new URLSearchParams({
      subject,
      body,
    })
    const mailto = person?.email
      ? `mailto:${person.email}?${mailtoParams.toString()}`
      : `mailto:?${mailtoParams.toString()}`

    // Outlook web compose
    const outlookMailParams = new URLSearchParams({
      subject,
      body,
    })
    if (person?.email) outlookMailParams.set('to', person.email)

    return {
      actionType: 'email',
      emailDraft: {
        to: person?.email || '',
        subject,
        body,
      },
      mailtoUrl: mailto,
      outlookUrl: `https://outlook.office.com/mail/deeplink/compose?${outlookMailParams.toString()}`,
      message: `Ready to send: "${title}"`,
    }
  }

  // Volunteer / activity / work session patterns
  if (
    lower.includes('volunteer') ||
    lower.includes('assist') ||
    lower.includes('practice') ||
    lower.includes('study') ||
    lower.includes('work on') ||
    lower.includes('complete') ||
    lower.includes('prepare') ||
    lower.includes('review') ||
    lower.includes('research')
  ) {
    const block = {
      title: title,
      description: `Goal: ${goalTitle}\n\nBlocking time for: ${title}`,
      suggestedDuration: 60,
    }

    const calParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      details: block.description,
    })

    const outlookParams = new URLSearchParams({
      subject: title,
      body: block.description,
    })

    return {
      actionType: 'schedule_block',
      scheduleBlock: block,
      googleCalUrl: `https://calendar.google.com/calendar/render?${calParams.toString()}`,
      outlookUrl: `https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams.toString()}`,
      message: `Ready to block time for: "${title}"`,
    }
  }

  // Generic fallback
  return {
    actionType: 'generic',
    message: `Action identified: "${title}" for goal "${goalTitle}"`,
  }
}

function extractPerson(
  title: string,
  stakeholders: {
    name: string
    organization: string | null
    role: string | null
  }[]
): { name: string; email?: string } | null {
  for (const s of stakeholders) {
    if (title.toLowerCase().includes(s.name.toLowerCase())) {
      return { name: s.name }
    }
    // Check last name
    const parts = s.name.split(' ')
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1] ?? ''
      if (lastName && title.toLowerCase().includes(lastName.toLowerCase())) {
        return { name: s.name }
      }
    }
  }
  return null
}

function deriveEmailSubject(actionTitle: string, goalTitle: string): string {
  const lower = actionTitle.toLowerCase()
  if (lower.includes('recommendation') || lower.includes('reference')) {
    return `Request for Recommendation — ${goalTitle}`
  }
  if (lower.includes('intro') || lower.includes('introduction')) {
    return `Introduction Request — ${goalTitle}`
  }
  if (lower.includes('follow up')) {
    return `Following Up — ${goalTitle}`
  }
  return `Re: ${goalTitle}`
}

function deriveEmailBody(actionTitle: string, goalTitle: string): string {
  return [
    `Hi,`,
    ``,
    `I'm reaching out regarding: ${actionTitle}`,
    ``,
    `This is related to my goal: ${goalTitle}`,
    ``,
    `[Add your specific request here]`,
    ``,
    `Thank you for your time.`,
    ``,
    `Best regards`,
  ].join('\n')
}

export async function POST(request: Request) {
  const body: FulfillRequest = await request.json()

  if (!body.actionTitle || !body.goalTitle) {
    return NextResponse.json(
      { error: 'actionTitle and goalTitle are required' },
      { status: 400 }
    )
  }

  // Fetch stakeholders for person extraction
  const stakeholders = await prisma.stakeholder.findMany({
    select: { name: true, organization: true, role: true },
  })

  const result = classifyAction(body.actionTitle, body.goalTitle, stakeholders)

  return NextResponse.json(result)
}
