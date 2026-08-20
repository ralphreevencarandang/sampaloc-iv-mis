import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/admin-authorization";
import { getCurrentResidentFromSession } from "@/lib/resident-session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const residentSelectFields = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  middleName: true,
  birthDate: true,
  gender: true,
  civilStatus: true,
  street: true,
  houseNumber: true,
  subdivision: true,
  phase: true,
  contactNumber: true,
  occupation: true,
  citizenship: true,
  isVoter: true,
  precinctNumber: true,
  is4Ps: true,
  isPwd: true,
  pwdCondition: true,
  isArchived: true,
  validIDImage: true,
  image: true,
  status: true,
  createdAt: true,
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const currentResident = await getCurrentResidentFromSession();
    const isAdmin = await hasAdminPermission("residents", "read");

    if (!isAdmin && currentResident?.id !== id) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const resident = await prisma.resident.findUnique({
      where: { id },
      select: residentSelectFields,
    });

    if (!resident) {
      return NextResponse.json(
        { message: "Resident not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(resident);
  } catch (error) {
    console.error("Failed to fetch resident:", error);

    return NextResponse.json(
      { message: "Failed to fetch resident." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const currentResident = await getCurrentResidentFromSession();
    const isAdmin = await hasAdminPermission("residents", "write");

    if (!isAdmin && currentResident?.id !== id) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { image, profilePicture } = body as { image?: string; profilePicture?: string };
    const imageUrl = image ?? profilePicture;

    if (imageUrl === undefined) {
      return NextResponse.json(
        { message: "No valid update fields provided." },
        { status: 400 }
      );
    }

    const updatedResident = await prisma.resident.update({
      where: { id },
      data: {
        image: imageUrl,
      },
      select: residentSelectFields,
    });

    return NextResponse.json(updatedResident);
  } catch (error) {
    console.error("Failed to update resident:", error);

    return NextResponse.json(
      { message: "Failed to update resident profile." },
      { status: 500 }
    );
  }
}
