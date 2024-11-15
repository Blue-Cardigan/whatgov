import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail } from '../../_lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, confirmationLink } = await request.json();

    if (!email || !confirmationLink) {
      return NextResponse.json(
        { error: 'Email and confirmation link are required' },
        { status: 400 }
      );
    }

    const result = await sendConfirmationEmail(email, confirmationLink);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 