<template>
  <div :class="`flex flex-row ${$props.class || ''}`">
    <SearchBox
      :placeholder="$props.placeholder"
      :class="$props.inputClass"
      @input="(text) => (currentValue = text)"
      @submit="submit"
    />
    <BlueButton class="ml-2 hidden md:block" @click="submit">
      <slot />
    </BlueButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SearchBox from './SearchBox.vue';
import { useRouter } from 'vue-router';
import BlueButton from './BlueButton.vue';

const props = defineProps<{
  target: 'posts' | 'tags' | 'pools';
  inputClass?: string;
  class?: string;
  placeholder?: string;
  overrideSubmit?: boolean;
}>();

const emits = defineEmits<{
  submit: [];
}>();

const router = useRouter();
const currentValue = ref('');

function submit() {
  if (props.overrideSubmit) {
    emits('submit');
    return;
  }
  // Go to the target page with the current value as a query parameter
  // For example, if target is "/posts", navigate to "/posts?query=currentValue"
  // get from router name
  router.push({
    name: props.target,
    query: { query: currentValue.value },
  });
}
</script>
