'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    newDebates: true,
    replies: true,
    mentions: true,
    newsletter: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Implement notification settings update logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({
        title: "Settings updated",
        description: "Your notification preferences have been saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose what notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="new-debates">New Debates</Label>
            <Switch
              id="new-debates"
              checked={settings.newDebates}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, newDebates: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="replies">Replies to your comments</Label>
            <Switch
              id="replies"
              checked={settings.replies}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, replies: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="mentions">Mentions</Label>
            <Switch
              id="mentions"
              checked={settings.mentions}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, mentions: checked })
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="newsletter">Weekly Newsletter</Label>
            <Switch
              id="newsletter"
              checked={settings.newsletter}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, newsletter: checked })
              }
            />
          </div>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 