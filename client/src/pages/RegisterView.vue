<template>
  <div class="flex items-start justify-center pt-16 px-4">
    <div class="w-full max-w-sm">
      <!-- Registration disabled -->
      <template v-if="!canRegister">
        <h1 class="text-2xl font-semibold mb-4 text-center">Registration Disabled</h1>
        <p class="text-sm text-center text-gray-500">
          New account registration is not available on this server.
        </p>
      </template>

      <!-- Registration form -->
      <template v-else>
        <h1 class="text-2xl font-semibold mb-6 text-center">Create Account</h1>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="reg-username">Username</label>
            <input
              id="reg-username"
              v-model="username"
              type="text"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="username"
              required
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="reg-password">Password</label>
            <input
              id="reg-password"
              v-model="password"
              type="password"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="new-password"
              required
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              v-model="passwordConfirm"
              type="password"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="new-password"
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
            Register
          </button>
        </form>

        <div class="mt-4 text-sm text-center">
          <RouterLink to="/login" class="text-cyan-500 hover:underline">
            Already have an account?
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

useHeadSafe({ title: 'Register' });

const api = useTokenStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const errorMsg = ref('');
const loading = ref(false);

const canRegister = computed(() => api.hasPrivilege('users:create:self'));

async function submit() {
  errorMsg.value = '';

  if (!username.value.trim()) {
    errorMsg.value = 'Username is required.';
    return;
  }
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }
  if (password.value.length < 5) {
    errorMsg.value = 'Password must be at least 5 characters.';
    return;
  }

  loading.value = true;
  const result = await api.register(username.value.trim(), password.value);
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }

  router.push('/');
}
</script>
