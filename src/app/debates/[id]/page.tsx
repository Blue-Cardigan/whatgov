import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Users } from "lucide-react";
import { ArrowLeft } from "lucide-react";

export default function DebateDetail({ params }: { params: { id: string } }) {
    return (
      <div className="container py-6">
        <DebateHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DebateContent />
          </div>
          <div>
            <DebateSidebar />
          </div>
        </div>
      </div>
    );
  }
  
  const DebateHeader = () => {
    return (
      <div className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Badge>Live</Badge>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {/* Debate title */}
            </h1>
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{/* Date */}</span>
              <span className="mx-2">•</span>
              <Users className="w-4 h-4 mr-2" />
              <span>{/* Number of speakers */}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const DebateContent = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {/* AI-generated summary */}
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {/* List of debate contributions */}
        </div>
      </div>
    );
  };
  
  const DebateSidebar = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            {/* List of speakers */}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Party Participation</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Party distribution chart */}
          </CardContent>
        </Card>
      </div>
    );
  };