const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function resolveApiUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, apiBase ?? location.origin).href;
  } catch {
    return url;
  }
}
