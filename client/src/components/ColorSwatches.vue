<template>
  <!-- Light mode preview swatch -->
  <div class="flex flex-col items-start relative gap-0.5">
    <span class="text-[10px] text-gray-400">Light</span>
    <div class="flex flex-row relative cursor-pointer">
      <div
        class="size-8 border"
        :style="{ backgroundColor: derivedRgb, borderColor: derivedRgb }"
        title="Light mode"
        @click="isShow = !isShow"
      />
      <div
        class="size-8 border bg-[#F5F5F5] text-lg text-center align-middle"
        :style="{ color: derivedRgb, borderColor: derivedRgb }"
        title="Light mode"
        @click="isShow = !isShow"
      >
        A
      </div>
    </div>

    <Vue3ColorPicker
      v-if="isShow"
      v-model="derivedRgb"
      mode="solid"
      class="absolute top-14 z-50"
      type="RGBA"
      input-type="RGB"
      :show-color-list="false"
      :show-eye-drop="false"
      :show-input-menu="false"
      :show-input-set="false"
      :show-picker-mode="false"
      :show-alpha="true"
      :show-buttons="true"
      :disabled="disabled"
      @on-cancel="isShow = false"
      @on-change="[derivedRgb = $event]"
      @on-save="isShow = false"
    />
  </div>

  <div class="flex flex-col items-start relative gap-0.5">
    <span class="text-[10px] text-gray-400">Dark</span>
    <div class="flex flex-row relative cursor-pointer">
      <div
        class="size-8 border"
        :style="{ backgroundColor: derivedDarkMode, borderColor: derivedDarkMode }"
        title="Dark mode (derived)"
        @click="isShow = !isShow"
      />
      <div
        class="size-8 border bg-[#333333] text-lg text-center align-middle"
        :style="{ color: derivedDarkMode, borderColor: derivedDarkMode }"
        title="Dark mode (derived)"
        @click="isShow = !isShow"
      >
        A
      </div>
    </div>
  </div>

  <div class="flex flex-col items-start relative gap-0.5 grow">
    <label class="text-[10px] text-gray-400">Input</label>
    <FlatInput
      v-model="derivedRgb"
      type="text"
      class="flex-1 min-w-36 w-full px-2 py-1 text-sm font-mono bg-gray-50! dark:bg-gray-800!"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import { rgb as culoriRgb } from 'culori';
import { ref, computed } from 'vue';
import { Vue3ColorPicker } from '@cyhnkckali/vue3-color-picker';
import { mixinCssColorForDarkTheme } from '@/utils/colorama';
import FlatInput from './FlatInput.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue?: string;
  disabled?: boolean;
}>();

const emits = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isShow = ref(false);

const derivedRgb = computed({
  get: () => {
    console.log(props.modelValue);
    if (!props.modelValue) {
      return 'rgba(0,0,0,1)';
    }
    const color = culoriRgb(props.modelValue);
    console.log(color);
    if (!color) {
      return 'rgba(0,0,0,1)';
    }

    const { r, g, b, alpha } = color;

    // r, g, b is 0-1
    // we need to convert to 0-255
    const r256 = Math.round(r * 255);
    const g256 = Math.round(g * 255);
    const b256 = Math.round(b * 255);

    const alphaReal = Math.max(Math.min(1, alpha ?? 1), 0);
    return `rgba(${r256}, ${g256}, ${b256}, ${alphaReal})`;
  },
  set: (value) => {
    console.log(value);
    emits('update:modelValue', value);
  }
});

const derivedDarkMode = computed(() => {
  return mixinCssColorForDarkTheme(derivedRgb.value);
});
</script>
