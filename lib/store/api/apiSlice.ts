/**
 * Base API Slice with Token Refresh
 * 
 * Uses mutex pattern to prevent race conditions during token refresh.
 * Handles CSRF token and HttpOnly cookie authentication.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
    BaseQueryFn,
    FetchArgs,
    FetchBaseQueryError
} from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";
import { setAuth, logout } from "../slices/authSlice";

/** Must match Django `config.urls` — API lives under `path("api/", ...)`. If the env is only the host, append `/api`. */
export function getPublicApiBaseUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").trim().replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
}

// Get CSRF token from cookie
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
    baseUrl: getPublicApiBaseUrl(),
    credentials: 'include', // Include cookies in requests
    prepareHeaders: (headers) => {
        // Add CSRF token for non-GET requests
        const csrftoken = getCookie('csrftoken');
        if (csrftoken) {
            headers.set('X-CSRFToken', csrftoken);
        }
        return headers;
    },
});

// Auth endpoints that must never trigger the refresh-and-retry flow
const AUTH_ENDPOINTS = [
    '/account/jwt/create/',
    '/account/jwt/signup/',
    '/account/jwt/refresh/',
    '/account/logout/',
];

function isAuthEndpoint(args: string | FetchArgs): boolean {
    const url = typeof args === 'string' ? args : args.url ?? '';
    return AUTH_ENDPOINTS.some((ep) => url.includes(ep));
}

const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // Wait for any ongoing refresh to complete
    await mutex.waitForUnlock();

    let result = await baseQuery(args, api, extraOptions);

    // Never attempt token refresh for auth endpoints — wrong password should
    // just surface the 401 directly to the caller.
    if (isAuthEndpoint(args)) {
        return result;
    }

    // If we get a 401 on a regular API call, try to refresh the token
    if (result.error && result.error.status === 401) {
        if (!mutex.isLocked()) {
            const release = await mutex.acquire();

            try {
                // Try to refresh the token
                const refreshResult = await baseQuery(
                    {
                        url: '/account/jwt/refresh/',
                        method: 'POST',
                    },
                    api,
                    extraOptions
                );

                if (refreshResult.data) {
                    // Refresh successful, update auth state
                    api.dispatch(setAuth());

                    // Retry the original request
                    result = await baseQuery(args, api, extraOptions);
                } else {
                    // Refresh failed, logout user
                    api.dispatch(logout());
                }
            } finally {
                release();
            }
        } else {
            // Another refresh is in progress, wait and retry
            await mutex.waitForUnlock();
            result = await baseQuery(args, api, extraOptions);
        }
    }

    return result;
};

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'User',
        'Auth',
        'Booking',
        'Payment',
        'Property',
        'ContactInquiry',
        'PropertyInquiry',
        'ExternalCalendar',
        'Location',
        'InventoryItem',
        'LocationInventory',
        'PropertyInventory',
        'ApartmentInventory',
        'InventoryMovement',
        'Dispute',
        'Role',
        'ActivityLog',
        'Apartment',
    ],
    endpoints: () => ({}),
});

export default apiSlice;
