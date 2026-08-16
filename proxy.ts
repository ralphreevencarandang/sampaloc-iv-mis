import { NextResponse, type NextRequest } from "next/server";
import type { AdminRole } from "@/app/generated/prisma/enums";
import {
  canAccessResource,
  getDefaultAdminRoute,
  getResourceForAdminPath,
  isBarangayAdminRole,
} from "@/lib/rbac";

const SESSION_COOKIE_NAME = "admin_session";

type SessionPayload = {
  adminId?: string;
  exp?: number;
  role?: AdminRole;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-only-admin-session-secret";
  }

  return "";
}

function base64UrlToString(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signValue(value: string) {
  const secret = getSessionSecret();

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

async function decodeAdminSession(token: string): Promise<SessionPayload | null> {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload);

  if (!expectedSignature || expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToString(encodedPayload)) as SessionPayload;

    if (!payload.adminId || !payload.exp || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const resource = getResourceForAdminPath(pathname);

  if (!resource) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await decodeAdminSession(token) : null;

  if (!payload?.adminId) {
    return NextResponse.redirect(new URL("/AdminLogin", request.url));
  }

  if (payload.role && isBarangayAdminRole(payload.role)) {
    if (!canAccessResource(payload.role, resource)) {
      const defaultRoute = getDefaultAdminRoute(payload.role);
      if (pathname === defaultRoute || pathname === `${defaultRoute}/` || defaultRoute === "/AdminLogin") {
        return NextResponse.redirect(new URL("/AdminLogin", request.url));
      }
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
