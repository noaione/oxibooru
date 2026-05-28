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
    // ── Posts core routes (Stage 4) ──────────────────────────
    {
      path: '/post/merge/:id1/:id2',
      name: 'post-merge',
      meta: { title: 'Merge Posts' },
      component: () => import('@/pages/PostMergeView.vue'),
    },
    {
      path: '/post/:id/edit',
      name: 'post-edit',
      component: () => import('@/pages/PostView.vue'),
    },
    {
      path: '/post/:id',
      name: 'post',
      component: () => import('@/pages/PostView.vue'),
    },
    // ── Posts upload/edit routes (Stage 5) ────────────────────
    {
      path: '/upload',
      name: 'upload',
      meta: { title: 'Upload' },
      component: () => import('@/pages/PostUploadView.vue'),
    },
    // ── User management routes (Stage 3) ──────────────────────
    {
      path: '/users',
      name: 'users',
      meta: { title: 'Users' },
      component: () => import('@/pages/UsersView.vue'),
    },
    {
      path: '/user/:name',
      name: 'user',
      component: () => import('@/pages/UserView.vue'),
    },
    {
      path: '/user/:name/edit',
      name: 'user-edit',
      component: () => import('@/pages/UserView.vue'),
    },
    {
      path: '/user/:name/tokens',
      name: 'user-tokens',
      component: () => import('@/pages/UserView.vue'),
    },
    {
      path: '/user/:name/delete',
      name: 'user-delete',
      component: () => import('@/pages/UserView.vue'),
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
