import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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

const RUFFLE_DIR = fileURLToPath(new URL('node_modules/@ruffle-rs/ruffle', import.meta.url));

// Serves Ruffle files from node_modules at /ruffle/* in dev mode.
// vite-plugin-static-copy only copies during build, so dev needs its own handler.
function ruffleDevPlugin(): Plugin {
  return {
    name: 'ruffle-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/ruffle', async (req, res, next) => {
        const fileName = (req.url ?? '/').replace(/^\//, '');
        if (!fileName || fileName.includes('..')) return next();
        try {
          const data = await readFile(path.join(RUFFLE_DIR, fileName));
          res.setHeader('Content-Type', fileName.endsWith('.wasm') ? 'application/wasm' : 'application/javascript');
          res.end(data);
        } catch {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    ruffleDevPlugin(),
    viteStaticCopy({
      targets: [{ src: 'node_modules/@ruffle-rs/ruffle/*.{js,wasm}', dest: 'ruffle' }],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_BUILD_BASE_URL': JSON.stringify(process.env.BASE_URL || '/'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(getBuildVersion()),
    'import.meta.env.VITE_BUILD_GIT_LINK': JSON.stringify(getBuildGitHub()),
  },
});
