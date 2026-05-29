import type {
  CommentCreateBody,
  CommentInfo,
  CommentUpdateBody,
  InfoResponse,
  MergeBodySmallString,
  MergeBodyI64,
  PagedResponseCommentInfo,
  PagedResponsePoolInfo,
  PagedResponsePostInfo,
  PagedResponseSnapshotInfo,
  PagedResponseTagInfo,
  PagedResponseUserInfo,
  PoolCategoryCreateBody,
  PoolCategoryInfo,
  PoolCategoryUpdateBody,
  PoolCreateBody,
  PoolInfo,
  PoolUpdateBody,
  PostCreateBody,
  PostInfo,
  PostMergeBody,
  PostNeighbors,
  PostUpdateBody,
  RatingBody,
  ReverseSearchResponse,
  TagCategoryCreateBody,
  TagCategoryInfo,
  TagCategoryUpdateBody,
  TagCreateBody,
  TagInfo,
  TagSiblings,
  TagUpdateBody,
  UnpagedResponseTagCategoryInfo,
  UnpagedResponsePoolCategoryInfo,
  UploadResponse,
  UserTokenCreateBody,
  UserTokenUpdateBody,
  UserTokenInfo,
  UnpagedResponseUserTokenInfo,
  UserInfo,
  UserUpdateBody,
  UserRank,
  OIDCAuthorizeResponse,
} from '@/types/oxibooru.gen';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
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

type FetchOptions = RequestInit & { allowUnauthorized?: boolean };

