import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminFromSession } from "@/lib/admin-session";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const maxBytes = 5 * 1024 * 1024;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdminFromSession();
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "CLERK")) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403, headers: privateHeaders });
  }
  try {
    const { id } = await params;
    const resident = await prisma.resident.findUnique({
      where: { id }, select: { validIDImage: true, idType: true, otherIdType: true, idNumber: true },
    });
    if (!resident) return NextResponse.json({ message: "Resident not found." }, { status: 404, headers: privateHeaders });
    if (new URL(request.url).searchParams.get("image") !== "1") {
      return NextResponse.json({
        idType: resident.idType === "Other" ? resident.otherIdType || "Other" : resident.idType,
        idNumber: resident.idNumber,
        imageUrl: resident.validIDImage ? "/api/residents/" + encodeURIComponent(id) + "/valid-id?image=1" : null,
      }, { headers: privateHeaders });
    }
    if (!resident.validIDImage) return NextResponse.json({ message: "No valid ID uploaded." }, { status: 404, headers: privateHeaders });
    // Only fetch images from this application's configured Cloudinary account.
    const url = new URL(resident.validIDImage);
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || url.port || url.username || url.password ||
      !url.pathname.startsWith("/" + cloud + "/image/upload/")) throw Error("Unavailable image");
    const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !response.body || !type || !["image/jpeg", "image/png", "image/webp"].includes(type)) throw Error("Unavailable image");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw Error("Unavailable image");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    if (!size) throw Error("Unavailable image");
    return new Response(Buffer.concat(chunks), { headers: { ...privateHeaders, "Content-Type": type, "Content-Disposition": "inline" } });
  } catch {
    return NextResponse.json({ message: "Unable to load the resident ID. Please try again." }, { status: 502, headers: privateHeaders });
  }
}
