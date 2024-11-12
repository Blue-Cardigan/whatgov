import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "@/components/ui/command"
import { SearchResults } from "@/components/search/SearchResults";

export default function Search() {
    return (
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Search Debates</h1>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search debates, MPs, or topics..." 
                className="w-full"
              />
            </div>
            <Button>Search</Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Calendar
                      mode="single"
                      className="rounded-md border"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Topics</Label>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search topics..." />
                    <CommandEmpty>No topics found.</CommandEmpty>
                    <CommandGroup>
                      {/* Add your topic items here */}
                    </CommandGroup>
                  </Command>
                </div>
                
                <div>
                  <Label>MPs</Label>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search MPs..." />
                    <CommandEmpty>No MPs found.</CommandEmpty>
                    <CommandGroup>
                      {/* Add your MPs items here */}
                    </CommandGroup>
                  </Command>
                </div>
                
                <div>
                  <Label>Parties</Label>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search parties..." />
                    <CommandEmpty>No parties found.</CommandEmpty>
                    <CommandGroup>
                      {/* Add your parties items here */}
                    </CommandGroup>
                  </Command>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="md:col-span-3">
            <SearchResults />
          </div>
        </div>
      </div>
    );
  }