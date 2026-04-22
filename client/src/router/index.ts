import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: {
        title: 'Home',
      },
      component: () => import('@/pages/HomeView.vue'),
    },
    {
      path: '/posts',
      name: 'posts',
      meta: {
        title: 'Posts',
      },
      component: () => import('@/pages/PostsView.vue'),
    },
  ],
});

export default router;
