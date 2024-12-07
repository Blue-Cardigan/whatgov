import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SimpleFooter } from '@/components/layout/SimpleFooter';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <ProfileSettings />
      </div>
      <SimpleFooter />
    </div>
  );
} 