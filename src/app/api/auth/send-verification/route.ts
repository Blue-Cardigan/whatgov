import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail } from '../../_lib/email';
import { rateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    
    // Check rate limit
    const { success, limit, reset, remaining } = await rateLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        limit,
        reset,
        remaining
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      });
    }

    const { email, confirmationLink } = await request.json();

    if (!email || !confirmationLink) {
      return NextResponse.json(
        { error: 'Email and confirmation link are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const result = await sendConfirmationEmail(email, confirmationLink);

    if (!result.success) {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      limit,
      remaining,
      reset
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 