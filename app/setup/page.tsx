'use client';

import { useRouter } from 'next/navigation';
import SetupForm from '../../components/SetupForm';
import { getSettings } from '../../lib/storage';
import { UserSettings } from '../../lib/types';

export default function SetupPage() {
  const router = useRouter();
  const existing = getSettings();

  function handleComplete(_settings: UserSettings) {
    router.push('/');
  }

  return <SetupForm existing={existing} onComplete={handleComplete} />;
}
