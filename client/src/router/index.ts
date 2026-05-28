import { createRouter, createWebHistory } from 'vue-router';
import { useLoaderStore } from '@/stores/loader';
import { useTokenStore } from '@/stores/api';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: 'Home' },
      component: () => import('@/pages/HomeView.vue'),
    },
    {
      path: '/posts',
      name: 'posts',
      meta: { title: 'Posts' },
      component: () => import('@/pages/PostsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      meta: { title: 'Settings' },
      component: () => import('@/pages/SettingsView.vue'),
    },
    // ── Auth routes (Stage 2) ──────────────────────────────────
    {
      path: '/login',
      name: 'login',
      meta: { title: 'Log in' },
      component: () => import('@/pages/LoginView.vue'),
    },
    {
      path: '/logout',
      name: 'logout',
      beforeEnter: async (_to, _from, next) => {
        const api = useTokenStore();
        await api.logout();
        next('/');
      },
      component: { render: () => null }, // never rendered
    },
    {
      path: '/register',
      name: 'register',
      meta: { title: 'Register' },
      component: () => import('@/pages/RegisterView.vue'),
    },
    {
      path: '/password-reset',
      name: 'password-reset',
      meta: { title: 'Password Reset' },
      component: () => import('@/pages/PasswordResetView.vue'),
    },
    // ── Catch-all 404 ─────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      meta: { title: 'Not Found' },
      component: () => import('@/pages/NotFoundView.vue'),
    },
  ],
});

router.beforeEach((to) => {
  useLoaderStore().start();
  if (to.meta.title) {
    document.title = String(to.meta.title);
  }
});

router.afterEach(() => {
  useLoaderStore().done();
});

export { router };
export default router;
