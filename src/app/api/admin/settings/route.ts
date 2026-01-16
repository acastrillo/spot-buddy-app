import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';
import { getSystemSettings, setGlobalBetaMode } from '@/lib/system-settings';

export const runtime = 'nodejs';

interface UpdateSettingsRequest {
  setting: 'globalBetaMode';
  value: boolean;
}

export async function GET() {
  try {
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: adminUserId } = auth;
    const adminUser = await dynamoDBUsers.get(adminUserId);
    if (!adminUser || !hasPermission(adminUser, 'admin:manage-settings')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const settings = await getSystemSettings();

    return NextResponse.json({
      success: true,
      data: {
        globalBetaMode: settings.globalBetaMode,
        updatedAt: settings.updatedAt ?? null,
        updatedBy: settings.updatedBy ?? null,
      },
    });
  } catch (error) {
    console.error('[Admin] Get settings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: adminUserId } = auth;
    const adminUser = await dynamoDBUsers.get(adminUserId);
    if (!adminUser || !hasPermission(adminUser, 'admin:manage-settings')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    let body: UpdateSettingsRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body?.setting !== 'globalBetaMode' || typeof body.value !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid setting payload' },
        { status: 400 }
      );
    }

    const updated = await setGlobalBetaMode({
      value: body.value,
      updatedBy: adminUserId,
      description: 'Global beta mode toggle',
    });

    await writeAuditLog({
      action: 'admin.toggle-global-beta',
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        globalBetaMode: updated.globalBetaMode,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        globalBetaMode: updated.globalBetaMode,
        updatedAt: updated.updatedAt ?? null,
        updatedBy: updated.updatedBy ?? null,
      },
    });
  } catch (error) {
    console.error('[Admin] Update settings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
