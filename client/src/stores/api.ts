import type { InfoResponse, PagedResponseUserInfo } from '@/types/oxibooru.gen';
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

  const response = await fetch(newUrl, {
    ...options,
  });

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
  return {
    success: true,
    data,
  };
}

export const useTokenStore = defineStore('api', () => {
  const userToken = ref<UserTokenData | null>(null);
  const user = ref<PagedResponseUserInfo['results'][0]>();
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
    // check "user" cookie (JSON) and set user state if it exists
    const userCookie = document.cookie.split('; ').find((row) => row.startsWith('auth='));

    if (userCookie) {
      const splitCookie = userCookie.split('=');
      if (splitCookie.length !== 2) {
        console.error('Invalid user cookie format');
        ready.value = true;
        return;
      }
      const cookieValue = splitCookie[1]!;
      try {
        const userData = JSON.parse(decodeURIComponent(cookieValue));
        const parsedData = userTokenData.parse(userData);
        userToken.value = parsedData;
      } catch (e) {
        console.error('Failed to parse user cookie:', e);
      }
    }

    await refreshInfo();

    if (userToken.value) {
      // Fetch user data to verify token is valid and get user rank
      const userResp = await doFetch<PagedResponseUserInfo['results'][0]>(
        `/api/user/${userToken.value.user}?bump-login=true`,
        {
          method: 'POST',
          headers: {
            Authorization: authToken.value!, // should be safe to assert non-null since we checked userToken.value above
          },
        },
      );

      if (userResp.success) {
        user.value = userResp.data;
      } else {
        console.error('Failed to fetch user data:', userResp);
        // If fetching user data fails, clear the token since it's likely invalid
        userToken.value = null;
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
    let minViable = null;
    for (const [priv, minRank] of Object.entries(config.value?.config.privileges || {})) {
      if (!priv.startsWith(privilege)) {
        continue;
      }

      const rankIndex = allRanks.indexOf(minRank);
      if (minViable === null || rankIndex < minViable) {
        minViable = rankIndex;
      }
    }

    if (minViable === null) {
      return false; // Privilege not found, deny by default
    }

    const myRank = user.value?.rank ? allRanks.indexOf(user.value.rank) : 0;
    return myRank >= minViable;
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
  };
});
