import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN = '/admin/login';

// We check for either:
//  - "access_token"  – set by Django when frontend and API share the same domain
//  - "admin_session" – a plain indicator cookie set by the Next.js login page itself,
//                      needed when the API lives on a different domain/origin
function isAuthenticated(request: NextRequest): boolean {
    return !!(
        request.cookies.get('access_token')?.value ||
        request.cookies.get('admin_session')?.value
    );
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN) {
        if (!isAuthenticated(request)) {
            const loginUrl = new URL(ADMIN_LOGIN, request.url);
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect authenticated users away from the login page
    if (pathname === ADMIN_LOGIN && isAuthenticated(request)) {
        return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