export async function doFetch<T>(urlPath: string, options?: FetchOptions): Promise<ApiResponse<T>> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const newUrl = new URL(urlPath, baseUrl);

  const { allowUnauthorized, ...fetchOptions } = options ?? {};

  let response: Response;
  try {
    response = await fetch(newUrl, fetchOptions);
  } catch (error) {
    // mainly to catch CORS issue but with response data
    console.error(error);
    return {
      success: false,
      code: 500,
      statusCode: 0,
      title: 'Network error',
      description: 'Could not connect to the server',
    };
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    if (response.status === 401 && !allowUnauthorized) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
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

function setCookieAuth(user: string, token: string, remember = true) {
  const value = encodeURIComponent(JSON.stringify({ user, token }));
  const parts = [`auth=${value}`, 'path=/', 'SameSite=Lax'];
  if (remember) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    parts.push(`expires=${expires.toUTCString()}`);
  }
  document.cookie = parts.join('; ');
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
  async function init() {
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
  }

  const refreshInfo = async () => {
    const infoResp = await doFetch<InfoResponse>('/api/info');
    if (infoResp.success) {
      config.value = infoResp.data;
    }
  };

  const canAccess = (privilege: string, myRank: UserRank) => {
    let minViable: number | null = null;
    for (const [priv, minRank] of Object.entries(config.value?.config.privileges || {})) {
      if (!priv.startsWith(privilege)) continue;
      const rankIndex = allRanks.indexOf(minRank);
      if (minViable === null || rankIndex < minViable) {
        minViable = rankIndex;
      }
    }
    if (minViable === null) return false;
    return allRanks.indexOf(myRank) >= minViable;
  };

  const hasPrivilege = (privilege: string) => {
    const myRank: UserRank = user.value?.rank ?? 'anonymous';
    return canAccess(privilege, myRank);
  };

  // ── Auth actions ───────────────────────────────────────────────────

  const login = async (
    username: string,
    password: string,
    remember = true,
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
    setCookieAuth(username, token, remember);

    const userResp = await doFetch<UserInfo>(`/api/user/${encodeURIComponent(username)}`, {
      headers: { Authorization: authToken.value! },
    });
    if (userResp.success) user.value = userResp.data;

    await refreshInfo();
    return { success: true };
  };

  const loginWithToken = async (
    username: string,
    token: string,
    doRemember = false,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    userToken.value = { user: username, token };
    setCookieAuth(username, token, doRemember);
    const userResp = await doFetch<UserInfo>(
      `/api/user/${encodeURIComponent(username)}?bump-login=true`,
      {
        headers: { Authorization: authToken.value! },
      },
    );
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
    email?: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const body: Record<string, string> = { name: username, password };
    if (email?.trim()) body.email = email.trim();
    const resp = await doFetch<UserInfo>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
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
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  // ── User management ────────────────────────────────────────────

  const getUser = async (
    name: string,
  ): Promise<{ success: true; data: UserInfo } | { success: false; description: string }> => {
    const resp = await doFetch<UserInfo>(`/api/user/${encodeURIComponent(name)}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updateUser = async (
    name: string,
    body: Omit<UserUpdateBody, 'version'> & { version: string },
    avatarFile?: File | null,
  ): Promise<{ success: true; data: UserInfo } | { success: false; description: string }> => {
    let resp: Awaited<ReturnType<typeof doFetch<UserInfo>>>;
    if (avatarFile) {
      const form = new FormData();
      form.append('avatar', avatarFile);
      const metadataPayload = new Blob([JSON.stringify(body)], { type: 'application/json' });
      form.append('metadata', metadataPayload);
      resp = await doFetch<UserInfo>(`/api/user/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { Authorization: authToken.value! },
        body: form,
      });
    } else {
      resp = await doFetch<UserInfo>(`/api/user/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
        body: JSON.stringify(body),
      });
    }
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    if (name === userToken.value?.user) {
      user.value = resp.data;
    }
    return { success: true, data: resp.data };
  };

  const deleteUser = async (
    name: string,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/user/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const getUserTokens = async (
    name: string,
  ): Promise<
    | { success: true; data: UnpagedResponseUserTokenInfo['results'] }
    | { success: false; description: string }
  > => {
    const resp = await doFetch<UnpagedResponseUserTokenInfo>(
      `/api/user-tokens/${encodeURIComponent(name)}`,
      {
        headers: { Authorization: authToken.value! },
      },
    );
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data.results };
  };

  const createUserToken = async (
    name: string,
    note?: string,
    expirationTime?: string | null,
  ): Promise<{ success: true; data: UserTokenInfo } | { success: false; description: string }> => {
    const body: UserTokenCreateBody = {
      note: note || null,
      enabled: true,
      expirationTime: expirationTime ?? null,
    };
    const resp = await doFetch<UserTokenInfo>(`/api/user-token/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deleteUserToken = async (
    name: string,
    token: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(
      `/api/user-token/${encodeURIComponent(name)}/${encodeURIComponent(token)}`,
      {
        method: 'DELETE',
        headers: { Authorization: authToken.value! },
      },
    );
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const updateUserToken = async (
    name: string,
    token: string,
    body: UserTokenUpdateBody,
  ): Promise<{ success: true; data: UserTokenInfo } | { success: false; description: string }> => {
    const resp = await doFetch<UserTokenInfo>(
      `/api/user-token/${encodeURIComponent(name)}/${encodeURIComponent(token)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
        body: JSON.stringify(body),
      },
    );
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const listUsers = async (
    query: string,
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponseUserInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ query, offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponseUserInfo>(`/api/users?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Post actions ───────────────────────────────────────────────

  const listPosts = async (
    query: string,
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponsePostInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ query, offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponsePostInfo>(`/api/posts?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const getPost = async (
    id: number,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/post/${id}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const getPostNeighbors = async (
    id: number,
    query?: string,
  ): Promise<{ success: true; data: PostNeighbors } | { success: false; description: string }> => {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    const resp = await doFetch<PostNeighbors>(`/api/post/${id}/around${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updatePost = async (
    id: number,
    body: PostUpdateBody,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/post/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deletePost = async (
    id: number,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/post/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const ratePost = async (
    id: number,
    score: RatingBody['score'],
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/post/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ score } satisfies RatingBody),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const favoritePost = async (
    id: number,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/post/${id}/favorite`, {
      method: 'POST',
      headers: { Authorization: authToken.value! },
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const unfavoritePost = async (
    id: number,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/post/${id}/favorite`, {
      method: 'DELETE',
      headers: { Authorization: authToken.value! },
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const listTagCategories = async (): Promise<
    { success: true; data: TagCategoryInfo[] } | { success: false; description: string }
  > => {
    const resp = await doFetch<UnpagedResponseTagCategoryInfo>('/api/tag-categories', {
      headers: authToken.value ? { Authorization: authToken.value } : {},
      allowUnauthorized: true,
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data.results };
  };

  const listPoolCategories = async (): Promise<
    { success: true; data: PoolCategoryInfo[] } | { success: false; description: string }
  > => {
    const resp = await doFetch<UnpagedResponsePoolCategoryInfo>('/api/pool-categories', {
      headers: authToken.value ? { Authorization: authToken.value } : {},
      allowUnauthorized: true,
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data.results };
  };

  // ── Pool actions ────────────────────────────────────────────────

  const listPools = async (
    query: string,
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponsePoolInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ query, offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponsePoolInfo>(`/api/pools?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const getPool = async (
    id: number,
  ): Promise<{ success: true; data: PoolInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PoolInfo>(`/api/pool/${id}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const createPool = async (
    body: PoolCreateBody,
  ): Promise<{ success: true; data: PoolInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PoolInfo>('/api/pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updatePool = async (
    id: number,
    body: PoolUpdateBody,
  ): Promise<{ success: true; data: PoolInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PoolInfo>(`/api/pool/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deletePool = async (
    id: number,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/pool/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const mergePool = async (
    body: MergeBodyI64,
  ): Promise<{ success: true; data: PoolInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PoolInfo>('/api/pool-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Pool category actions ───────────────────────────────────────

  const createPoolCategory = async (
    body: PoolCategoryCreateBody,
  ): Promise<
    { success: true; data: PoolCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<PoolCategoryInfo>('/api/pool-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updatePoolCategory = async (
    name: string,
    body: PoolCategoryUpdateBody,
  ): Promise<
    { success: true; data: PoolCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<PoolCategoryInfo>(`/api/pool-category/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deletePoolCategory = async (
    name: string,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/pool-category/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const setDefaultPoolCategory = async (
    name: string,
    version: string,
  ): Promise<
    { success: true; data: PoolCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<PoolCategoryInfo>(
      `/api/pool-category/${encodeURIComponent(name)}/default`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
        body: JSON.stringify({ version }),
      },
    );
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const uploadContent = async (
    file: File,
  ): Promise<{ success: true; data: UploadResponse } | { success: false; description: string }> => {
    const form = new FormData();
    form.append('content', file);
    const resp = await doFetch<UploadResponse>('/api/uploads', {
      method: 'POST',
      headers: authToken.value ? { Authorization: authToken.value } : {},
      body: form,
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const createPost = async (
    body: PostCreateBody,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken.value ? { Authorization: authToken.value } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const mergePost = async (
    body: PostMergeBody,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>('/api/post-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const reverseSearch = async (params: {
    contentToken?: string;
    contentUrl?: string;
  }): Promise<
    { success: true; data: ReverseSearchResponse } | { success: false; description: string }
  > => {
    const resp = await doFetch<ReverseSearchResponse>('/api/posts/reverse-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken.value ? { Authorization: authToken.value } : {}),
      },
      body: JSON.stringify(params),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const featurePost = async (
    id: number,
  ): Promise<{ success: true; data: PostInfo } | { success: false; description: string }> => {
    const resp = await doFetch<PostInfo>(`/api/featured-post`, {
      method: 'POST',
      body: JSON.stringify({ id }),
      headers: {
        Authorization: authToken.value!,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Tag actions ────────────────────────────────────────────────

  const listTags = async (
    query: string,
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponseTagInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ query, offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponseTagInfo>(`/api/tags?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const getTag = async (
    name: string,
  ): Promise<{ success: true; data: TagInfo } | { success: false; description: string }> => {
    const resp = await doFetch<TagInfo>(`/api/tag/${encodeURIComponent(name)}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const getTagSiblings = async (
    name: string,
  ): Promise<{ success: true; data: TagSiblings } | { success: false; description: string }> => {
    const resp = await doFetch<TagSiblings>(`/api/tag-siblings/${encodeURIComponent(name)}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const createTag = async (
    body: TagCreateBody,
  ): Promise<{ success: true; data: TagInfo } | { success: false; description: string }> => {
    const resp = await doFetch<TagInfo>('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updateTag = async (
    name: string,
    body: TagUpdateBody,
  ): Promise<{ success: true; data: TagInfo } | { success: false; description: string }> => {
    const resp = await doFetch<TagInfo>(`/api/tag/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deleteTag = async (
    name: string,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/tag/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const mergeTag = async (
    body: MergeBodySmallString,
  ): Promise<{ success: true; data: TagInfo } | { success: false; description: string }> => {
    const resp = await doFetch<TagInfo>('/api/tag-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Tag category actions ────────────────────────────────────────

  const createTagCategory = async (
    body: TagCategoryCreateBody,
  ): Promise<
    { success: true; data: TagCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<TagCategoryInfo>('/api/tag-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updateTagCategory = async (
    name: string,
    body: TagCategoryUpdateBody,
  ): Promise<
    { success: true; data: TagCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<TagCategoryInfo>(`/api/tag-category/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deleteTagCategory = async (
    name: string,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/tag-category/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const setDefaultTagCategory = async (
    name: string,
    version: string,
  ): Promise<
    { success: true; data: TagCategoryInfo } | { success: false; description: string }
  > => {
    const resp = await doFetch<TagCategoryInfo>(
      `/api/tag-category/${encodeURIComponent(name)}/default`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
        body: JSON.stringify({ version }),
      },
    );
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Comment actions ────────────────────────────────────────────

  const listComments = async (
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponseCommentInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponseCommentInfo>(`/api/comments?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const fetchPostThumbnails = async (ids: number[]): Promise<Map<number, string>> => {
    if (ids.length === 0) return new Map();
    const params = new URLSearchParams({
      query: `id:${ids.join(',')}`,
      limit: String(ids.length),
      fields: 'id,thumbnailUrl',
    });
    const resp = await doFetch<PagedResponsePostInfo>(`/api/posts?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) return new Map();
    const map = new Map<number, string>();
    for (const post of resp.data.results ?? []) {
      if (post.id != null && post.thumbnailUrl) map.set(post.id, post.thumbnailUrl);
    }
    return map;
  };

  const createComment = async (
    body: CommentCreateBody,
  ): Promise<{ success: true; data: CommentInfo } | { success: false; description: string }> => {
    const resp = await doFetch<CommentInfo>('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const updateComment = async (
    id: number,
    body: CommentUpdateBody,
  ): Promise<{ success: true; data: CommentInfo } | { success: false; description: string }> => {
    const resp = await doFetch<CommentInfo>(`/api/comment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify(body),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const deleteComment = async (
    id: number,
    version: string,
  ): Promise<{ success: true } | { success: false; description: string }> => {
    const resp = await doFetch(`/api/comment/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ version }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true };
  };

  const rateComment = async (
    id: number,
    score: -1 | 0 | 1,
  ): Promise<{ success: true; data: CommentInfo } | { success: false; description: string }> => {
    const resp = await doFetch<CommentInfo>(`/api/comment/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authToken.value! },
      body: JSON.stringify({ score } as RatingBody),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── Snapshot actions ───────────────────────────────────────────

  const listSnapshots = async (
    offset: number,
    limit: number,
  ): Promise<
    { success: true; data: PagedResponseSnapshotInfo } | { success: false; description: string }
  > => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    const resp = await doFetch<PagedResponseSnapshotInfo>(`/api/snapshots?${params}`, {
      headers: authToken.value ? { Authorization: authToken.value } : {},
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  // ── OIDC actions ───────────────────────────────────────────

  const oidcAuthorize = async (
    provider: string,
  ): Promise<
    { success: true; data: OIDCAuthorizeResponse } | { success: false; description: string }
  > => {
    const resp = await doFetch<OIDCAuthorizeResponse>(`/api/oidc/${provider}/authorize`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  const oidcCallback = async (
    provider: string,
    code: string,
    state: string,
  ): Promise<{ success: true; data: UserTokenData } | { success: false; description: string }> => {
    const resp = await doFetch<UserTokenData>(`/api/oidc/${provider}/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    if (!resp.success) {
      return {
        success: false,
        description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
      };
    }
    return { success: true, data: resp.data };
  };

  return {
    userToken,
    authToken,
    user,
    config,
    ready,
    init,
    refreshInfo,
    hasPrivilege,
    canAccess,
    doFetch,
    login,
    loginWithToken,
    logout,
    register,
    requestPasswordReset,
    confirmPasswordReset,
    getUser,
    updateUser,
    deleteUser,
    getUserTokens,
    createUserToken,
    deleteUserToken,
    updateUserToken,
    listUsers,
    listPosts,
    getPost,
    getPostNeighbors,
    updatePost,
    deletePost,
    ratePost,
    favoritePost,
    unfavoritePost,
    listTagCategories,
    listPoolCategories,
    listPools,
    getPool,
    createPool,
    updatePool,
    deletePool,
    mergePool,
    createPoolCategory,
    updatePoolCategory,
    deletePoolCategory,
    setDefaultPoolCategory,
    uploadContent,
    createPost,
    mergePost,
    reverseSearch,
    featurePost,
    listTags,
    getTag,
    getTagSiblings,
    createTag,
    updateTag,
    deleteTag,
    mergeTag,
    createTagCategory,
    updateTagCategory,
    deleteTagCategory,
    setDefaultTagCategory,
    listComments,
    fetchPostThumbnails,
    createComment,
    updateComment,
    deleteComment,
    rateComment,
    listSnapshots,
    oidcAuthorize,
    oidcCallback,
  };
});

// Re-export types for consumers
export type { ErrorResponse, UserRank };
