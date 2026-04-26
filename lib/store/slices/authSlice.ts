/**
 * Auth Slice
 * 
 * Manages authentication state in Redux store.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_superuser: boolean;
    must_change_password?: boolean;
    permissions?: string[];
    role?: { id: string; name: string; is_superuser_role?: boolean } | null;
}

export function hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;
    if (user.is_superuser) return true;
    if (user.role?.is_superuser_role) return true;
    return user.permissions?.includes(permission) ?? false;
}

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state) => {
            state.isAuthenticated = true;
            state.isLoading = false;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.isLoading = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.isLoading = false;
            state.user = null;
        },
        resetAuth: () => initialState,
    },
});

export const { setAuth, setUser, setLoading, logout, resetAuth } = authSlice.actions;
export default authSlice.reducer;
