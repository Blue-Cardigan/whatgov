import { NextResponse } from 'next/server';
import { sendFeedbackEmail } from '@/app/api/_lib/feedback-welcome-email';
import recipients from '@/app/api/_lib/recipients_test.json';

const isDev = process.env.NODE_ENV === 'development';

export async function POST() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const results = await Promise.all(
      recipients.map(recipient => 
        sendFeedbackEmail(
          recipient.email,
          recipient.name.split(' ')[0] // Use first name only
        )
      )
    );

    const success = results.every(result => result.success);
    const failedEmails = results
      .map((result, index) => !result.success ? recipients[index].email : null)
      .filter(Boolean);

    return NextResponse.json({
      success,
      totalSent: results.length,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined
    });
  } catch (error) {
    console.error('Test feedback email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test feedback emails' },
      { status: 500 }
    );
  }
} 