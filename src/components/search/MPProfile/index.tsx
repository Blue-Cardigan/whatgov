'use client';

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { getMPData, getMPKeyPointsByName } from "@/lib/supabase/mpsearch";
import { useAuth } from "@/contexts/AuthContext";
import { MPProfileCard } from "./MPProfileCard";
import { MPLinks } from "./MPLinks";
import { SubscriptionCTA } from "@/components/ui/subscription-cta";
import { AiTopic, MPData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInPrompt } from "@/components/ui/sign-in-prompt";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MPSearch } from './MPSearch';

export function MPProfile() {
  const { user, loading, isProfessional } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [searchedMpId, setSearchedMpId] = useState<string | null>(null);
  const currentSearchTerm = searchParams.get('mp') || '';

  const handleSearch = useCallback((searchTerm: string) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (searchTerm) {
      newParams.set('mp', searchTerm);
      setSearchedMpId(searchTerm);
    } else {
      newParams.delete('mp');
      setSearchedMpId(null);
    }

    router.push(`${pathname}?${newParams.toString()}`);
  }, [pathname, router, searchParams]);

  const [mpData, setMPData] = useState<MPData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [keyPointsLoading, setKeyPointsLoading] = useState(true);

  useEffect(() => {
    if (currentSearchTerm) {
      setSearchedMpId(currentSearchTerm);
    } else {
      setSearchedMpId(null);
    }
  }, [currentSearchTerm]);

  useEffect(() => {
    async function fetchData() {
      if (!searchedMpId) {
        setProfileLoading(false);
        setTopicsLoading(false);
        setKeyPointsLoading(false);
        return;
      }
      
      try {
        setError(null);
        setProfileLoading(true);
        setKeyPointsLoading(true);
        setTopicsLoading(true);

        const mpData = await getMPData(searchedMpId);
        
        if (!mpData) {
          setError(`No MP found matching "${searchedMpId}"`);
          setMPData(null);
          return;
        }

        setMPData(mpData);
        
        if (!isProfessional) {
          setKeyPointsLoading(false);
          setTopicsLoading(false);
          return;
        }
        
        const { data: points } = await getMPKeyPointsByName(mpData.member_id);
        
        if (points) {
          const topicsMap = new Map<string, AiTopic>();
          
          points.forEach(point => {
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
  }, [searchedMpId, isProfessional]);

  if (loading) {
    return <Card className="p-3 sm:p-4">
      <Skeleton className="h-[400px] w-full" />
    </Card>;
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Sign in to search MPs"
        description="Search and view MP profiles and their parliamentary activity."
      />
    );
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="space-y-5 sm:space-y-6">
        <div className="border-b pb-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">MP Profile</h2>
            <MPSearch
              initialValue={currentSearchTerm}
              onSearch={handleSearch}
            />
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
                {isProfessional ? (
                  <>
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
                      title="Upgrade to access MP insights"
                      description="Get detailed insights into MPs' parliamentary contributions, voting records, and key positions on important issues."
                      features={[
                        "See which topics MPs speak on",
                        "Track MPs' votes in Parliamentary Divisions",
                        "Read MPs' key points and speeches"
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