import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBBodyMetrics } from "@/lib/dynamodb";

// GET /api/body-metrics - List all body metrics for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Validate and bound the limit parameter
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 1000)
      : 100;

    let metrics;

    if (startDate && endDate) {
      // Query by date range
      metrics = await dynamoDBBodyMetrics.getByDateRange(userId, startDate, endDate);
    } else {
      // Get all metrics (with bounded limit)
      metrics = await dynamoDBBodyMetrics.list(userId, limit);
    }

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error fetching body metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch body metrics" },
      { status: 500 }
    );
  }
}

// POST /api/body-metrics - Create a new body metric entry
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;
    const body = await request.json();

    // Validate required fields
    if (!body.date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Create the metric
    const metric = await dynamoDBBodyMetrics.upsert(userId, {
      date: body.date,
      weight: body.weight ?? null,
      bodyFatPercentage: body.bodyFatPercentage ?? null,
      muscleMass: body.muscleMass ?? null,
      chest: body.chest ?? null,
      waist: body.waist ?? null,
      hips: body.hips ?? null,
      thighs: body.thighs ?? null,
      arms: body.arms ?? null,
      calves: body.calves ?? null,
      shoulders: body.shoulders ?? null,
      neck: body.neck ?? null,
      unit: body.unit || "metric",
      notes: body.notes ?? null,
      photoUrls: body.photoUrls || [],
    });

    return NextResponse.json({ metric }, { status: 201 });
  } catch (error) {
    console.error("Error creating body metric:", error);
    return NextResponse.json(
      { error: "Failed to create body metric" },
      { status: 500 }
    );
  }
}
