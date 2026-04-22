<template>
  <nav class="overlay-color w-dvw max-w-dvw">
    <div v-if="!apiController.ready" class="mx-auto flex items-center justify-between">
      <div
        class="px-5 py-2 text-sm font-medium opacity-80 hover:opacity-100 transition-opacity cursor-not-allowed invisible"
      >
        Home
      </div>
    </div>
    <div v-else class="mx-auto flex items-center justify-between">
      <div class="flex items-center">
        <RouterLink
          v-for="nav in leftNavigations"
          :key="nav.name"
          :to="nav.href"
          class="px-5 py-2 text-sm font-medium"
          :class="{
            'bg-gray-300 dark:bg-gray-600': nav.highlight,
            'opacity-80 hover:opacity-100 transition-opacity': !nav.highlight,
          }"
        >
          <img
            v-if="nav.iconImage"
            :src="nav.iconImage"
            alt="avatar"
            class="w-5 h-5 rounded-full inline mr-1"
          />
          {{ nav.name }}
        </RouterLink>
      </div>
      <div class="flex items-center">
        <RouterLink
          v-for="nav in rightNavigations"
          :key="nav.name"
          :to="nav.href"
          class="px-5 py-2 text-sm font-medium"
          :class="{
            'bg-gray-300 dark:bg-gray-600': nav.highlight,
            'opacity-80 hover:opacity-100 transition-opacity': !nav.highlight,
          }"
        >
          <img
            v-if="nav.iconImage"
            :src="nav.iconImage"
            alt="avatar"
            class="w-5 h-5 rounded-full inline mr-1"
          />
          {{ nav.name }}
        </RouterLink>
        <RouterLink
          to="/settings"
          class="px-5 py-2 text-sm font-medium"
          :class="{
            'bg-gray-300 dark:bg-gray-600': isSettings,
            'opacity-80 hover:opacity-100 transition-opacity': !isSettings,
          }"
        >
          Gear
        </RouterLink>
        <button
          @click="toggleDark"
          class="px-5 py-2 text-sm font-medium opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        >
          Theme
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useTokenStore } from '@/stores/api';
import { useDarkTheme } from '@/stores/settings';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

type Navigation = {
  name: string;
  href: string;
  matcher?: RegExp;
  pos?: 'left' | 'right';
  highlight?: boolean;
  iconImage?: string;
};

const { toggleDark } = useDarkTheme();
const apiController = useTokenStore();
const router = useRouter();

const isSettings = computed(() => isMatch({ name: 'Settings', href: '/settings' }));

const navigations = computed<Navigation[]>(() => {
  const baseNavs: Navigation[] = [{ name: 'Home', href: '/' }];

  if (!apiController.ready) {
    return baseNavs; // quick return
  }

  if (apiController.hasPrivilege('post_list')) {
    baseNavs.push({ name: 'Posts', href: '/posts', matcher: /^\/posts?(\/.*)?/ });
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

  // Right side menu
  if (apiController.user?.name) {
    baseNavs.push({
      name: 'Account',
      href: `/user/${apiController.user.name}`,
      pos: 'right',
      iconImage: apiController.user.avatarUrl,
    });

    if (apiController.hasPrivilege('user_create_any')) {
      baseNavs.push({
        name: 'Register',
        href: '/register',
        pos: 'right',
      });
    }
    baseNavs.push({
      name: 'Logout',
      href: '/logout',
      pos: 'right',
    });
  } else {
    if (apiController.hasPrivilege('user_create_self')) {
      baseNavs.push({
        name: 'Register',
        href: '/register',
        pos: 'right',
      });
    }
    baseNavs.push({
      name: 'Login',
      href: '/login',
      pos: 'right',
    });
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
  if (nav.matcher) {
    return nav.matcher.test(router.currentRoute.value.path);
  }
  return router.currentRoute.value.path === nav.href;
};
</script>
