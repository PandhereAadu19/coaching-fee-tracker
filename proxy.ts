import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session-token";
import { decideAccess, homeFor } from "./lib/roles";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const decision = decideAccess(session?.role ?? null, pathname);
  const isApi = pathname.startsWith("/api/");

  if (decision === "login") {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (decision === "forbidden") {
    if (isApi) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    return NextResponse.redirect(new URL(homeFor(session!.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};