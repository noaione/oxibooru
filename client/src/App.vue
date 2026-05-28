<script setup lang="ts">
import { RouterView } from 'vue-router';
import NavBar from './components/NavBar.vue';
import ToastNotification from './components/ToastNotification.vue';
import PageLoader from './components/PageLoader.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
</script>

<template>
  <PageLoader />
  <NavBar />
  <main class="px-6 py-6 md:px-8 md:py-8">
    <RouterView />
  </main>
  <ToastNotification />
  <ConfirmDialog />
</template>
