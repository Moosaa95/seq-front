'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { hasPermission } from '@/lib/store/slices/authSlice';

// Map each protected route prefix to the permission required to access it
const ROUTE_PERMISSIONS: Record<string, string> = {
    '/admin/properties': 'property:read',
    '/admin/bookings': 'booking:read',
    '/admin/transactions': 'payment:read',
    '/admin/inquiries': 'inquiry:read',
    '/admin/customers': 'user:read',
    '/admin/inventory': 'inventory:read',
    '/admin/disputes': 'booking:read',
    '/admin/users': 'user:read',
    '/admin/roles': 'role:read',
    '/admin/activity-logs': 'logs:read',
};

function getRequiredPermission(pathname: string): string | null {
    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route)) return perm;
    }
    return null;
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/admin/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    // Check page-level permission
    const requiredPermission = getRequiredPermission(pathname);
    if (requiredPermission && !hasPermission(user, requiredPermission)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md mx-auto px-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500 mb-4">
                        You don&apos;t have permission to view this page. Contact your administrator if you believe this is an error.
                    </p>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
