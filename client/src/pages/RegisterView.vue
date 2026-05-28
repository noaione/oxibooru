<template>
  <div class="flex items-start justify-center pt-8">
    <!-- Registration disabled -->
    <template v-if="!canRegister">
      <div class="w-full max-w-sm card p-6">
        <h1 class="text-2xl font-semibold mb-4 text-center">Registration Disabled</h1>
        <p class="text-sm text-center text-gray-500">
          New account registration is not available on this server.
        </p>
      </div>
    </template>

    <!-- Registration form + info panel -->
    <template v-else>
      <div class="flex flex-col md:flex-row gap-8 w-full max-w-2xl card p-6">
        <!-- Form -->
        <div class="w-full md:w-80 shrink-0">
          <h1 class="text-2xl font-semibold mb-6">Registration</h1>

          <form class="flex flex-col gap-4" autocomplete="off" @submit.prevent="submit">
            <!-- honeypots -->
            <input class="hidden" type="text" name="fakeuser" tabindex="-1" />
            <input class="hidden" type="password" name="fakepass" tabindex="-1" />

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium" for="reg-username">
                Username
                <span class="text-gray-400 font-normal ml-1 text-xs">letters, digits, _, -</span>
              </label>
              <FlatInput
                id="reg-username"
                v-model="username"
                class="w-full bg-gray-50! dark:bg-gray-800!"
                autocomplete="off"
                required
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium" for="reg-password">
                Password
                <span class="text-gray-400 font-normal ml-1 text-xs">5+ characters</span>
              </label>
              <FlatInput
                id="reg-password"
                v-model="password"
                type="password"
                class="w-full bg-gray-50! dark:bg-gray-800!"
                autocomplete="new-password"
                required
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium" for="reg-confirm">Confirm Password</label>
              <FlatInput
                id="reg-confirm"
                v-model="passwordConfirm"
                type="password"
                class="w-full bg-gray-50! dark:bg-gray-800!"
                autocomplete="new-password"
                required
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium" for="reg-email">
                Email
                <span class="text-gray-400 font-normal ml-1 text-xs">optional</span>
              </label>
              <FlatInput
                id="reg-email"
                v-model="email"
                type="email"
                class="w-full bg-gray-50! dark:bg-gray-800!"
                autocomplete="off"
                placeholder="used for password reset & Gravatar"
              />
            </div>

            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

            <FlatButton
              type="submit"
              class="w-full"
              :disabled="loading"
            >
              Create an account
            </FlatButton>
          </form>

          <div class="mt-4 text-sm text-center">
            <RouterLink to="/login" class="text-cyan-500 hover:underline">
              Already have an account?
            </RouterLink>
          </div>
        </div>

        <!-- Info panel -->
        <div class="text-sm leading-relaxed">
          <p class="font-medium mb-2">Registered users can:</p>
          <ul class="flex flex-col gap-1.5 mb-4">
            <li class="flex items-center gap-2">
              <UploadIcon :size="14" class="shrink-0 text-cyan-500" /> Upload new posts
            </li>
            <li class="flex items-center gap-2">
              <HeartIcon :size="14" class="shrink-0 text-cyan-500" /> Mark them as favorite
            </li>
            <li class="flex items-center gap-2">
              <MessageCircleIcon :size="14" class="shrink-0 text-cyan-500" /> Add comments
            </li>
            <li class="flex items-center gap-2">
              <StarIcon :size="14" class="shrink-0 text-cyan-500" /> Vote on posts and comments
            </li>
          </ul>
          <hr class="border-gray-300 dark:border-gray-600 mb-4" />
          <p class="text-gray-500 dark:text-gray-400">
            By creating an account you agree to the
            <RouterLink to="/help/tos" class="text-cyan-500 hover:underline">Terms of Service</RouterLink>.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTokenStore } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import {
  Upload as UploadIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Star as StarIcon,
} from '@lucide/vue';
import FlatInput from '@/components/FlatInput.vue';
import FlatButton from '@/components/FlatButton.vue';

const api = useTokenStore();
const router = useRouter();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Register',
}));

const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const email = ref('');
const errorMsg = ref('');
const loading = ref(false);

const canRegister = computed(
  () => api.hasPrivilege('user_create_self') || api.hasPrivilege('user_create_any'),
);

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
  const result = await api.register(username.value.trim(), password.value, email.value);
  loading.value = false;

  if (!result.success) {
    errorMsg.value = result.description;
    return;
  }

  router.push('/');
}
</script>
