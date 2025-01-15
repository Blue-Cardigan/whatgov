import { ThisWeek } from '@/components/ThisWeek';
import { SimpleFooter } from '@/components/layout/SimpleFooter';

export const metadata = {
  title: 'WhatGov | Direct Access to Parliament',
  description: 'Parliament, without the Spin',
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <ThisWeek />
      </main>
      <SimpleFooter />
    </div>
  );
}