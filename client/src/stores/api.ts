import type {
  InfoResponse,
  PagedResponseUserInfo,
  UserTokenCreateBody,
  UserTokenInfo,
  UserInfo,
} from '@/types/oxibooru.gen';
import { defineStore } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import z from 'zod';

const userTokenData = z.object({
  user: z.string(),
  token: z.string(),
});

const textEnc = new TextEncoder();
export type UserTokenData = z.infer<typeof userTokenData>;

export const allRanks = [
  'anonymous',
  'restricted',
  'regular',
  'power',
  'moderator',
  'administrator',
  'nobody',
];

export const rankNames = new Map([
  ['anonymous', 'Anonymous'],
  ['restricted', 'Restricted user'],
  ['regular', 'Regular user'],
  ['power', 'Power user'],
  ['moderator', 'Moderator'],
  ['administrator', 'Administrator'],
  ['nobody', 'Nobody'],
]);

interface OkResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  code: number;
  statusCode: number;
  title: string;
  description: string;
}

type ApiResponse<T> = OkResponse<T> | ErrorResponse;

async function doFetch<T>(urlPath: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const newUrl = new URL(urlPath, baseUrl);

  const response = await fetch(newUrl, { ...options });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    return {
      success: false,
      code: errorJson?.name || 'UnknownError',
      statusCode: response.status,
      title: errorJson?.message || 'An error occurred',
      description: errorJson?.description || '',
    };
  }

  const data = await response.json();
  return { success: true, data };
}

function encodeBasicAuth(user: string, password: string) {
  const data = textEnc.encode(`${user}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...data))}`;
}

function setCookieAuth(user: string, token: string) {
  const value = encodeURIComponent(JSON.stringify({ user, token }));
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `auth=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function clearCookieAuth() {
  document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

export const useTokenStore = defineStore('api', () => {
  const userToken = ref<UserTokenData | null>(null);
  const user = ref<PagedResponseUserInfo['results'][0] | null>(null);
  const config = ref<InfoResponse>();
  const ready = ref(false);

  const authToken = computed(() => {
    if (userToken.value) {
      const data = textEnc.encode(`${userToken.value.user}:${userToken.value.token}`);
      return `Token ${btoa(String.fromCharCode(...data))}`;
    }
    return null;
  });

  // On app start, check if the user is already logged in
  onMounted(async () => {
    const userCookie = document.cookie.split('; ').find((row) => row.startsWith('auth='));
    if (userCookie) {
      const splitCookie = userCookie.split('=');
      if (splitCookie.length >= 2) {
        try {
          const cookieValue = splitCookie.slice(1).join('=');
          const userData = JSON.parse(decodeURIComponent(cookieValue));
          const parsedData = userTokenData.parse(userData);
          userToken.value = parsedData;
        } catch (e) {
          console.error('Failed to parse user cookie:', e);
        }
      }
    }

    await refreshInfo();

    if (userToken.value) {
      const userResp = await doFetch<UserInfo>(
        `/api/user/${userToken.value.user}?bump-login=true`,
        {
          method: 'GET',
          headers: { Authorization: authToken.value! },
        },
      );

      if (userResp.success) {
        user.value = userResp.data;
      } else {
        console.error('Failed to fetch user data:', userResp);
        userToken.value = null;
        clearCookieAuth();
      }
    }

    ready.value = true;
  });

  const refreshInfo = async () => {
    const infoResp = await doFetch<InfoResponse>('/api/info');
    if (infoResp.success) {
      config.value = infoResp.data;
    }
  };

  const hasPrivilege = (privilege: string) => {
    let minViable: number | null = null;
    for (const [priv, minRank] of Object.entries(config.value?.config.privileges || {})) {
      if (!priv.startsWith(privilege)) continue;
      const rankIndex = allRanks.indexOf(minRank);
      if (minViable === null || rankIndex < minViable) {
        minViable = rankIndex;
      }
    }
    if (minViable === null) return false;
    const myRank = user.value?.rank ? allRanks.indexOf(user.value.rank) : 0;
    return myRank >= minViable;
  };

  // ── Auth actions ───────────────────────────────────────────────────

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const body: UserTokenCreateBody = { note: 'Login from browser', enabled: true };
    const resp = await doFetch<UserTokenInfo>(`/api/user-token/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: encodeBasicAuth(username, password),
      },
      body: JSON.stringify(body),
    });

    if (!resp.success) {
      return { success: false, description: resp.description || resp.title };
    }

    const token = resp.data.token;
    if (!token) return { success: false, description: 'Server returned no token.' };

    userToken.value = { user: username, token };
    setCookieAuth(username, token);

    const userResp = await doFetch<UserInfo>(`/api/user/${encodeURIComponent(username)}`, {
      headers: { Authorization: authToken.value! },
    });
    if (userResp.success) user.value = userResp.data;

    await refreshInfo();
    return { success: true };
  };

  const logout = async () => {
    if (!userToken.value || !authToken.value) {
      user.value = null;
      userToken.value = null;
      clearCookieAuth();
      return;
    }
    await doFetch(
      `/api/user-token/${encodeURIComponent(userToken.value.user)}/${encodeURIComponent(userToken.value.token)}`,
      { method: 'DELETE', headers: { Authorization: authToken.value } },
    );
    user.value = null;
    userToken.value = null;
    clearCookieAuth();
    await refreshInfo();
  };

  const register = async (
    username: string,
    password: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch<UserInfo>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: username, password }),
    });
    if (!resp.success) {
      return { success: false, description: resp.description || resp.title };
    }
    return login(username, password);
  };

  const requestPasswordReset = async (
    identifier: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/password-reset/${encodeURIComponent(identifier)}`);
    if (!resp.success) {
      return { success: false, description: (resp as ErrorResponse).description || (resp as ErrorResponse).title };
    }
    return { success: true };
  };

  const confirmPasswordReset = async (
    identifier: string,
    token: string,
    newPassword: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/password-reset/${encodeURIComponent(identifier)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPassword }),
    });
    if (!resp.success) {
      return { success: false, description: (resp as ErrorResponse).description || (resp as ErrorResponse).title };
    }
    return { success: true };
  };

  return {
    userToken,
    authToken,
    user,
    config,
    ready,
    refreshInfo,
    hasPrivilege,
    doFetch,
    login,
    logout,
    register,
    requestPasswordReset,
    confirmPasswordReset,
  };
});

// Re-export the error response type for consumers
export type { ErrorResponse };
