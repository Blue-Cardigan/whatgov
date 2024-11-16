'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function checkFirstVisit() {
  const cookieStore = await cookies()
  const hasVisited = cookieStore.get('has_visited')

  if (!hasVisited) {
    await cookieStore.set('has_visited', 'true', {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
    redirect('/accounts/signup')
  }
}