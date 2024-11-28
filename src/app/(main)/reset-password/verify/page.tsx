"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      // Redirect to reset password page with the code
      router.replace(`/reset-password?code=${code}`);
    } else {
      // No code found, redirect to login
      router.replace('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="animate-pulse">Verifying...</div>
  );
}

export default function ResetPasswordVerify() {
  return (
    <div className="container max-w-md mx-auto mt-16 px-4">
      <div className="flex items-center justify-center py-8">
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
          <ResetPasswordVerifyContent />
        </Suspense>
      </div>
    </div>
  );
} 