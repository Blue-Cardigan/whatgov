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

export function MPProfile() {
  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    async function fetchData() {
      if (!profile?.mp) return;
      
      try {
        const [mpData, points] = await Promise.all([
          getMPData(profile.mp, profile.constituency!),
          getMPKeyPoints(profile.mp)
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
  }, [profile?.mp, profile?.constituency]);

  if (loading) {
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

  if (error || !mpData) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <p className="text-muted-foreground">{error || 'Unable to load MP data'}</p>
          {(!profile?.mp || !profile?.constituency) && (
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
        {keyPoints.length > 0 && <MPKeyPoints keyPoints={keyPoints} />}
      </div>
    </Card>
  );
} 