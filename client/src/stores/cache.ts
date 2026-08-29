import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type {
  PoolInfo,
  PostInfo,
  PostNeighbors,
  TagInfo,
  TagSibling,
  UserInfo,
  UserTokenInfo,
} from '@/types/oxibooru.gen';

export const usePostCacheStore = defineStore('cache-posts', () => {
  const posts = reactive(new Map<number, PostInfo>());
  const neighbors = reactive(new Map<number, PostNeighbors>());

  function getPost(id: number): PostInfo | null {
    return posts.get(id) ?? null;
  }
  function setPost(id: number, data: PostInfo): void {
    posts.set(id, data);
  }
  function getNeighbors(id: number): PostNeighbors | null {
    return neighbors.get(id) ?? null;
  }
  function setNeighbors(id: number, data: PostNeighbors): void {
    neighbors.set(id, data);
  }
  function invalidatePost(id: number): void {
    posts.delete(id);
    neighbors.delete(id);
  }
  function flushPosts(): void {
    posts.clear();
    neighbors.clear();
  }

  return { getPost, setPost, getNeighbors, setNeighbors, invalidatePost, flushPosts };
});

export const useTagCacheStore = defineStore('cache-tags', () => {
  const tags = reactive(new Map<string, TagInfo>());
  const siblings = reactive(new Map<string, TagSibling[]>());

  function getTag(name: string): TagInfo | null {
    return tags.get(name) ?? null;
  }
  function setTag(name: string, data: TagInfo): void {
    tags.set(name, data);
  }
  function getSiblings(name: string): TagSibling[] | null {
    return siblings.get(name) ?? null;
  }
  function setSiblings(name: string, data: TagSibling[]): void {
    siblings.set(name, data);
  }
  function invalidateTag(name: string): void {
    tags.delete(name);
    siblings.delete(name);
  }
  function flushTags(): void {
    tags.clear();
    siblings.clear();
  }

  return { getTag, setTag, getSiblings, setSiblings, invalidateTag, flushTags };
});

export const usePoolCacheStore = defineStore('cache-pools', () => {
  const pools = reactive(new Map<number, PoolInfo>());

  function getPool(id: number): PoolInfo | null {
    return pools.get(id) ?? null;
  }
  function setPool(id: number, data: PoolInfo): void {
    pools.set(id, data);
  }
  function invalidatePool(id: number): void {
    pools.delete(id);
  }
  function flushPools(): void {
    pools.clear();
  }

  return { getPool, setPool, invalidatePool, flushPools };
});

export const useUserCacheStore = defineStore('cache-users', () => {
  const users = reactive(new Map<string, UserInfo>());
  const tokens = reactive(new Map<string, UserTokenInfo[]>());

  function getUser(name: string): UserInfo | null {
    return users.get(name) ?? null;
  }
  function setUser(name: string, data: UserInfo): void {
    users.set(name, data);
  }
  function getTokens(name: string): UserTokenInfo[] | null {
    return tokens.get(name) ?? null;
  }
  function setTokens(name: string, data: UserTokenInfo[]): void {
    tokens.set(name, data);
  }
  function invalidateUser(name: string): void {
    users.delete(name);
    tokens.delete(name);
  }
  function flushUsers(): void {
    users.clear();
    tokens.clear();
  }

  return { getUser, setUser, getTokens, setTokens, invalidateUser, flushUsers };
});
