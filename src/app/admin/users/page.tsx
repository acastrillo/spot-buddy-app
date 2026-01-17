import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasRole } from '@/lib/rbac';
import { AdminUsersClient } from '@/components/admin/admin-users-client';

export const metadata = {
  title: 'User Management | Admin',
  description: 'View and manage registered users',
};

export default async function AdminUsersPage() {
  // 1. Authentication check
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect('/auth/login?callbackUrl=/admin/users');
  }

  // 2. Authorization check - verify admin role
  const user = await dynamoDBUsers.get(userId);
  if (!user || !hasRole(user, 'admin')) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-text-secondary">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  // 3. Render client component that will fetch data
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">User Management</h1>
        <p className="text-text-secondary">
          View and manage all registered users
        </p>
      </div>

      <AdminUsersClient />
    </div>
  );
}
