<template>
  <!-- Center but not middle -->
  <div v-if="app.ready" class="flex flex-col min-w-full max-w-full">
    <div class="flex flex-col md:flex-row w-full max-w-full">
      <AutoCompleteTag
        target="posts"
        class="items-center w-full max-w-full md:max-w-[30%]"
        input-class="w-full"
      />

      <!-- Tri-color safety toggle -->
      <div class="safety-rows ml-0 mt-2 md:mt-0 md:ml-2">
        <button
          class="border-2 border-green-600 dark:border-green-300 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-green-600 dark:bg-green-300': settings.listPosts.safe,
            'bg-transparent': !settings.listPosts.safe,
          }"
          @click="toggleSafety('safe')"
        />
        <button
          class="border-2 border-yellow-400 dark:border-yellow-200 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-yellow-400 dark:bg-yellow-200': settings.listPosts.sketchy,
            'bg-transparent': !settings.listPosts.sketchy,
          }"
          @click="toggleSafety('sketchy')"
        />
        <button
          class="border-red-400 dark:border-orange-300 border-2 h-auto w-8 aspect-square cursor-pointer"
          :class="{
            'bg-red-400 dark:bg-orange-300': settings.listPosts.unsafe,
            'bg-transparent': !settings.listPosts.unsafe,
          }"
          @click="toggleSafety('unsafe')"
        />

        <RouterLink
          to="/help/search?t=posts"
          class="self-center ml-2 text-gray-500 hover:brightness-110 w-max"
        >
          Syntax help
        </RouterLink>
      </div>

      <!-- Toggling mode -->
      <div class="flex flex-row gap-4 ml-0 mt-2 md:mt-0 md:ml-4 w-full items-center">
        <span v-if="massActiveState === 'tag'" class="text-gray-500">Tagging with: </span>
        <AutoCompleteTag
          v-if="massActiveState === 'tag'"
          target="posts"
          class="items-center w-full max-w-full md:max-w-[50%]"
          input-class="w-full"
          @submit="startMassTagging"
          override-submit
        >
          Start tagging
        </AutoCompleteTag>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'none'"
          v-if="massActiveState === 'tag'"
        >
          Stop tagging
        </button>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'none'"
          v-if="massActiveState === 'safety'"
        >
          Stop editing safety
        </button>
        <BlueButton v-if="massActiveState === 'delete'" @click="doDeletion">
          Delete selected posts
        </BlueButton>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'none'"
          v-if="massActiveState === 'delete'"
        >
          Stop deleting
        </button>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'tag'"
          v-if="massActiveState === 'none'"
        >
          Mass tag
        </button>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'safety'"
          v-if="massActiveState === 'none'"
        >
          Mass edit safety
        </button>
        <button
          class="self-center text-gray-500 hover:brightness-110"
          @click="massActiveState = 'delete'"
          v-if="massActiveState === 'none'"
        >
          Mass delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import BlueButton from '@/components/BlueButton.vue';
import { useTokenStore } from '@/stores/api';
import { useSettingsStore } from '@/stores/settings';
import { useHeadSafe } from '@unhead/vue';
import { computed, ref } from 'vue';

const app = useTokenStore();
const { settings } = useSettingsStore();
const serverName = computed(() => app.config?.config.name || 'Oxibooru');

const massTagText = ref('');
const lockedCurrentTag = ref('');
const massActiveState = ref<'tag' | 'safety' | 'delete' | 'none'>('none');

const deletionCandidate = ref<number[]>([]);

const toggleSafety = (mode: 'safe' | 'sketchy' | 'unsafe') => {
  switch (mode) {
    case 'safe':
      settings.listPosts.safe = !settings.listPosts.safe;
      break;
    case 'sketchy':
      settings.listPosts.sketchy = !settings.listPosts.sketchy;
      break;
    case 'unsafe':
      settings.listPosts.unsafe = !settings.listPosts.unsafe;
      break;
  }
};

function startMassTagging() {
  if (massTagText.value.trim() === '' && lockedCurrentTag.value === '') {
    return;
  }

  lockedCurrentTag.value = massTagText.value.trim();
}

function doDeletion() {
  console.log('Deleting posts with IDs:', deletionCandidate.value);
}

useHeadSafe(() => ({
  title: serverName.value + ' - Posts',
}));
</script>

<style lang="css">
.safety-rows {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(1, 1fr);
  gap: 0.5rem;
}
</style>
