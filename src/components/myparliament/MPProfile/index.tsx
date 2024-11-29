'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getMPData, getMPKeyPoints } from "@/lib/supabase/myparliament";
import { useAuth } from "@/contexts/AuthContext";
import { AuthenticatedRoute } from "@/components/auth/AuthenticatedRoute";
import { MPProfileCard } from "./MPProfileCard";
import { MPKeyPoints } from "./MPKeyPoints";
import { MPLinks } from "./MPLinks";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
import { MPTopics } from "./MPTopics";
import { AiTopic, MPData, MPKeyPoint } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export function MPProfile() {
  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPoint[]>([]);
  const [topics, setTopics] = useState<AiTopic[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { profile, isEngagedCitizen } = useAuth();

  // Add loading states for each section
  const [profileLoading, setProfileLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [keyPointsLoading, setKeyPointsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.mp_id) {
        setProfileLoading(false);
        setTopicsLoading(false);
        setKeyPointsLoading(false);
        return;
      }
      
      try {
        // Load MP profile data
        setProfileLoading(true);
        const mpData = await getMPData(profile.mp_id);
        setMPData(mpData);
        setProfileLoading(false);

        // Load key points and topics
        setKeyPointsLoading(true);
        setTopicsLoading(true);
        const points = await getMPKeyPoints(profile.mp.toString());
        
        if (mpData && points) {
          // Process topics
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
          setKeyPoints(points);
        }
        
        setError(null);
      } catch (e) {
        setError('Error loading MP data');
        console.error(e);
      } finally {
        setProfileLoading(false);
        setTopicsLoading(false);
        setKeyPointsLoading(false);
      }
    }

    fetchData();
  }, [profile?.mp_id, profile?.mp]);

  return (
    <AuthenticatedRoute>
      <Card className="p-3 sm:p-4">
        <div className="space-y-5 sm:space-y-6">
          {error ? (
            <div className="text-red-500 text-center py-4">
              {error}
            </div>
          ) : (
            <>
              <MPProfileCard mpData={mpData} loading={profileLoading} />
              {!profileLoading && mpData && (
                <>
                  <MPLinks mpData={mpData} />
                  {isEngagedCitizen ? (
                    <>
                      {!topicsLoading && topics.length > 0 && (
                        <div className="pt-2">
                          <MPTopics topics={topics} totalMentions={totalMentions} />
                        </div>
                      )}
                      {!keyPointsLoading && keyPoints.length > 0 && (
                        <div className="pt-2">
                          <MPKeyPoints keyPoints={keyPoints} />
                        </div>
                      )}
                      {(topicsLoading || keyPointsLoading) && (
                        <div className="space-y-4">
                          <Skeleton className="h-[200px] w-full" />
                          <Skeleton className="h-[150px] w-full" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="pt-2">
                      <SubscriptionCTA
                        title="Upgrade to track your MP's activity"
                        description="Get detailed insights into your MP's parliamentary contributions, voting record, and key positions on important issues."
                        features={[
                          "See which topics your MP speaks on",
                          "Track your MP's votes in Parliamentary Divisions",
                          "Read your MP's key points and speeches"
                        ]}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </AuthenticatedRoute>
  );
} 