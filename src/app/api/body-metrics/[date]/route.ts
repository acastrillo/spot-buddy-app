import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBBodyMetrics } from "@/lib/dynamodb";

// GET /api/body-metrics/[date] - Get body metrics for a specific date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { date } = await params;

    const metric = await dynamoDBBodyMetrics.get(userId, date);

    if (!metric) {
      return NextResponse.json(
        { error: "Body metric not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error("Error fetching body metric:", error);
    return NextResponse.json(
      { error: "Failed to fetch body metric" },
      { status: 500 }
    );
  }
}

// PATCH /api/body-metrics/[date] - Update body metrics for a specific date
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { date } = await params;
    const body = await request.json();

    // Check if metric exists
    const existingMetric = await dynamoDBBodyMetrics.get(userId, date);
    if (!existingMetric) {
      return NextResponse.json(
        { error: "Body metric not found" },
        { status: 404 }
      );
    }

    // Update the metric (upsert will update existing)
    const metric = await dynamoDBBodyMetrics.upsert(userId, {
      date,
      weight: body.weight ?? existingMetric.weight,
      bodyFatPercentage: body.bodyFatPercentage ?? existingMetric.bodyFatPercentage,
      muscleMass: body.muscleMass ?? existingMetric.muscleMass,
      chest: body.chest ?? existingMetric.chest,
      waist: body.waist ?? existingMetric.waist,
      hips: body.hips ?? existingMetric.hips,
      thighs: body.thighs ?? existingMetric.thighs,
      arms: body.arms ?? existingMetric.arms,
      calves: body.calves ?? existingMetric.calves,
      shoulders: body.shoulders ?? existingMetric.shoulders,
      neck: body.neck ?? existingMetric.neck,
      unit: body.unit ?? existingMetric.unit,
      notes: body.notes ?? existingMetric.notes,
      photoUrls: body.photoUrls ?? existingMetric.photoUrls,
      createdAt: existingMetric.createdAt, // Preserve original creation time
    });

    return NextResponse.json({ metric });
  } catch (error) {
    console.error("Error updating body metric:", error);
    return NextResponse.json(
      { error: "Failed to update body metric" },
      { status: 500 }
    );
  }
}

// DELETE /api/body-metrics/[date] - Delete body metrics for a specific date
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { date } = await params;

    // Check if metric exists
    const existingMetric = await dynamoDBBodyMetrics.get(userId, date);
    if (!existingMetric) {
      return NextResponse.json(
        { error: "Body metric not found" },
        { status: 404 }
      );
    }

    await dynamoDBBodyMetrics.delete(userId, date);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting body metric:", error);
    return NextResponse.json(
      { error: "Failed to delete body metric" },
      { status: 500 }
    );
  }
}
