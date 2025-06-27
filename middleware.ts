import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "./src/services/jwt.service";

export async function middleware(request: NextRequest) {
  // The JWT verification only applies to the dashboard route
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      await jwtVerify(token);
      return NextResponse.next();
    } catch (error) {
      console.error("Middleware JWT verification failed:", error);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
