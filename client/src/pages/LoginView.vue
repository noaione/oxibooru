<template>
  <div class="flex items-start justify-center pt-8">
    <div class="w-full max-w-sm card p-6">
      <h1 class="text-2xl font-semibold mb-6 text-center">Log In</h1>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-username">Username</label>
          <FlatInput
            id="login-username"
            v-model="username"
            class="w-full bg-gray-50! dark:bg-gray-800!"
            autocomplete="username"
            required
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="login-password">Password</label>
          <FlatInput
            id="login-password"
            v-model="password"
            type="password"
            class="w-full bg-gray-50! dark:bg-gray-800!"
            autocomplete="current-password"
            required
          />
        </div>

        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input v-model="remember" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          Remember me
        </label>

        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

        <FlatButton
          type="submit"
          class="flex items-center justify-center gap-2 w-fit"
          :disabled="loading"
        >
          <LoadingSpinner v-if="loading" size="sm" />
          Log In
        </FlatButton>
      </form>

      <div class="mt-4 text-sm text-center flex flex-col gap-1 w-fit">
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
import FlatInput from '@/components/FlatInput.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import FlatButton from '@/components/FlatButton.vue';

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
