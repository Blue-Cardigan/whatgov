import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/app/api/_lib/welcome-email';

// Only enable in development
const isDev = process.env.NODE_ENV === 'development';

export async function POST() {
  if (!isDev) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const testData = {
      email: 'jethro@creativesforukraine.uk', // Replace with your test email
      name: 'Jethro',
      newsletter: true
    };

    const result = await sendWelcomeEmail(
      testData.email,
      testData.name,
      testData.newsletter
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test welcome email error:', error);
    return NextResponse.json(
      { error: 'Failed to send test welcome email' },
      { status: 500 }
    );
  }
} 