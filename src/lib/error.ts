import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function handleError(
  error: Error,
  request: Request
) {

  await Sentry.captureException(error, {
    extra: {
      route: new URL(request.url).pathname
    }
  });
  if (process.env.NODE_ENV === 'development') {
    console.error(error)
  }
  
  return NextResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  )
}