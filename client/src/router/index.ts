import { nextTick } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useLoaderStore } from '@/stores/loader';
import { useTokenStore } from '@/stores/api';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomeView.vue'),
    },
    {
      path: '/posts',
      name: 'posts',
      component: () => import('@/pages/PostsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsView.vue'),
    },
    // ── Auth routes (Stage 2) ──────────────────────────────────
    {
      path: '/login',
      name: 'login',
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
      component: () => import('@/pages/RegisterView.vue'),
    },
    {
      path: '/password-reset',
      name: 'password-reset',
      component: () => import('@/pages/PasswordResetView.vue'),
    },
    // ── Posts core routes (Stage 4) ──────────────────────────
    {
      path: '/post/merge/:id1/:id2',
      name: 'post-merge',
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
      component: () => import('@/pages/PostUploadView.vue'),
    },
    // ── User management routes (Stage 3) ──────────────────────
    {
      path: '/users',
      name: 'users',
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
    // ── Tag routes (Stage 6) ──────────────────────────────────
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/pages/TagsView.vue'),
    },
    {
      path: '/tag-categories',
      name: 'tag-categories',
      component: () => import('@/pages/TagCategoriesView.vue'),
    },
    {
      path: '/tag/:name/merge/:other',
      name: 'tag-merge',
      component: () => import('@/pages/TagMergeView.vue'),
    },
    {
      path: '/tag/:name/edit',
      name: 'tag-edit',
      component: () => import('@/pages/TagView.vue'),
    },
    {
      path: '/tag/:name/delete',
      name: 'tag-delete',
      component: () => import('@/pages/TagView.vue'),
    },
    {
      path: '/tag/:name',
      name: 'tag',
      component: () => import('@/pages/TagView.vue'),
    },
    // ── Pool routes (Stage 7) ─────────────────────────────────
    {
      path: '/pools',
      name: 'pools',
      component: () => import('@/pages/PoolsView.vue'),
    },
    {
      path: '/pools/create',
      name: 'pool-create',
      component: () => import('@/pages/PoolCreateView.vue'),
    },
    {
      path: '/pool-categories',
      name: 'pool-categories',
      component: () => import('@/pages/PoolCategoriesView.vue'),
    },
    {
      path: '/pool/:id/merge/:other',
      name: 'pool-merge',
      component: () => import('@/pages/PoolMergeView.vue'),
    },
    {
      path: '/pool/:id/edit',
      name: 'pool-edit',
      component: () => import('@/pages/PoolView.vue'),
    },
    {
      path: '/pool/:id/delete',
      name: 'pool-delete',
      component: () => import('@/pages/PoolView.vue'),
    },
    {
      path: '/pool/:id',
      name: 'pool',
      component: () => import('@/pages/PoolView.vue'),
    },
    // ── Stage 8: Comments, Snapshots, Help ───────────────────────
    {
      path: '/comments',
      name: 'comments',
      component: () => import('@/pages/CommentsView.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/pages/SnapshotsView.vue'),
    },
    {
      path: '/help',
      name: 'help',
      component: () => import('@/pages/HelpView.vue'),
    },
    {
      path: '/help/:section',
      name: 'help-section',
      component: () => import('@/pages/HelpView.vue'),
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
  nextTick(() => useLoaderStore().done());
});

export { router };
export default router;
