import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

function getBuildVersion(): string {
  const buildInfo = process.env.BUILD_INFO;
  if (buildInfo) return buildInfo.trim();
  try {
    return execSync('git describe --always --dirty --long --tags').toString().trim();
  } catch {
    return 'unknown';
  }
}

function getBuildGitHub(): string {
  const gitLink = process.env.GIT_LINK;
  if (gitLink) return gitLink.trim();
  try {
    const remote = execSync('git config --get remote.origin.url')
      .toString()
      .trim()
      .replace('.git', '');
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return `${remote}/commits/${branch}`;
  } catch {
    return 'https://github.com/liamw1/oxibooru/commits/master';
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(getBuildVersion()),
    'import.meta.env.VITE_BUILD_GIT_LINK': JSON.stringify(getBuildGitHub()),
  },
});
