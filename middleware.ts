import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN = '/admin/login';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only guard /admin routes (except the login page itself)
    if (pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN) {
        const token = request.cookies.get('access_token')?.value;

        if (!token) {
            const loginUrl = new URL(ADMIN_LOGIN, request.url);
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect authenticated users away from the login page
    if (pathname === ADMIN_LOGIN) {
        const token = request.cookies.get('access_token')?.value;
        if (token) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
