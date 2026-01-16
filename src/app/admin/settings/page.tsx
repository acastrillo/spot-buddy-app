import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { AdminSettingsClient } from '@/components/admin/admin-settings-client';

export const metadata = {
  title: 'Admin Settings | Admin',
  description: 'Manage global system settings',
};

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect('/auth/login?callbackUrl=/admin/settings');
  }

  const user = await dynamoDBUsers.get(userId);
  if (!user || !hasPermission(user, 'admin:manage-settings')) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need settings permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
        <p className="text-gray-600">Manage global flags and system configuration.</p>
      </div>

      <AdminSettingsClient />
    </div>
  );
}
