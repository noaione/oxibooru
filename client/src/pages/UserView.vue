<template>
  <div v-if="!apiReady" class="flex items-center justify-center pt-16">
    <LoadingSpinner size="lg" />
  </div>

  <div v-else-if="loadError" class="flex items-start justify-center pt-8">
    <div class="w-full max-w-lg">
      <p class="text-red-500">{{ loadError }}</p>
    </div>
  </div>

  <div v-else-if="userData" class="flex flex-col gap-6">
    <!-- Page header + tab nav -->
    <div>
      <h1 class="text-2xl font-semibold mb-3">{{ userData.name }}</h1>
      <nav class="flex gap-1 border-b border-gray-300 dark:border-gray-600">
        <RouterLink
          :to="`/user/${userName}`"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="section === 'summary' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent opacity-70 hover:opacity-100'"
        >
          Summary
        </RouterLink>
        <RouterLink
          v-if="canEditAnything"
          :to="`/user/${userName}/edit`"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="section === 'edit' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent opacity-70 hover:opacity-100'"
        >
          Settings
        </RouterLink>
        <RouterLink
          v-if="canListTokens"
          :to="`/user/${userName}/tokens`"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="section === 'tokens' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent opacity-70 hover:opacity-100'"
        >
          Login tokens
        </RouterLink>
        <RouterLink
          v-if="canDelete"
          :to="`/user/${userName}/delete`"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="section === 'delete' ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400' : 'border-transparent opacity-70 hover:opacity-100'"
        >
          Delete
        </RouterLink>
      </nav>
    </div>

    <!-- ── Summary ───────────────────────────────────────────────── -->
    <div v-if="section === 'summary'" class="flex flex-col sm:flex-row gap-6">
      <!-- Avatar -->
      <div class="shrink-0">
        <img
          v-if="userData.avatarUrl"
          :src="userData.avatarUrl"
          :alt="userData.name"
          class="w-24 h-24 object-cover"
        />
        <div
          v-else
          class="w-24 h-24 flex items-center justify-center overlay-color border border-gray-300 dark:border-gray-600 text-2xl font-bold"
        >
          {{ userData.name?.[0]?.toUpperCase() }}
        </div>
      </div>

      <!-- Info + links -->
      <div class="flex flex-col gap-4">
        <ul class="text-sm flex flex-col gap-1">
          <li><span class="text-gray-500">Registered:</span> {{ formatDate(userData.creationTime) }}</li>
          <li><span class="text-gray-500">Last seen:</span> {{ formatDate(userData.lastLoginTime) }}</li>
          <li><span class="text-gray-500">Rank:</span> {{ rankNames.get(userData.rank ?? '') ?? userData.rank }}</li>
        </ul>

        <div class="flex flex-col gap-3">
          <div>
            <p class="text-sm font-medium mb-1">Quick links</p>
            <ul class="text-sm flex flex-col gap-0.5">
              <li>
                <RouterLink :to="`/posts?query=submit:${userName}`" class="text-cyan-500 hover:underline">
                  {{ userData.uploadedPostCount ?? 0 }} uploads
                </RouterLink>
              </li>
              <li>
                <RouterLink :to="`/posts?query=fav:${userName}`" class="text-cyan-500 hover:underline">
                  {{ userData.favoritePostCount ?? 0 }} favorites
                </RouterLink>
              </li>
              <li>
                <RouterLink :to="`/posts?query=comment:${userName}`" class="text-cyan-500 hover:underline">
                  {{ userData.commentCount ?? 0 }} comments
                </RouterLink>
              </li>
            </ul>
          </div>

          <div v-if="isOwnProfile && typeof userData.likedPostCount === 'number'">
            <p class="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">Only visible to you</p>
            <ul class="text-sm flex flex-col gap-0.5">
              <li>
                <RouterLink to="/posts?query=special:liked" class="text-cyan-500 hover:underline">
                  {{ userData.likedPostCount }} liked posts
                </RouterLink>
              </li>
              <li>
                <RouterLink to="/posts?query=special:disliked" class="text-cyan-500 hover:underline">
                  {{ userData.dislikedPostCount }} disliked posts
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit / Settings ───────────────────────────────────────── -->
    <div v-else-if="section === 'edit'" class="w-full max-w-sm">
      <form class="flex flex-col gap-4" autocomplete="off" @submit.prevent="submitEdit">
        <input class="hidden" type="text" name="fakeuser" tabindex="-1" />
        <input class="hidden" type="password" name="fakepass" tabindex="-1" />

        <div v-if="canEditName" class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="ue-name">Username</label>
          <FormInput id="ue-name" v-model="editName" class="w-full" autocomplete="off" />
        </div>

        <div v-if="canEditPassword" class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="ue-password">
            Password
            <span class="text-gray-400 font-normal ml-1 text-xs">leave blank to keep current</span>
          </label>
          <FormInput id="ue-password" v-model="editPassword" type="password" class="w-full" autocomplete="new-password" />
        </div>

        <div v-if="canEditEmail" class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="ue-email">Email</label>
          <FormInput id="ue-email" v-model="editEmail" type="email" class="w-full" autocomplete="off" />
        </div>

        <div v-if="canEditRank" class="flex flex-col gap-1">
          <label class="text-sm font-medium" for="ue-rank">Rank</label>
          <select
            id="ue-rank"
            v-model="editRank"
            class="px-2 py-1 overlay-color border-2 border-gray-200 dark:border-gray-700 outline-0 focus:border-cyan-500 transition-colors"
          >
            <option v-for="[key, label] in availableRanks" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <div v-if="canEditAvatar" class="flex flex-col gap-1">
          <span class="text-sm font-medium">Avatar</span>
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="editAvatarStyle" type="radio" value="gravatar" class="accent-cyan-500" />
              Gravatar
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="editAvatarStyle" type="radio" value="manual" class="accent-cyan-500" />
              Manual avatar
            </label>
            <input
              v-if="editAvatarStyle === 'manual'"
              ref="avatarFileInput"
              type="file"
              accept="image/*"
              class="text-sm"
              @change="onAvatarFile"
            />
          </div>
        </div>

        <p v-if="editError" class="text-sm text-red-500">{{ editError }}</p>
        <p v-if="editSuccess" class="text-sm text-green-600 dark:text-green-400">{{ editSuccess }}</p>

        <button
          type="submit"
          class="w-full py-2 bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          :disabled="editLoading"
        >
          <LoadingSpinner v-if="editLoading" size="sm" />
          Save settings
        </button>
      </form>
    </div>

    <!-- ── Tokens ────────────────────────────────────────────────── -->
    <div v-else-if="section === 'tokens'" class="flex flex-col gap-6 w-full max-w-2xl">
      <!-- Token list -->
      <div v-if="tokens.length > 0" class="flex flex-col gap-4">
        <div
          v-for="(tok, idx) in tokens"
          :key="tok.token"
          class="flex flex-col gap-2 p-3 border border-gray-300 dark:border-gray-600"
        >
          <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <span class="text-gray-500">Token:</span>
            <span class="font-mono break-all">{{ tok.token }}</span>
            <span class="text-gray-500">Note:</span>
            <div class="flex items-center gap-2">
              <template v-if="editingNoteIdx === idx">
                <FormInput v-model="editingNoteValue" class="flex-1 text-sm" @submit="saveNote(idx)" />
                <button class="text-sm text-cyan-500 hover:underline" @click="saveNote(idx)">Save</button>
                <button class="text-sm opacity-60 hover:opacity-100" @click="editingNoteIdx = -1">Cancel</button>
              </template>
              <template v-else>
                <span>{{ tok.note ?? 'No note' }}</span>
                <button
                  v-if="canEditToken"
                  class="text-xs text-cyan-500 hover:underline"
                  @click="startEditNote(idx)"
                >
                  (change)
                </button>
              </template>
            </div>
            <span class="text-gray-500">Created:</span>
            <span>{{ formatDate(tok.creationTime) }}</span>
            <span class="text-gray-500">Expires:</span>
            <span>{{ tok.expirationTime ? formatDate(tok.expirationTime) : 'No expiration' }}</span>
            <span class="text-gray-500">Last used:</span>
            <span>{{ formatDate(tok.lastUsageTime) }}</span>
          </div>
          <div v-if="canDeleteToken">
            <button
              class="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
              :disabled="tokenDeleteLoading === idx"
              @click="deleteToken(idx)"
            >
              <LoadingSpinner v-if="tokenDeleteLoading === idx" size="sm" class="inline mr-1" />
              {{ tok.token === api.userToken?.token ? 'Delete and logout' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-gray-500">No registered tokens.</p>

      <p v-if="tokenError" class="text-sm text-red-500">{{ tokenError }}</p>
      <p v-if="tokenSuccess" class="text-sm text-green-600 dark:text-green-400">{{ tokenSuccess }}</p>

      <!-- Create token form -->
      <div v-if="canCreateToken" class="border-t border-gray-300 dark:border-gray-600 pt-4">
        <h2 class="text-base font-medium mb-3">Create token</h2>
        <form class="flex flex-col gap-3 w-full max-w-sm" @submit.prevent="submitCreateToken">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="tok-note">Note</label>
            <FormInput id="tok-note" v-model="newTokenNote" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium" for="tok-expiry">
              Expires
              <span class="text-gray-400 font-normal ml-1 text-xs">optional, YYYY-MM-DD</span>
            </label>
            <FormInput id="tok-expiry" v-model="newTokenExpiry" class="w-full" placeholder="never" />
          </div>
          <button
            type="submit"
            class="w-full py-2 bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            :disabled="tokenCreateLoading"
          >
            <LoadingSpinner v-if="tokenCreateLoading" size="sm" />
            Create token
          </button>
        </form>
      </div>
    </div>

    <!-- ── Delete ────────────────────────────────────────────────── -->
    <div v-else-if="section === 'delete'" class="w-full max-w-sm">
      <form class="flex flex-col gap-4" @submit.prevent="submitDelete">
        <label class="flex items-start gap-2 text-sm cursor-pointer">
          <input
            v-model="deleteConfirm"
            type="checkbox"
            class="w-4 h-4 mt-0.5 accent-cyan-500 shrink-0"
            required
          />
          I confirm that I want to delete this account.
        </label>

        <p v-if="deleteError" class="text-sm text-red-500">{{ deleteError }}</p>

        <button
          type="submit"
          class="w-full py-2 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          :disabled="deleteLoading || !deleteConfirm"
        >
          <LoadingSpinner v-if="deleteLoading" size="sm" />
          Delete account
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import { useTokenStore, allRanks, rankNames } from '@/stores/api';
import type { UserInfo, AvatarStyle, UserRank } from '@/types/oxibooru.gen';
import FormInput from '@/components/FormInput.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const userName = computed(() => route.params.name as string);
const section = computed(() => {
  const name = route.name as string;
  if (name === 'user-edit') return 'edit';
  if (name === 'user-tokens') return 'tokens';
  if (name === 'user-delete') return 'delete';
  return 'summary';
});

useHeadSafe({ title: computed(() => `${serverName.value} - User ${userName.value}`) });

// ── Data ──────────────────────────────────────────────────────────
const apiReady = computed(() => api.ready);
const userData = ref<UserInfo | null>(null);
const loadError = ref('');

// ── Privilege helpers ────────────────────────────────────────────
const isOwnProfile = computed(() => api.userToken?.user === userName.value);
const infix = computed(() => (isOwnProfile.value ? 'self' : 'any'));

const canEditAnything = computed(() => api.hasPrivilege(`user_edit_${infix.value}`));
const canEditName = computed(() => api.hasPrivilege(`user_edit_${infix.value}_name`));
const canEditPassword = computed(() => api.hasPrivilege(`user_edit_${infix.value}_pass`));
const canEditEmail = computed(() => api.hasPrivilege(`user_edit_${infix.value}_email`));
const canEditRank = computed(() => api.hasPrivilege(`user_edit_${infix.value}_rank`));
const canEditAvatar = computed(() => api.hasPrivilege(`user_edit_${infix.value}_avatar`));
const canListTokens = computed(() => api.hasPrivilege(`user_token_list_${infix.value}`));
const canCreateToken = computed(() => api.hasPrivilege(`user_token_create_${infix.value}`));
const canEditToken = computed(() => api.hasPrivilege(`user_token_edit_${infix.value}`));
const canDeleteToken = computed(() => api.hasPrivilege(`user_token_delete_${infix.value}`));
const canDelete = computed(() => api.hasPrivilege(`user_delete_${infix.value}`));

const myRankIndex = computed(() => {
  const rank = api.user?.rank;
  return rank ? allRanks.indexOf(rank) : 0;
});

const availableRanks = computed(() => {
  return allRanks
    .filter((r, i) => r !== 'anonymous' && i <= myRankIndex.value)
    .map((r) => [r, rankNames.get(r) ?? r] as [string, string]);
});

// ── Edit section state ────────────────────────────────────────────
const editName = ref('');
const editPassword = ref('');
const editEmail = ref('');
const editRank = ref<UserRank>('regular');
const editAvatarStyle = ref<AvatarStyle>('gravatar');
const editAvatarFile = ref<File | null>(null);
const editError = ref('');
const editSuccess = ref('');
const editLoading = ref(false);
const avatarFileInput = ref<HTMLInputElement | null>(null);

function onAvatarFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  editAvatarFile.value = file;
}

// ── Token section state ──────────────────────────────────────────
type TokenItem = NonNullable<typeof tokens.value>[0];
const tokens = ref<TokenItem[]>([]);
const tokenError = ref('');
const tokenSuccess = ref('');
const tokenDeleteLoading = ref<number>(-1);
const tokenCreateLoading = ref(false);
const newTokenNote = ref('');
const newTokenExpiry = ref('');
const editingNoteIdx = ref(-1);
const editingNoteValue = ref('');

// ── Delete section state ─────────────────────────────────────────
const deleteConfirm = ref(false);
const deleteError = ref('');
const deleteLoading = ref(false);

// ── Load user data ────────────────────────────────────────────────
async function loadUser() {
  loadError.value = '';
  const result = await api.getUser(userName.value);
  if (!result.success) {
    loadError.value = result.description;
    return;
  }
  userData.value = result.data;
  editName.value = result.data.name ?? '';
  editEmail.value = typeof result.data.email === 'string' ? result.data.email : '';
  editRank.value = (result.data.rank ?? 'regular') as UserRank;
  editAvatarStyle.value = (result.data.avatarStyle ?? 'gravatar') as AvatarStyle;
}

async function loadTokens() {
  tokenError.value = '';
  const result = await api.getUserTokens(userName.value);
  if (!result.success) {
    tokenError.value = result.description;
    return;
  }
  tokens.value = result.data as typeof tokens.value;
}

onMounted(async () => {
  await loadUser();
  if (section.value === 'tokens') {
    await loadTokens();
  }
});

watch(section, async (s) => {
  if (s === 'tokens' && tokens.value.length === 0) {
    await loadTokens();
  }
});

watch(userName, async () => {
  userData.value = null;
  tokens.value = [];
  await loadUser();
});

// ── Edit submit ──────────────────────────────────────────────────
async function submitEdit() {
  editError.value = '';
  editSuccess.value = '';

  if (!userData.value?.version) return;

  const body: Record<string, unknown> = { version: userData.value.version };
  if (canEditName.value && editName.value.trim() && editName.value.trim() !== userData.value.name) {
    body.name = editName.value.trim();
  }
  if (canEditPassword.value && editPassword.value) {
    body.password = editPassword.value;
  }
  if (canEditEmail.value) {
    body.email = editEmail.value.trim() || null;
  }
  if (canEditRank.value) {
    body.rank = editRank.value;
  }
  if (canEditAvatar.value) {
    body.avatarStyle = editAvatarStyle.value;
  }

  editLoading.value = true;
  const result = await api.updateUser(
    userName.value,
    body as Parameters<typeof api.updateUser>[1],
    editAvatarStyle.value === 'manual' ? editAvatarFile.value : null,
  );
  editLoading.value = false;

  if (!result.success) {
    editError.value = result.description;
    return;
  }

  userData.value = result.data;
  editPassword.value = '';
  editAvatarFile.value = null;
  if (avatarFileInput.value) avatarFileInput.value.value = '';

  // If own username changed, navigate to new URL
  if (isOwnProfile.value && result.data.name && result.data.name !== userName.value) {
    router.replace(`/user/${result.data.name}/edit`);
  } else {
    editSuccess.value = 'Settings updated.';
  }
}

// ── Token actions ────────────────────────────────────────────────
function startEditNote(idx: number) {
  editingNoteIdx.value = idx;
  editingNoteValue.value = tokens.value[idx]?.note ?? '';
}

async function saveNote(idx: number) {
  const tok = tokens.value[idx];
  if (!tok?.token || !tok.version) return;
  const result = await api.updateUserToken(userName.value, tok.token, {
    version: tok.version,
    note: editingNoteValue.value || null,
  });
  if (!result.success) {
    tokenError.value = result.description;
    return;
  }
  tokens.value[idx] = { ...tok, note: editingNoteValue.value || null, version: result.data.version };
  editingNoteIdx.value = -1;
  tokenSuccess.value = 'Token updated.';
}

async function deleteToken(idx: number) {
  const tok = tokens.value[idx];
  if (!tok?.token) return;
  const isCurrentToken = tok.token === api.userToken?.token;
  tokenDeleteLoading.value = idx;
  const result = await api.deleteUserToken(userName.value, tok.token);
  tokenDeleteLoading.value = -1;
  if (!result.success) {
    tokenError.value = result.description;
    return;
  }
  if (isCurrentToken) {
    await api.logout();
    router.push('/');
    return;
  }
  tokens.value.splice(idx, 1);
  tokenSuccess.value = `Token deleted.`;
}

async function submitCreateToken() {
  tokenError.value = '';
  tokenSuccess.value = '';
  let expiry: string | null = null;
  if (newTokenExpiry.value.trim()) {
    const d = new Date(newTokenExpiry.value.trim());
    if (isNaN(d.getTime())) {
      tokenError.value = 'Invalid expiry date.';
      return;
    }
    expiry = d.toISOString();
  }
  tokenCreateLoading.value = true;
  const result = await api.createUserToken(userName.value, newTokenNote.value.trim() || undefined, expiry);
  tokenCreateLoading.value = false;
  if (!result.success) {
    tokenError.value = result.description;
    return;
  }
  newTokenNote.value = '';
  newTokenExpiry.value = '';
  tokenSuccess.value = `Token ${result.data.token} created.`;
  await loadTokens();
}

// ── Delete submit ────────────────────────────────────────────────
async function submitDelete() {
  if (!deleteConfirm.value || !userData.value?.version) return;
  deleteError.value = '';
  deleteLoading.value = true;
  const wasOwnProfile = isOwnProfile.value;
  const result = await api.deleteUser(userName.value, userData.value.version);
  deleteLoading.value = false;
  if (!result.success) {
    deleteError.value = result.description;
    return;
  }
  if (wasOwnProfile) {
    await api.logout();
    router.push('/');
  } else if (api.hasPrivilege('user_list')) {
    router.push('/users');
  } else {
    router.push('/');
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function formatDate(iso?: string | null) {
  if (!iso) return 'never';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>
