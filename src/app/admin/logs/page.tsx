import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { AdminLogsClient } from '@/components/admin/admin-logs-client';

export const metadata = {
  title: 'System Logs | Admin',
  description: 'View application, audit, and AI usage logs',
};

export default async function AdminLogsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect('/auth/login?callbackUrl=/admin/logs');
  }

  const user = await dynamoDBUsers.get(userId);
  if (!user || !hasPermission(user, 'admin:view-logs')) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You need log viewing permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Logs</h1>
        <p className="text-gray-600">
          Review application logs, audit activity, and AI usage metrics.
        </p>
      </div>

      <AdminLogsClient />
    </div>
  );
}
