'use client';

import { AppearanceSettings } from './AppearanceSettings';
import BillingPage from './BillingPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function SettingsContainer() {
  const { subscription } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          {subscription?.stripe_customer_id && (
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        
        {subscription?.stripe_customer_id && (
          <TabsContent value="billing">
            <BillingPage />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 