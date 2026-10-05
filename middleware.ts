import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite /@slug to /team/slug for individual profile pages
  if (pathname.startsWith("/@")) {
    const slug = pathname.slice(2);
    if (slug && !slug.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/team/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Forward the current pathname via a request header so that
  // server components (e.g. dashboard layout) can read it without
  // needing access to the request object directly.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
