import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { dynamoDBBodyMetrics } from "@/lib/dynamodb";

// GET /api/body-metrics/latest - Get the most recent body metric entry
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
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
