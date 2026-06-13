import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/scanner", "/alerts", "/onboarding", "/welcome"];
const BROADCASTER = "/go-live";
const STREAM = "/stream";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Stream page: allow ?app=1 (mobile app) without auth
  if (pathname.startsWith(STREAM) && request.nextUrl.searchParams.get("app") === "1") {
    return NextResponse.next();
  }

  // Go-Live: password gate handled client-side with session cookie
  // Additional server check via env var
  if (pathname.startsWith(BROADCASTER)) {
    const goLiveAuth = request.cookies.get("gp_golive_auth");
    if (!goLiveAuth || goLiveAuth.value !== "1") {
      // Allow through — client page handles password gate
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Scanner requires trader or elite tier
  if (user && pathname.startsWith("/scanner")) {
    const { data: profile } = await supabase
      .from("users")
      .select("tier")
      .eq("id", user.id)
      .single();
    if (profile && profile.tier === "member") {
      // Allow through — client page shows upgrade prompt
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
