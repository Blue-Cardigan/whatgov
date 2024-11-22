'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getMPData, getMPKeyPoints } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { AuthenticatedRoute } from "@/components/auth/AuthenticatedRoute";
import { Button } from "@/components/ui/button";
import { MPProfileCard } from "./MPProfileCard";
import { MPKeyPoints } from "./MPKeyPoints";
import { MPLinks } from "./MPLinks";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
import { MPTopics } from "./MPTopics";
import { AiTopic, MPData, MPKeyPoint } from "@/types";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";

export function MPProfile() {
  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPoint[]>([]);
  const [topics, setTopics] = useState<AiTopic[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, isEngagedCitizen } = useAuth();

  useEffect(() => {
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
        
        if (mpData) {
          setMPData(mpData);
          const topicsMap = new Map<string, AiTopic>();
          points.forEach(point => {
            if (Array.isArray(point.ai_topics)) {
              point.ai_topics.forEach(topic => {
                const existingTopic = topicsMap.get(topic.name);
                if (!existingTopic) {
                  topicsMap.set(topic.name, {
                    name: topic.name,
                    speakers: Array.from(new Set([...topic.speakers])),
                    frequency: 1,
                    subtopics: Array.from(new Set([...topic.subtopics]))
                  });
                } else {
                  existingTopic.frequency += 1;
                  existingTopic.speakers = Array.from(new Set([
                    ...existingTopic.speakers,
                    ...topic.speakers
                  ]));
                  existingTopic.subtopics = Array.from(new Set([
                    ...existingTopic.subtopics,
                    ...topic.subtopics
                  ]));
                  topicsMap.set(topic.name, existingTopic);
                }
              });
            }
          });
          
          const sortedTopics = Array.from(topicsMap.values())
            .sort((a, b) => b.frequency - a.frequency);
          
          const total = sortedTopics.reduce((sum, topic) => sum + topic.frequency, 0);
          
          setTopics(sortedTopics);
          setTotalMentions(total);
        }
        setKeyPoints(points);
      } catch (e) {
        setError('Error loading MP data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.mp_id, profile?.mp]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !mpData) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
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
    <AuthenticatedRoute>
      <Card className="p-4">
        <div className="space-y-6">
          <MPProfileCard mpData={mpData} />
          <MPLinks mpData={mpData} />
          {isEngagedCitizen ? (
            <>
              {topics.length > 0 && <MPTopics topics={topics} totalMentions={totalMentions} />}
              {keyPoints.length > 0 && <MPKeyPoints keyPoints={keyPoints} />}
            </>
          ) : (
            <SubscriptionCTA
              title="Upgrade to track your MP's activity"
              description="Get detailed insights into your MP's parliamentary contributions, voting record, and key positions on important issues."
              features={[
                "See which topics your MP speaks on",
                "Track your MP's votes in Parliamentary Divisions",
                "Read your MP's key points and speeches"
              ]}
            />
          )}
        </div>
      </Card>
    </AuthenticatedRoute>
  );
} 