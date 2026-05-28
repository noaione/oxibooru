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
  <div>
    <RouterView />
  </div>
  <ToastNotification />
  <ConfirmDialog />
</template>
