import { Suspense } from 'react';
import ProfileDetailView from '@/app/components/ProfileDetailView';
import LoadingSpinner from '@/app/components/LoadingSpinner';

// This is a mock function - replace with your actual data fetching logic
async function getProfileData(id: string) {
  // Fetch profile data based on ID
  return {
    id,
    name: 'Example Profile',
    opportunities: [
      {
        id: '1',
        primaryColumn: 'Primary Data 1',
        additionalColumn: 'Additional Data 1',
      },
      {
        id: '2',
        primaryColumn: 'Primary Data 2',
        additionalColumn: 'Additional Data 2',
      },
      // More opportunities...
    ],
  };
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const profileData = await getProfileData(params.id);
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileDetailView profile={profileData} />
    </Suspense>
  );
} 