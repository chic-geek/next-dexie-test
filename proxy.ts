import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/sign-in", "/sign-up", "/api/auth"];

export function proxy(request: NextRequest) {
  const isPublic = PUBLIC.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );
  if (isPublic) return NextResponse.next();

  const session = getSessionCookie(request);
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
