import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

interface Settings {
  keyboardShortcuts: boolean;
  postsPerPage: number;
  darkTheme: boolean;
  upscaleSmallPosts: boolean;
  endlessScroll: boolean;
  postFlow: boolean;
  transparencyGrid: boolean;
  tagSuggestions: boolean;
  autoplayVideos: boolean;
  tagUnderscoresAsSpaces: boolean;
  fitMode: 'fit-both' | 'fit-original' | 'fit-height';
  listPosts: {
    safe: boolean;
    sketchy: boolean;
    unsafe: boolean;
  };
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    listPosts: {
      safe: true,
      sketchy: true,
      unsafe: false,
    },
    upscaleSmallPosts: false,
    endlessScroll: false,
    keyboardShortcuts: true,
    transparencyGrid: true,
    fitMode: 'fit-both',
    tagSuggestions: true,
    autoplayVideos: false,
    postsPerPage: 42,
    tagUnderscoresAsSpaces: false,
    darkTheme: false,
    postFlow: false,
  });
  const ready = ref(false);
  const isNew = ref(true);

  // on app start, load settings from localStorage if they exist
  function init() {
    const savedSettings = localStorage.getItem('settings')

    if (savedSettings) {
      try {
        const parsedJson = JSON.parse(savedSettings)

        settings.value = {
          ...settings.value,
          ...parsedJson,
        }

        isNew.value = false
      } catch (e) {
        console.error('Failed to parse settings from localStorage:', e)
      }
    }

    console.log('Settings loaded:', settings.value)

    ready.value = true
  }

  // Watch for changes to settings and save to localStorage
  watch(
    () => settings.value,
    (newSettings) => {
      if (!ready.value) {
        return;
      }
      console.log('Settings updated:', newSettings);
      try {
        localStorage.setItem('settings', JSON.stringify(newSettings));
      } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
      }
    },
    { immediate: true, deep: true },
  );

  const updateTheme = (dark: boolean) => {
    const body = document.body;
    if (dark) {
      body.classList.add('darktheme');
    } else {
      body.classList.remove('darktheme');
    }
    settings.value.darkTheme = dark;
  };

  return {
    ready,
    isNew,
    settings,
    init,
    updateTheme,
  };
});

export const useDarkTheme = () => {
  const isDark = ref(false);

  function init() {
    // add "darktheme" class to body if user prefers dark mode
    // also check localstorage
    if (localStorage.getItem('theme') === 'dark') {
      isDark.value = true;
    } else if (localStorage.getItem('theme') === 'light') {
      isDark.value = false;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark.value = true;
    } else {
      isDark.value = false;
    }
  }

  watch(
    () => isDark.value,
    (newValue) => {
      if (newValue) {
        document.body.classList.add('darktheme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('darktheme');
        localStorage.setItem('theme', 'light');
      }
    },
  );

  const toggleDark = () => {
    isDark.value = !isDark.value;
  };

  return {
    isDark,
    init,
    toggleDark,
  };
};
