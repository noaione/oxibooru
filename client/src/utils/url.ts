const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const buildBaseUrl = import.meta.env.VITE_BUILD_BASE_URL as string | undefined;

function maybeResolveBaseUrl() {
  if (!buildBaseUrl) return location.origin;

  if (URL.canParse(buildBaseUrl)) {
    return buildBaseUrl; // likely full URL
  }

  try {
    return new URL(buildBaseUrl, location.origin).href;
  } catch {
    return buildBaseUrl;
  }
}

export function resolveApiUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, apiBase ?? maybeResolveBaseUrl()).href;
  } catch {
    return url;
  }
}
