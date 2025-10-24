import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { dynamoDBBodyMetrics } from "@/lib/dynamodb";

// GET /api/body-metrics/latest - Get the most recent body metric entry
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) return auth.error;
    const { userId } = auth;
    const metric = await dynamoDBBodyMetrics.getLatest(userId);

    if (!metric) {
      return NextResponse.json(
        { error: "No body metrics found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error("Error fetching latest body metric:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest body metric" },
      { status: 500 }
    );
  }
}
