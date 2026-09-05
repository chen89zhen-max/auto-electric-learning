'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { UserProgressData } from './userProgressStore';
import {
  saveUserProgress,
  createDefaultUserProgress,
  setProgressServerSyncEnabled,
} from './userProgressStore';

export interface UserProfile {
  username: string;
  realName: string;
  className: string;
  role: 'student' | 'teacher' | 'admin';
  mustChangePassword?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: UserProfile;
  progress?: UserProgressData;
}

const AUTH_STORAGE_KEY = 'NEV_AUTH_CURRENT_USER_V1';
const AUTH_CHANGE_EVENT = 'NEV_AUTH_STATE_CHANGED';

let cachedUser: UserProfile | null = null;
let authStatus: 'loading' | 'authenticated' | 'anonymous' = 'loading';
let authVersion = 0;
let restorePromise: Promise<UserProfile | null> | null = null;

function emitAuthChange(): void {
  authVersion += 1;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function getCurrentUser(): UserProfile | null {
  return cachedUser;
}

export function setCurrentUser(user: UserProfile | null): void {
  cachedUser = user;
  authStatus = user ? 'authenticated' : 'anonymous';
  setProgressServerSyncEnabled(user?.role === 'student');

  if (typeof localStorage !== 'undefined') {
    // Remove the legacy trusted identity snapshot. Server session is the source of truth.
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  emitAuthChange();
}

export async function loginUser(
  username: string,
  pass: string,
  expectedRole: UserProfile['role']
): Promise<{ success: boolean; error?: string; user?: UserProfile; progress?: UserProgressData }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, expectedRole }),
    });

    const data = (await res.json()) as AuthResponse;
    if (!res.ok || !data.success || !data.user) {
      return { success: false, error: data.error || '登录失败，请检查账号密码' };
    }

    const user: UserProfile = data.user;
    setCurrentUser(user);

    if (data.progress) {
      saveUserProgress(data.progress, { sync: false });
    }

    return { success: true, user, progress: data.progress };
  } catch (err) {
    console.error('Login network error:', err);
    return { success: false, error: '网络连接异常，请重试' };
  }
}

export async function registerUser(
  username: string,
  pass: string,
  realName: string,
  className: string
): Promise<{ success: boolean; error?: string; user?: UserProfile; progress?: UserProgressData }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        username,
        password: pass,
        realName,
        className,
      }),
    });

    const data = (await res.json()) as AuthResponse;
    if (!res.ok || !data.success || !data.user) {
      return { success: false, error: data.error || '注册失败' };
    }

    const user: UserProfile = data.user;
    setCurrentUser(user);

    if (data.progress) {
      saveUserProgress(data.progress, { sync: false });
    }

    return { success: true, user, progress: data.progress };
  } catch (err) {
    console.error('Register network error:', err);
    return { success: false, error: '网络连接异常，请重试' };
  }
}

export async function logoutUser(): Promise<{ success: boolean; error?: string }> {
  let serverLogoutSucceeded = false;
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    serverLogoutSucceeded = response.ok;
  } catch (err) {
    console.error('Logout network error:', err);
  } finally {
    setCurrentUser(null);
    saveUserProgress(createDefaultUserProgress(), { sync: false });
    restorePromise = null;
  }

  return serverLogoutSucceeded
    ? { success: true }
    : { success: false, error: '本地已退出，但服务器会话注销失败；重新进入时将再次核验会话' };
}

export async function restoreSession(force = false): Promise<UserProfile | null> {
  if (restorePromise && !force) return restorePromise;

  authStatus = 'loading';
  emitAuthChange();

  restorePromise = (async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) {
        setCurrentUser(null);
        return null;
      }

      const data = (await response.json()) as AuthResponse;
      if (!data.success || !data.user) {
        setCurrentUser(null);
        return null;
      }

      setCurrentUser(data.user);
      if (data.user.role === 'student' && data.progress) {
        saveUserProgress(data.progress, { sync: false });
      }
      return data.user;
    } catch (err) {
      console.error('Session restore error:', err);
      setCurrentUser(null);
      return null;
    }
  })();

  return restorePromise;
}

export function getStudentDisplayName(fallback = '见习学员'): string {
  const user = getCurrentUser();
  if (!user || !user.realName) return fallback;
  return user.realName;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useAuth(): AuthState {
  useSyncExternalStore(
    subscribe,
    () => authVersion,
    () => 0
  );

  useEffect(() => {
    void restoreSession();
  }, []);

  const user = getCurrentUser();

  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading: authStatus === 'loading',
  };
}
