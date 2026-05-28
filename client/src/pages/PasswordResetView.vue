<template>
  <div class="flex items-start justify-center pt-8">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-semibold mb-6 text-center">Password Reset</h1>

      <!-- Step 1: request reset -->
      <template v-if="!token">
        <p class="text-sm text-gray-500 mb-4">
          Enter your username or email. If it exists, you'll receive a reset link.
        </p>

        <form v-if="!requestSent" class="flex flex-col gap-4" @submit.prevent="submitRequest">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="pr-identifier">Username or Email</label>
            <input
              id="pr-identifier"
              v-model="identifier"
              type="text"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

          <button
            type="submit"
            class="w-full py-2 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            :disabled="loading"
          >
            <LoadingSpinner v-if="loading" size="sm" />
            Send Reset Link
          </button>
        </form>

        <p v-else class="text-sm text-green-600 dark:text-green-400">
          If that account exists, a reset link has been sent. Check your email.
        </p>
      </template>

      <!-- Step 2: confirm reset (token in URL) -->
      <template v-else>
        <p class="text-sm text-gray-500 mb-4">Enter your new password.</p>

        <form v-if="!resetDone" class="flex flex-col gap-4" @submit.prevent="submitConfirm">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="pr-identifier2">Username</label>
            <input
              id="pr-identifier2"
              v-model="identifier"
              type="text"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="username"
              required
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="pr-new-password">New Password</label>
            <input
              id="pr-new-password"
              v-model="newPassword"
              type="password"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="new-password"
              required
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="pr-confirm-password">Confirm Password</label>
            <input
              id="pr-confirm-password"
              v-model="confirmPassword"
              type="password"
              class="px-3 py-2 rounded overlay-color border-2 border-gray-300 dark:border-gray-600 outline-0 focus:border-cyan-500 transition-colors"
              autocomplete="new-password"
              required
            />
          </div>

          <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

          <button
            type="submit"
            class="w-full py-2 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            :disabled="loading"
          >
            <LoadingSpinner v-if="loading" size="sm" />
            Reset Password
          </button>
        </form>

        <div v-else class="flex flex-col gap-3 text-sm">
          <p class="text-green-600 dark:text-green-400">Password changed successfully.</p>
          <RouterLink to="/login" class="text-cyan-500 hover:underline">Log in</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

useHeadSafe({ title: 'Password Reset' });

const api = useTokenStore();
const route = useRoute();

const token = typeof route.query.token === 'string' ? route.query.token : null;
const identifier = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMsg = ref('');
const loading = ref(false);
const requestSent = ref(false);
const resetDone = ref(false);

async function submitRequest() {
  errorMsg.value = '';
  loading.value = true;
  const result = await api.requestPasswordReset(identifier.value.trim());
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }
  requestSent.value = true;
}

async function submitConfirm() {
  errorMsg.value = '';

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  const result = await api.confirmPasswordReset(identifier.value.trim(), token!, newPassword.value);
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }
  resetDone.value = true;
}
</script>
