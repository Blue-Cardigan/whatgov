'use client';

import { ProfileSettings } from './ProfileSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { NotificationSettings } from './NotificationSettings';
import BillingPage from './BillingPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Palette, Bell, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function SettingsContainer() {
  const { user, subscription } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList>
          <TabsTrigger 
            value="profile" 
            className={cn(
              "flex items-center gap-2",
              !user && "opacity-50 cursor-not-allowed"
            )}
            disabled={!user}
          >
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className={cn(
              "flex items-center gap-2",
              !user && "opacity-50 cursor-not-allowed"
            )}
            disabled={!user}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {subscription?.stripe_customer_id && (
            <TabsTrigger 
              value="billing" 
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        {user && (
          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
        )}
        
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        
        {user && (
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        )}
        
        {subscription?.stripe_customer_id && (
          <TabsContent value="billing">
            <BillingPage />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 