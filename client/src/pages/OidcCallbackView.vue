<template>
  <!-- Center but not middle -->
  <div class="flex items-start justify-center pt-8"></div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { useTokenStore, type ErrorResponse } from '@/stores/api';
import { useHeadSafe } from '@unhead/vue';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const api = useTokenStore();
const router = useRouter();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe({ title: serverName.value + ' - Log In' });

onMounted(() => {
  const code = router.currentRoute.value.query.code as string;
  const state = router.currentRoute.value.query.state as string;
  const savedState = sessionStorage.getItem('oidc_state');
  const provider = sessionStorage.getItem('oidc_provider');

  sessionStorage.removeItem('oidc_state');
  sessionStorage.removeItem('oidc_provider');

  if (!provider || !code || !state || state !== savedState) {
    // go to login page + show toast
    router.replace('/login');
    toast.showError('OIDC login failed: invalid or missing state');
    return;
  }

  api
    .oidcCallback(provider, code, state)
    .then((resp) => {
      if (!resp.success) {
        // propagate
        return {
          success: false,
          description: (resp as ErrorResponse).description || (resp as ErrorResponse).title,
        };
      }
      return api.loginWithToken(resp.data.user, resp.data.token, true);
    })
    .then((state) => {
      if (state.success) {
        router.replace('/');
        toast.showInfo('Successfully logged in.');
      } else {
        router.replace('/login');
        toast.showError(state.description);
      }
    })
    .catch((error) => {
      router.replace('/login');
      toast.showError(`OIDC login failed: ${error?.message ?? 'unknown error'}`);
    });
});
</script>
