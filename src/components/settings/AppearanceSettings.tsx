'use client';

import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!theme) {
      setTheme('system');
    }
  }, [theme, setTheme]);

  const themes = [
    {
      value: 'system',
      label: 'System',
      icon: Monitor
    },
    {
      value: 'light',
      label: 'Light',
      icon: Sun
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon
    }
  ];

  // Show loading state until mounted
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            customise how WhatGov looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-md" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          customise how WhatGov looks on your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Theme</Label>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-3 gap-4"
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={value}
                className={`
                  flex flex-col items-center justify-between rounded-md border-2 border-muted 
                  bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer
                  ${theme === value ? 'border-primary' : ''}
                `}
              >
                <RadioGroupItem value={value} id={value} className="sr-only" />
                <Icon className="mb-2 h-6 w-6" />
                <span>{label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Preview</Label>
              <CardDescription>
                See how your theme choice looks
              </CardDescription>
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="space-y-2">
              <div className="bg-primary text-primary-foreground p-2 rounded">
                Primary
              </div>
              <div className="bg-secondary text-secondary-foreground p-2 rounded">
                Secondary
              </div>
              <div className="bg-destructive text-destructive-foreground p-2 rounded">
                Destructive
              </div>
              <div className="bg-muted text-muted-foreground p-2 rounded">
                Muted
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 