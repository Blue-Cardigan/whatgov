import { NextResponse } from 'next/server';
import { sendFeedbackEmail } from '@/app/api/_lib/feedback-welcome-email';

const isDev = process.env.NODE_ENV === 'development';

export async function POST() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const testData = {
      email: 'hi@whatgov.co.uk',
      name: 'Jethro'
    };

    const result = await sendFeedbackEmail(
      testData.email,
      testData.name
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test feedback email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test feedback email' },
      { status: 500 }
    );
  }
} 