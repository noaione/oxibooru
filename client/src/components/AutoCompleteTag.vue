<template>
  <!-- search mode: single input that navigates on submit -->
  <div v-if="mode === 'search'" class="relative flex flex-row" :class="props.class">
    <div class="relative flex-1">
      <input
        ref="searchInputEl"
        v-model="inputText"
        type="text"
        :placeholder="placeholder"
        :class="inputClass"
        class="w-full px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
        autocomplete="off"
        @input="onInput"
        @keydown="onKeyDown"
        @blur="closeDropdown"
        @focus="onFocusSearch"
      />
      <SuggestionDropdown
        v-if="showDropdown && suggestions.length"
        :suggestions="suggestions"
        :active-index="activeIndex"
        :underscore-as-spaces="settingsStore.settings.tagUnderscoresAsSpaces"
        :wrapper-class="$props.dropdownClass"
        @select="selectSuggestion"
      />
    </div>
    <FlatButton class="ml-2 hidden md:flex" @click="submitSearch">
      <slot name="submit">Search</slot>
    </FlatButton>
  </div>

  <!-- input mode: multi-value chip input, emits array -->
  <div
    v-else
    class="relative flex flex-wrap items-center gap-1 px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 focus-within:border-cyan-500 transition-colors cursor-text min-h-9"
    :class="props.class"
    @click="inputModeInputEl?.focus()"
  >
    <!-- Chips -->
    <span
      v-for="tag in modelValue"
      :key="tag"
      class="flex items-center gap-1 px-2 py-0.5 text-xs rounded border"
      :class="
        chipCategory(tag)
          ? ''
          : 'border-cyan-600 dark:border-cyan-500 text-cyan-700 dark:text-cyan-400'
      "
      :style="
        chipCategory(tag)
          ? {
              color: `var(--tag-cat-${chipCategory(tag)})`,
              borderColor: `var(--tag-cat-${chipCategory(tag)})`,
            }
          : {}
      "
    >
      {{ displayTag(tag) }}
      <button
        class="leading-none opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        type="button"
        @click.stop="removeTag(tag)"
      >
        ✕
      </button>
    </span>

    <!-- Inline text input -->
    <div class="relative flex-1 min-w-24">
      <input
        ref="inputModeInputEl"
        v-model="inputText"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        class="w-full bg-transparent outline-none text-sm"
        :class="inputClass"
        autocomplete="off"
        @input="onInput"
        @keydown="onKeyDown"
        @blur="closeDropdown"
      />
      <SuggestionDropdown
        v-if="showDropdown && suggestions.length"
        :suggestions="suggestions"
        :active-index="activeIndex"
        :underscore-as-spaces="settingsStore.settings.tagUnderscoresAsSpaces"
        :wrapper-class="$props.dropdownClass"
        @select="selectSuggestion"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useTokenStore } from '@/stores/api';
import { useSettingsStore } from '@/stores/settings';
import type { PagedResponseTagInfo } from '@/types/oxibooru.gen';
import SuggestionDropdown from './SuggestionDropdown.vue';
import FlatButton from './FlatButton.vue';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts.ts';

interface Suggestion {
  name: string;
  category: string;
  usages: number;
  implications: string[];
}

// tag name → category name, used to color chips
const localCategoryMap = ref<Map<string, string>>(new Map());

const props = withDefaults(
  defineProps<{
    mode?: 'search' | 'input';
    /** search mode: which route to navigate to */
    target?: 'posts' | 'tags' | 'pools';
    modelValue?: string[];
    placeholder?: string;
    class?: string;
    inputClass?: string;
    dropdownClass?: string;
    /** when true, emit 'submit' but skip router navigation */
    overrideSubmit?: boolean;
    /** when true, selecting a tag also adds its implied tags */
    includeImplications?: boolean;
    /** input mode: initial tag name → category name map for coloring chips */
    tagCategories?: Record<string, string>;
  }>(),
  {
    mode: 'search',
    target: 'posts',
    modelValue: () => [],
    placeholder: 'Search tags…',
    overrideSubmit: false,
    includeImplications: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [tags: string[]];
  submit: [query: string];
}>();

const router = useRouter();
const apiStore = useTokenStore();
const settingsStore = useSettingsStore();

const inputText = ref('');
const suggestions = ref<Suggestion[]>([]);
const showDropdown = ref(false);
const activeIndex = ref(-1);
const searchInputEl = ref<HTMLInputElement | null>(null);
const inputModeInputEl = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function displayTag(raw: string) {
  return settingsStore.settings.tagUnderscoresAsSpaces ? raw.replace(/_/g, ' ') : raw;
}

/**
 * In search mode, returns the word the cursor is currently on.
 * Strips a leading "-" (negation) before returning so it can be used for API search.
 * If the cursor is right after a space, returns '' (no active word).
 */
function getActiveWord(): string {
  const el = searchInputEl.value;
  if (!el) return '';
  const cursor = el.selectionStart ?? el.value.length;
  const textBeforeCursor = el.value.substring(0, cursor);
  // Last token after any whitespace / comma
  const match = textBeforeCursor.match(/(?:^|[\s,]+)(-?)([^\s,]*)$/);
  const word = match ? (match[2] ?? '') : '';
  return word;
}

function onInput() {
  activeIndex.value = -1;
  if (props.mode === 'search') {
    const term = getActiveWord();
    if (!term) {
      suggestions.value = [];
      showDropdown.value = false;
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(term), 200);
  } else {
    if (!inputText.value.trim()) {
      suggestions.value = [];
      showDropdown.value = false;
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(inputText.value.trim()), 200);
  }
}

function onFocusSearch() {
  const term = getActiveWord();
  if (term) fetchSuggestions(term);
}

async function fetchSuggestions(query: string) {
  const wrappedQuery = `*${query}* sort:usages`;
  const res = await apiStore.doFetch<PagedResponseTagInfo>(
    `/api/tags?query=${encodeURIComponent(wrappedQuery)}&limit=15`,
    {
      headers: apiStore.authToken ? { Authorization: apiStore.authToken } : {},
    },
  );
  if (!res.success) return;
  suggestions.value = (res.data.results ?? [])
    .map((t) => ({
      name: t.names?.[0] ?? '',
      category: t.category ?? 'default',
      usages: t.usages ?? 0,
      implications: (t.implications ?? []).map((impl) => impl.names[0] ?? '').filter(Boolean),
    }))
    .filter((s) => s.name && !props.modelValue.includes(s.name));
  // cache category for every result so chips can be colored later
  for (const s of suggestions.value) {
    if (s.name) localCategoryMap.value.set(s.name, s.category);
  }
  showDropdown.value = suggestions.value.length > 0;
}

function onKeyDown(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    if (!showDropdown.value) return;
    activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    if (!showDropdown.value) return;
    activeIndex.value = Math.max(activeIndex.value - 1, -1);
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (showDropdown.value && activeIndex.value >= 0) {
      selectSuggestion(suggestions.value[activeIndex.value]!);
    } else {
      commitInputText();
    }
  } else if (ev.key === 'Escape') {
    closeDropdown();
  } else if (ev.key === 'Backspace' && inputText.value === '' && props.mode === 'input') {
    const tags = [...props.modelValue];
    tags.pop();
    emit('update:modelValue', tags);
  }
}

