<template>
  <nav class="overlay-color w-full max-w-dvw relative">
    <div class="mx-auto flex items-center justify-between">
      <!-- Left: main navigation (desktop) -->
      <div :class="[navLayout.showDesktop, 'items-center']">
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

      <!-- Mobile: site name placeholder to keep layout balanced -->
      <RouterLink to="/" :class="[navLayout.showMobile, 'px-3 py-2 text-sm font-semibold']">
        {{ apiController.config?.config.name || 'Oxibooru' }}
      </RouterLink>

      <!-- Right: account + utility icons (desktop) -->
      <div :class="[navLayout.showDesktop, 'items-center']">
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
          @click="darkTheme.toggleDark"
        >
          <SunIcon v-if="isDark" :size="18" />
          <MoonIcon v-else :size="18" />
        </button>
      </div>

      <!-- Mobile: right-side controls -->
      <div :class="[navLayout.showMobile, 'items-center']">
        <button
          class="p-2 cursor-pointer"
          :class="inactiveClass"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="darkTheme.toggleDark"
        >
          <SunIcon v-if="isDark" :size="18" />
          <MoonIcon v-else :size="18" />
        </button>
        <button
          class="p-2 cursor-pointer"
          :class="mobileMenuOpen ? activeClass : inactiveClass"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <XIcon v-if="mobileMenuOpen" :size="18" />
          <MenuIcon v-else :size="18" />
        </button>
      </div>
    </div>

    <!-- Mobile dropdown -->
    <div
      v-if="mobileMenuOpen"
      :class="[
        navLayout.hideMobile,
        'absolute left-0 right-0 top-full z-50 overlay-color border-t border-black/10 dark:border-white/10 shadow-lg',
      ]"
    >
      <RouterLink
        v-for="nav in navigations"
        :key="nav.name"
        :to="nav.href"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b border-black/5 dark:border-white/5 last:border-b-0"
        :class="nav.highlight ? activeClass : inactiveClass"
        @click="mobileMenuOpen = false"
      >
        <img v-if="nav.iconImage" :src="nav.iconImage" alt="avatar" class="w-5 h-5 rounded-full" />
        {{ nav.name }}
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex items-center gap-2 px-4 py-3 text-sm font-medium"
        :class="isSettings ? activeClass : inactiveClass"
        @click="mobileMenuOpen = false"
      >
        <SettingsIcon :size="16" />
        Settings
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import {
  Settings as SettingsIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Menu as MenuIcon,
  X as XIcon,
} from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useDarkTheme } from '@/stores/settings';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { resolveApiUrl } from '@/utils/url';

type Navigation = {
  name: string;
  href: string;
  matcher?: RegExp;
  excludeMatcher?: string | RegExp;
  pos?: 'left' | 'right';
  highlight?: boolean;
  iconImage?: string;
};

const activeClass = 'bg-black/10 dark:bg-white/10';
const inactiveClass = 'opacity-70 hover:opacity-100 transition-opacity';

const darkTheme = useDarkTheme();
const { isDark } = storeToRefs(darkTheme);
const apiController = useTokenStore();
const router = useRouter();

const isSettings = computed(() => router.currentRoute.value.path === '/settings');

const mobileMenuOpen = ref(false);
watch(
  () => router.currentRoute.value.path,
  () => {
    mobileMenuOpen.value = false;
  },
);

// Lookup table of complete class strings — Tailwind JIT must see full strings statically.
const NAV_LAYOUTS = {
  sm: { showDesktop: 'hidden sm:flex', showMobile: 'flex sm:hidden', hideMobile: 'sm:hidden' },
  md: { showDesktop: 'hidden md:flex', showMobile: 'flex md:hidden', hideMobile: 'md:hidden' },
  lg: { showDesktop: 'hidden lg:flex', showMobile: 'flex lg:hidden', hideMobile: 'lg:hidden' },
  xl: { showDesktop: 'hidden xl:flex', showMobile: 'flex xl:hidden', hideMobile: 'xl:hidden' },
} as const;

// Pick a breakpoint based on total navigation item count.
// Each item is ~80px wide; breakpoints: sm=640 md=768 lg=1024 xl=1280.
const navLayout = computed(() => {
  const count = navigations.value.length;
  if (count <= 6) return NAV_LAYOUTS.sm;
  if (count <= 8) return NAV_LAYOUTS.md;
  if (count <= 11) return NAV_LAYOUTS.lg;
  return NAV_LAYOUTS.xl;
});

const navigations = computed<Navigation[]>(() => {
  const baseNavs: Navigation[] = [{ name: 'Home', href: '/' }];

  if (!apiController.ready) {
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
  }

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
  if (apiController.hasPrivilege('pool_list')) {
    baseNavs.push({ name: 'Pools', href: '/pools', matcher: /^\/pools?(\/.*)?/ });
  }
  if (apiController.hasPrivilege('user_list')) {
    const excludeMatcher = apiController.user?.name
      ? new RegExp(`^\\/user\\/${apiController.user.name}(\\/.*)?`)
      : undefined;
    baseNavs.push({ name: 'Users', href: '/users', matcher: /^\/users?(\/.*)?/, excludeMatcher });
  }

  if (apiController.user?.name) {
    const matcherRegex = new RegExp(`^\\/user\\/${apiController.user.name}(\\/.*)?`);
    baseNavs.push({
      name: 'Account',
      href: `/user/${apiController.user.name}`,
      pos: 'right',
      iconImage: resolveApiUrl(apiController.user.avatarUrl),
      matcher: matcherRegex,
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

const doExcludeMatch = (nav: Navigation) => {
  if (nav.excludeMatcher instanceof RegExp) {
    return !nav.excludeMatcher.test(router.currentRoute.value.path);
  } else if (typeof nav.excludeMatcher === 'string') {
    return router.currentRoute.value.path !== nav.excludeMatcher;
  } else {
    return true;
  }
};

const isMatch = (nav: Navigation) => {
  if (nav.matcher) {
    return nav.matcher.test(router.currentRoute.value.path) && doExcludeMatch(nav);
  }
  return router.currentRoute.value.path === nav.href;
};
</script>
