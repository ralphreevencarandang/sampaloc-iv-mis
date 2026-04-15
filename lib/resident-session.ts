import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AuthenticatedResident } from "@/lib/resident-auth";
import prismaModule from "@/lib/prisma";

const SESSION_COOKIE_NAME = "resident_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const prisma = (prismaModule as { default?: typeof prismaModule }).default ?? prismaModule;

type SessionPayload = {
  residentId: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-only-resident-session-secret";
  }

  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET or SESSION_SECRET must be configured.");
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const providedSignature = Buffer.from(signature, "utf8");
  const computedSignature = Buffer.from(expectedSignature, "utf8");

  if (
    providedSignature.length !== computedSignature.length ||
    !timingSafeEqual(providedSignature, computedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.residentId || typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createResidentSession(residentId: string) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession({ residentId, exp: expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearResidentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentResidentFromSession(): Promise<AuthenticatedResident | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeSession(token);

  if (!payload) {
    return null;
  }

  const resident = await prisma.resident.findUnique({
    where: { id: payload.residentId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (!resident || resident.status !== "APPROVED") {
    return null;
  }

  return {
    id: resident.id,
    email: resident.email,
    firstName: resident.firstName,
    lastName: resident.lastName,
    status: resident.status,
  };
}
