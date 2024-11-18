'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getMPData, getMPKeyPoints, type MPKeyPoint } from "@/lib/supabase";
import type { MPData } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MPProfileCard } from "./MPProfileCard";
import { MPKeyPoints } from "./MPKeyPoints";
import { MPLinks } from "./MPLinks";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";

export function MPProfile() {
  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, loading: authLoading, isEngagedCitizen } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    async function fetchData() {
      if (!profile?.mp_id) {
        setLoading(false);
        return;
      }
      
      try {
        const [mpData, points] = await Promise.all([
          getMPData(profile.mp_id),
          getMPKeyPoints(profile.mp.toString())
        ]);
        
        if (mpData) setMPData(mpData);
        setKeyPoints(points);
      } catch (e) {
        setError('Error loading MP data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.mp_id, profile?.mp, authLoading]);

  if (authLoading || loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <SignInPrompt
        title="Sign in to view your MP"
        description="Sign in to track your MP's activity and see how they represent your interests in Parliament"
      />
    );
  }

  if (error || !mpData) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <p className="text-muted-foreground">{error || 'Unable to load MP data'}</p>
          {(!profile?.mp_id) && (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/settings'}
            >
              Update Profile
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <MPProfileCard mpData={mpData} />
        <MPLinks mpData={mpData} />
        {isEngagedCitizen ? (
          keyPoints.length > 0 && <MPKeyPoints keyPoints={keyPoints} />
        ) : (
          <SubscriptionCTA
            title="Upgrade to track your MP's activity"
            description="Get detailed insights into your MP's parliamentary contributions, voting record, and key positions on important issues."
            features={[
              "View your MP's recent points",
              "Track their voting patterns",
              "Get alerts when they speak in debates"
            ]}
          />
        )}
      </div>
    </Card>
  );
} 