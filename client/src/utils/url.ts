const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function resolveApiUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (apiBase) {
    try {
      return new URL(url, apiBase).href;
    } catch {
      return url;
    }
  }
  return url;
}
