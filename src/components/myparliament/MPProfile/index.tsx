'use client';

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { getMPData, getMPKeyPointsByName } from "@/lib/supabase/myparliament";
import type { MPKeyPointDetails } from "@/lib/supabase/myparliament";
import { useAuth } from "@/contexts/AuthContext";
import { MPProfileCard } from "./MPProfileCard";
import { MPKeyPoints } from "./MPKeyPoints";
import { MPLinks } from "./MPLinks";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
import { MPTopics } from "./MPTopics";
import { AiTopic, MPData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MPSearch } from './MPSearch';

export function MPProfile() {
  const { user, profile, loading, isEngagedCitizen, isPremium } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Add search-related state
  const [searchedMpId, setSearchedMpId] = useState<string | null>(null);

  // Get current search params
  const currentSearchTerm = searchParams.get('mp') || '';

  // Add check for search permissions
  const canSearchMPs = isPremium;

  // Handle search updates - add permission check
  const handleSearch = useCallback((searchTerm: string) => {
    // Block search if user doesn't have permission
    if (!canSearchMPs) return;

    const newParams = new URLSearchParams(searchParams);
    
    if (searchTerm) {
      newParams.set('mp', searchTerm);
      setSearchedMpId(searchTerm);
    } else {
      newParams.delete('mp');
      setSearchedMpId(null);
    }

    router.push(`${pathname}?${newParams.toString()}`);
  }, [pathname, router, searchParams, canSearchMPs]);

  const [mpData, setMPData] = useState<MPData | null>(null);
  const [keyPoints, setKeyPoints] = useState<MPKeyPointDetails[]>([]);
  const [topics, setTopics] = useState<AiTopic[]>([]);
  const [totalMentions, setTotalMentions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [keyPointsLoading, setKeyPointsLoading] = useState(true);
  
  // Effect to handle URL search param changes
  useEffect(() => {
    if (currentSearchTerm) {
      setSearchedMpId(currentSearchTerm);
    } else {
      setSearchedMpId(null);
    }
  }, [currentSearchTerm]);

  // Effect to fetch MP data
  useEffect(() => {
    async function fetchData() {
      const mpNameToFetch = searchedMpId || profile?.mp;
      
      if (!mpNameToFetch) {
        setProfileLoading(false);
        setTopicsLoading(false);
        setKeyPointsLoading(false);
        return;
      }
      
      try {
        // Reset states
        setError(null);
        setProfileLoading(true);
        setKeyPointsLoading(true);
        setTopicsLoading(true);

        // Load MP profile data
        const mpData = await getMPData(mpNameToFetch);
        
        if (!mpData) {
          setError(`No MP found matching "${mpNameToFetch}"`);
          setMPData(null);
          setKeyPoints([]);
          setTopics([]);
          return;
        }

        setMPData(mpData);
        
        // Check permissions before loading key points
        const isUserMP = mpData.display_as === profile?.mp;
        if (!isEngagedCitizen || (!isPremium && !isUserMP)) {
          // User doesn't have permission to view key points
          setKeyPoints([]);
          setTopics([]);
          setKeyPointsLoading(false);
          setTopicsLoading(false);
          return;
        }
        
        // Load key points for authorized users
        const { data: points } = await getMPKeyPointsByName(mpData.display_as);
        
        if (points) {
          setKeyPoints(points);
          
          // Process topics
          const topicsMap = new Map<string, AiTopic>();
          let mentionsCount = 0;
          
          points.forEach(point => {
            mentionsCount++;
            if (Array.isArray(point.ai_topics)) {
              point.ai_topics.forEach(topic => {
                const existingTopic = topicsMap.get(topic.name);
                if (!existingTopic) {
                  topicsMap.set(topic.name, {
                    name: topic.name,
                    speakers: topic.speakers.map(s => s.name),
                    frequency: 1,
                    subtopics: Array.from(new Set(topic.speakers.flatMap(s => s.subtopics))),
                    debates: [{
                      id: point.debate_id,
                      ext_id: point.debate_ext_id,
                      title: point.debate_title,
                      date: point.debate_date,
                      subtopics: topic.speakers.flatMap(s => s.subtopics)
                    }]
                  });
                } else {
                  existingTopic.frequency++;
                  if (existingTopic.debates) {
                    existingTopic.debates.push({
                      id: point.debate_id,
                      ext_id: point.debate_ext_id,
                      title: point.debate_title,
                      date: point.debate_date,
                      subtopics: topic.speakers.flatMap(s => s.subtopics)
                    });
                  }
                }
              });
            }
          });

          setTopics(Array.from(topicsMap.values()));
          setTotalMentions(mentionsCount);
        }
      } catch (e) {
        console.error('Error fetching MP data:', e);
        setError('Error loading MP data');
      } finally {
        setProfileLoading(false);
        setTopicsLoading(false);
        setKeyPointsLoading(false);
      }
    }

    fetchData();
  }, [searchedMpId, profile?.mp, isEngagedCitizen, isPremium]);

  if (loading) {
    return <Card className="p-3 sm:p-4">
      <Skeleton className="h-[400px] w-full" />
    </Card>;
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to view your MP&apos;s profile"
        description="Track your MP's activity and see their key positions on important issues."
      />
    );
  }

  if (!profile) {
    return (
      <Card className="p-3 sm:p-4">
        <div className="text-center py-8">
          <h2 className="text-lg font-semibold mb-2">Complete Your Profile</h2>
          <p className="text-muted-foreground mb-4">
            Please complete your profile to view your MP&apos;s information
          </p>
          <button
            onClick={() => router.push('/accounts/profile')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Complete Profile
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="space-y-5 sm:space-y-6">
        {/* Search Section - Update to show permission message */}
        <div className="border-b pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">MP Profile</h2>
              {profile?.mp && searchedMpId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchedMpId(null);
                    handleSearch('');
                  }}
                >
                  Back to My MP
                </Button>
              )}
            </div>
            {canSearchMPs ? (
              <MPSearch
                initialValue={currentSearchTerm}
                onSearch={handleSearch}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Upgrade to Professional to search and view other MPs&apos; profiles
              </div>
            )}
          </div>
        </div>

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
                    {/* Show data if it's their MP or they're premium */}
                    {(mpData.display_as === profile?.mp || isPremium) ? (
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
                          title="Upgrade to view other MPs' activity"
                          description="Get access to detailed insights for all MPs with a Professional subscription."
                          features={[
                            "View key points for any MP",
                            "Compare MPs' positions on issues",
                            "Track multiple MPs' activities"
                          ]}
                        />
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
  );
} 