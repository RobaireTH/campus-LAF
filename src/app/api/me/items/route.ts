import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/require-user";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireUser(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  try {
    const items = await prisma.item.findMany({
      where: { posterId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        eventDate: true,
        createdAt: true,
        _count: { select: { claims: true } },
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        claimCount: item._count.claims,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch your items", error);
    return NextResponse.json(
      { error: "Failed to fetch your items" },
      { status: 500 },
    );
  }
}