function selectSuggestion(suggestion: Suggestion) {
  if (props.mode === 'search') {
    const el = searchInputEl.value;
    if (el) {
      const cursor = el.selectionStart ?? el.value.length;
      const value = el.value;
      const textBefore = value.substring(0, cursor);
      const textAfter = value.substring(cursor);

      // Split prefix (everything before the active word) + optional negation + active word
      const sepMatch = textBefore.match(/^((?:.*[\s,]+)?)(-?)([^\s,]*)$/s);
      const prefix = sepMatch?.[1] ?? '';
      const negation = sepMatch?.[2] ?? '';

      // Strip the partial word fragment from the tail (chars before the next space)
      const cleanSuffix = textAfter.replace(/^[^\s,]*/, '').trimStart();

      const implicationSuffix =
        props.includeImplications && !negation && suggestion.implications.length
          ? ' ' + suggestion.implications.join(' ')
          : '';
      const replacement = prefix + negation + suggestion.name + implicationSuffix + ' ';
      inputText.value = cleanSuffix ? replacement + cleanSuffix : replacement;

      const newCursor = replacement.length;
      nextTick(() => {
        el.setSelectionRange(newCursor, newCursor);
        el.focus();
      });
    } else {
      inputText.value = suggestion.name;
    }
    closeDropdown();
  } else {
    localCategoryMap.value.set(suggestion.name, suggestion.category);
    const existing = new Set(props.modelValue);
    const toAdd = [
      suggestion.name,
      ...(props.includeImplications ? suggestion.implications : []),
    ].filter(
      (t) => t && !existing.has(t),
    );
    if (toAdd.length) {
      emit('update:modelValue', [...props.modelValue, ...toAdd]);
    }
    inputText.value = '';
    closeDropdown();
  }
}

function chipCategory(tag: string): string | null {
  const cat = localCategoryMap.value.get(tag);
  return cat && cat !== 'default' ? cat : null;
}

function commitInputText() {
  const text = inputText.value.trim();
  if (!text) {
    if (props.mode === 'search') submitSearch();
    return;
  }
  if (props.mode === 'search') {
    submitSearch();
  } else {
    addTag(text);
    inputText.value = '';
    closeDropdown();
  }
}

function addTag(raw: string) {
  const tag = raw.replace(/ /g, '_').trim();
  if (!tag || props.modelValue.includes(tag)) return;
  emit('update:modelValue', [...props.modelValue, tag]);
}

function removeTag(tag: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t !== tag),
  );
}

function submitSearch() {
  closeDropdown();
  const query = inputText.value.trim();
  emit('submit', query);
  if (!props.overrideSubmit) {
    router.push({ name: props.target, query: { query } });
  }
}

function closeDropdown() {
  // small delay so click on suggestion registers before hiding
  setTimeout(() => {
    showDropdown.value = false;
    activeIndex.value = -1;
  }, 100);
}

useKeyboardShortcuts({
  Q: () => {
    // focus input
    searchInputEl.value?.focus();
  },
  T: () => {
    // edit mode focus
    inputModeInputEl.value?.focus();
  },
});

// seed category map from prop whenever it changes
watch(
  () => props.tagCategories,
  (cats) => {
    if (!cats) return;
    for (const [name, category] of Object.entries(cats)) {
      if (name && category) localCategoryMap.value.set(name, category);
    }
  },
  { immediate: true },
);

// keep input in sync when search mode value changes externally
watch(
  () => props.modelValue,
  (val) => {
    if (props.mode === 'search') {
      inputText.value = val.join(' ');
    }
  },
  { immediate: true },
);
</script>
