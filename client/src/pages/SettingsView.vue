<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6">Settings</h1>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Content Filters
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.listPosts.safe" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Show safe posts</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.listPosts.sketchy" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Show sketchy posts</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.listPosts.unsafe" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Show unsafe posts</span>
        </label>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Appearance
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="s.darkTheme"
            type="checkbox"
            class="w-4 h-4 accent-cyan-500"
            @change="settingsStore.updateTheme(s.darkTheme)"
          />
          <span class="text-sm">Dark theme</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.transparencyGrid" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Show transparency grid behind images</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.upscaleSmallPosts" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Upscale small images to fit window</span>
        </label>
        <div class="flex items-center gap-3">
          <span class="text-sm">Image fit mode</span>
          <FlatSelect v-model="s.fitMode" class="text-sm px-2 py-1">
            <option value="fit-both">Fit to window</option>
            <option value="fit-height">Fit height</option>
            <option value="fit-original">Original size</option>
          </FlatSelect>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Browsing
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.endlessScroll" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Endless scroll (instead of pagination)</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.postFlow" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Flow layout for posts</span>
        </label>
        <div class="flex items-center gap-3">
          <span class="text-sm">Posts per page</span>
          <FlatInput
            v-model.number="s.postsPerPage"
            type="number"
            min="1"
            max="200"
            class="w-20 text-sm px-2 py-1"
          />
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Tags
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.tagSuggestions" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Show tag autocomplete suggestions</span>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="s.tagUnderscoresAsSpaces"
            type="checkbox"
            class="w-4 h-4 accent-cyan-500"
          />
          <span class="text-sm">Display underscores as spaces in tag names</span>
        </label>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Video
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.autoplayVideos" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Autoplay videos</span>
        </label>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-base font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">
        Keyboard
      </h2>
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="s.keyboardShortcuts" type="checkbox" class="w-4 h-4 accent-cyan-500" />
          <span class="text-sm">Enable keyboard shortcuts</span>
        </label>
      </div>
    </section>

    <p class="text-xs text-gray-500 dark:text-gray-400">
      Settings are saved automatically to your browser.
    </p>
  </div>
</template>

<script setup lang="ts">
import FlatInput from '@/components/FlatInput.vue';
import FlatSelect from '@/components/FlatSelect.vue';
import { useTokenStore } from '@/stores/api';
import { useSettingsStore } from '@/stores/settings';
import { useHeadSafe } from '@unhead/vue';
import { computed } from 'vue';

const api = useTokenStore();
const settingsStore = useSettingsStore();
const s = computed(() => settingsStore.settings);

const serverName = computed(() => api.config?.config.name || 'Oxibooru');

useHeadSafe(() => ({
  title: serverName.value + ' - Settings',
}));
</script>
