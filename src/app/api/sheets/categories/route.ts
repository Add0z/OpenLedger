import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getCategories, addCategory } from "@/lib/sheets/categories";
import { logAuditEvent } from "@/lib/sheets/audit";
import { validateCategory } from "@/lib/domain/validation";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId is required" }, { status: 400 });
  }

  try {
    const categories = await getCategories(session.accessToken, spreadsheetId);
    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = req.nextUrl.searchParams.get("spreadsheetId");
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    validateCategory(body);

    const category = {
      id: uuidv4(),
      name: body.name,
      parent: body.parent ?? "",
      type: body.type,
    };

    await addCategory(session.accessToken, spreadsheetId, category);
    await logAuditEvent(
      session.accessToken,
      spreadsheetId,
      "CREATE",
      "Category",
      category.id,
      session.user?.email ?? "unknown"
    );

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
