<template>
  <div class="flex items-start justify-center pt-8">
    <div class="w-full max-w-sm card p-6">
      <h1 class="text-2xl font-semibold mb-6 text-center">Log In</h1>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-username">Username</label>
          <FormInput
            id="login-username"
            v-model="username"
            class="w-full"
            autocomplete="username"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-password">Password</label>
          <FormInput
            id="login-password"
            v-model="password"
            type="password"
            class="w-full"
            autocomplete="current-password"
            required
          />
        </div>

        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input v-model="remember" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          Remember me
        </label>

        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

        <button
          type="submit"
          class="w-full py-2 bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default flex items-center justify-center gap-2"
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
        <RouterLink v-if="canRegister" to="/register" class="text-cyan-500 hover:underline">
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
import FormInput from '@/components/FormInput.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const api = useTokenStore();
const router = useRouter();
const route = useRoute();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Log In',
}));

const username = ref('');
const password = ref('');
const remember = ref(true);
const errorMsg = ref('');
const loading = ref(false);

const canRegister = computed(
  () => api.hasPrivilege('user_create_self') || api.hasPrivilege('user_create_any'),
);

async function submit() {
  errorMsg.value = '';
  loading.value = true;
  const result = await api.login(username.value, password.value, remember.value);
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  router.push(redirect);
}
</script>
