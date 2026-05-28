<template>
  <div class="flex items-start justify-center pt-8">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-semibold mb-6 text-center">Log In</h1>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-username">Username</label>
          <input
            id="login-username"
            v-model="username"
            type="text"
            class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
            autocomplete="username"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-password">Password</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

        <button
          type="submit"
          class="w-full py-2 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default flex items-center justify-center gap-2"
          :disabled="loading"
        >
          <LoadingSpinner v-if="loading" size="sm" />
          Log In
        </button>
      </form>

      <div class="mt-4 text-sm text-center flex flex-col gap-1">
        <RouterLink to="/password-reset" class="text-cyan-500 hover:underline">
          Forgot password?
        </RouterLink>
        <RouterLink
          v-if="canRegister"
          to="/register"
          class="text-cyan-500 hover:underline"
        >
          Create an account
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

useHeadSafe({ title: 'Log In' });

const api = useTokenStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

const canRegister = computed(
  () => api.hasPrivilege('user_create_self') || api.hasPrivilege('user_create_any'),
);

async function submit() {
  errorMsg.value = '';
  loading.value = true;
  const result = await api.login(username.value, password.value);
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  router.push(redirect);
}
</script>
