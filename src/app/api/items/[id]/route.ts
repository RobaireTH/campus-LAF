import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalUser } from "@/lib/require-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOptionalUser(request);

  try {
    const item = await prisma.item.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        locationNote: true,
        status: true,
        eventDate: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        media: {
          orderBy: { position: "asc" },
          select: { key: true, type: true, position: true },
        },
        posterId: true,
        poster: { select: { name: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let hasClaimed = false;
    if (user) {
      const existingClaim = await prisma.claim.findFirst({
        where: { itemId: id, claimantId: user.id },
        select: { id: true },
      });
      hasClaimed = Boolean(existingClaim);
    }

    const { posterId, poster, ...rest } = item;

    return NextResponse.json({
      item: {
        ...rest,
        posterName: poster.name ?? "Anonymous",
        isOwner: user ? user.id === posterId : false,
        hasClaimed,
      },
    });
  } catch (error) {
    console.error("Failed to fetch item", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 },
    );
  }
}