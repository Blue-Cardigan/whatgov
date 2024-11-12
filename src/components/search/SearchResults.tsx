"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  date: string;
  summary: string;
  speakers: number;
  topics: string[];
  relevanceScore: number;
}

export function SearchResults() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {results.length} results found
        </p>
        <select className="text-sm border rounded-md px-2 py-1">
          <option>Most Relevant</option>
          <option>Most Recent</option>
          <option>Most Speakers</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <Link href={`/debates/${result.id}`}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold line-clamp-2">
                        {result.title}
                      </h3>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(result.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {result.speakers} speakers
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.summary}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {result.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button variant="outline">Load More Results</Button>
        </div>
      )}
    </div>
  );
}