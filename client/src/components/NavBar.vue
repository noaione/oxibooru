<template>
  <nav class="overlay-color w-dvw max-w-dvw">
    <div v-if="!apiController.ready" class="mx-auto flex items-center justify-between h-9" />
    <div v-else class="mx-auto flex items-center justify-between">
      <!-- Left: main navigation -->
      <div class="flex items-center">
        <RouterLink
          v-for="nav in leftNavigations"
          :key="nav.name"
          :to="nav.href"
          class="px-4 py-2 text-sm font-medium flex items-center gap-1.5"
          :class="nav.highlight ? activeClass : inactiveClass"
        >
          <img
            v-if="nav.iconImage"
            :src="nav.iconImage"
            alt="avatar"
            class="w-5 h-5 rounded-full"
          />
          {{ nav.name }}
        </RouterLink>
      </div>

      <!-- Right: account + utility icons -->
      <div class="flex items-center">
        <RouterLink
          v-for="nav in rightNavigations"
          :key="nav.name"
          :to="nav.href"
          class="px-4 py-2 text-sm font-medium flex items-center gap-1.5"
          :class="nav.highlight ? activeClass : inactiveClass"
        >
          <img
            v-if="nav.iconImage"
            :src="nav.iconImage"
            alt="avatar"
            class="w-5 h-5 rounded-full"
          />
          {{ nav.name }}
        </RouterLink>

        <!-- Settings -->
        <RouterLink
          to="/settings"
          :class="['p-2', isSettings ? activeClass : inactiveClass]"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon :size="18" />
        </RouterLink>

        <!-- Dark mode toggle -->
        <button
          class="p-2 cursor-pointer"
          :class="inactiveClass"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDark"
        >
          <SunIcon v-if="isDark" :size="18" />
          <MoonIcon v-else :size="18" />
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Settings as SettingsIcon, Sun as SunIcon, Moon as MoonIcon } from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useDarkTheme } from '@/stores/settings';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { resolveApiUrl } from '@/utils/url';

type Navigation = {
  name: string;
  href: string;
  matcher?: RegExp;
  pos?: 'left' | 'right';
  highlight?: boolean;
  iconImage?: string;
};

const activeClass = 'bg-black/10 dark:bg-white/10';
const inactiveClass = 'opacity-70 hover:opacity-100 transition-opacity';

const { toggleDark, isDark } = useDarkTheme();
const apiController = useTokenStore();
const router = useRouter();

const isSettings = computed(() => router.currentRoute.value.path === '/settings');

const navigations = computed<Navigation[]>(() => {
  const baseNavs: Navigation[] = [{ name: 'Home', href: '/' }];

  if (!apiController.ready) return baseNavs;

  if (apiController.hasPrivilege('post_list')) {
    baseNavs.push({ name: 'Posts', href: '/posts', matcher: /^\/post(s)?(\/.*)?/ });
  }
  if (apiController.hasPrivilege('post_create')) {
    baseNavs.push({ name: 'Upload', href: '/upload' });
  }
  if (apiController.hasPrivilege('comment_list')) {
    baseNavs.push({ name: 'Comments', href: '/comments', matcher: /^\/comments?(\/.*)?/ });
  }
  if (apiController.hasPrivilege('tag_list')) {
    baseNavs.push({ name: 'Tags', href: '/tags', matcher: /^\/tags?(\/.*)?/ });
  }
  if (apiController.hasPrivilege('user_list')) {
    baseNavs.push({ name: 'Users', href: '/users', matcher: /^\/users?(\/.*)?/ });
  }

  if (apiController.user?.name) {
    baseNavs.push({
      name: apiController.user.name,
      href: `/user/${apiController.user.name}`,
      pos: 'right',
      iconImage: resolveApiUrl(apiController.user.avatarUrl),
    });
    if (apiController.hasPrivilege('user_create_any')) {
      baseNavs.push({ name: 'Register', href: '/register', pos: 'right' });
    }
    baseNavs.push({ name: 'Logout', href: '/logout', pos: 'right' });
  } else {
    if (apiController.hasPrivilege('user_create_self')) {
      baseNavs.push({ name: 'Register', href: '/register', pos: 'right' });
    }
    baseNavs.push({ name: 'Login', href: '/login', pos: 'right' });
  }

  baseNavs.push({
    name: 'Help',
    href: '/help',
    matcher: /^\/help(\/.*)?/,
    pos: 'right',
  });

  return baseNavs.map((nav) => ({
    ...nav,
    highlight: isMatch(nav),
  }));
});

const leftNavigations = computed(() => navigations.value.filter((nav) => nav.pos !== 'right'));
const rightNavigations = computed(() => navigations.value.filter((nav) => nav.pos === 'right'));

const isMatch = (nav: Navigation) => {
  if (nav.matcher) return nav.matcher.test(router.currentRoute.value.path);
  return router.currentRoute.value.path === nav.href;
};
</script>
