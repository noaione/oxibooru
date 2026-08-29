<template>
  <!-- Error -->
  <div v-if="loadError" class="flex flex-col gap-2">
    <p class="text-red-500 dark:text-red-400">{{ loadError }}</p>
    <RouterLink to="/posts" class="text-sm text-cyan-500 hover:underline">Back to posts</RouterLink>
  </div>

  <!-- Post view -->
  <div
    v-else-if="post"
    ref="postViewRef"
    class="flex flex-col lg:flex-row gap-4 w-full"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <!-- ── Sidebar ────────────────────────────────────────────────── -->
    <aside class="w-full lg:w-74 shrink-0 flex flex-col gap-4 order-2 lg:order-1">
      <!-- Navigation: prev / next / edit -->
      <nav class="card p-3 flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <RouterLink
            v-if="prevPost"
            :to="neighborUrl(prevPost.id!)"
            class="flex items-center gap-1 text-sm text-cyan-500 hover:underline"
            rel="prev"
          >
            <ChevronLeftIcon :size="14" /> Previous
          </RouterLink>
          <span v-else class="text-sm text-gray-400 flex items-center gap-1">
            <ChevronLeftIcon :size="14" /> Previous
          </span>

          <RouterLink
            v-if="nextPost"
            :to="neighborUrl(nextPost.id!)"
            class="flex items-center gap-1 text-sm text-cyan-500 hover:underline"
            rel="next"
          >
            Next <ChevronRightIcon :size="14" />
          </RouterLink>
          <span v-else class="text-sm text-gray-400 flex items-center gap-1">
            Next <ChevronRightIcon :size="14" />
          </span>
        </div>

        <div class="flex flex-col w-fit gap-1 text-sm">
          <RouterLink
            v-if="isEditMode"
            :to="`/post/${post.id}`"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <EyeIcon :size="13" /> View post
          </RouterLink>
          <RouterLink
            v-else-if="canEditPost"
            :to="`/post/${post.id}/edit`"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <PencilIcon :size="13" /> Edit post
          </RouterLink>
          <RouterLink
            :to="backToListUrl"
            class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-cyan-500"
          >
            <ListIcon :size="13" /> Back to list
          </RouterLink>
        </div>
      </nav>

      <!-- ── Edit mode sidebar ──────────────────────────────────── -->
      <template v-if="isEditMode">
        <div class="card p-3 flex flex-col gap-3 text-sm">
          <!-- Error banner -->
          <p v-if="editError" class="text-red-500 dark:text-red-400 text-xs">{{ editError }}</p>

          <!-- Tags -->
          <section v-if="canEditPostTags" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
            >
              Tags
            </label>
            <AutoCompleteTag
              mode="input"
              v-model="editTags"
              :tag-categories="editTagCategories"
              include-implications
              placeholder="Add tags…"
              class="bg-gray-50! dark:bg-gray-800! py-2!"
              dropdown-class="bg-gray-50! dark:bg-gray-800!"
              input-class="bg-gray-50! dark:bg-gray-800!"
            />
          </section>

          <!-- Safety -->
          <section v-if="enableSafety && canEditPostSafety" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
            >
              Safety
            </label>
            <div class="flex gap-3">
              <label
                v-for="s in safetyOptions"
                :key="s.value"
                class="flex items-center gap-1 cursor-pointer"
                :class="editSafety === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400'"
              >
                <input v-model="editSafety" type="radio" :value="s.value" class="sr-only" />
                <span class="w-2 h-2 rounded-full" :class="s.dotClass" />
                {{ s.label }}
              </label>
            </div>
          </section>

          <!-- Source -->
          <section v-if="canEditPostSource" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
            >
              Source
            </label>
            <FlatTextarea
              v-model="editSource"
              rows="3"
              class="w-full px-2 py-1 text-xs resize-none bg-gray-50! dark:bg-gray-800!"
              placeholder="Source URL(s), one per line"
            />
          </section>

          <!-- Relations -->
          <section v-if="canEditPostRelations" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
              >Relations</label
            >
            <FlatInput
              v-model="editRelations"
              type="text"
              class="w-full px-2 py-1 text-xs bg-gray-50! dark:bg-gray-800!"
              placeholder="Space-separated post IDs"
            />
          </section>

          <!-- Flags (video only) -->
          <section v-if="post.type === 'video' && canEditPostFlags" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
            >
              Flags
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="editLoopFlag" type="checkbox" />
              Loop video
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input v-model="editSoundFlag" type="checkbox" />
              Has audio
            </label>
          </section>

          <!-- Description -->
          <section v-if="canEditPostDescription" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
              >Description</label
            >
            <FlatTextarea
              v-model="editDescription"
              rows="4"
              class="w-full px-2 py-1 text-xs resize-y bg-gray-50! dark:bg-gray-800!"
              placeholder="Markdown supported"
            />
          </section>

          <!-- Notes -->
          <section v-if="canEditPostNotes" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
            >
              Note
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ editNotes.length }} note{{ editNotes.length !== 1 ? 's' : '' }}
            </p>
            <FlatButton
              type="button"
              class="w-fit text-xs px-2 py-0.5"
              @click="notesEditorRef?.startDrawing()"
            >
              Add note
            </FlatButton>
          </section>

          <!-- Content replacement -->
          <section v-if="canEditPostContent" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
              >Replace content</label
            >
            <div
              class="border border-dashed bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600 p-2 text-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-500 transition-colors"
              @click="contentInputRef?.click()"
              @dragover.prevent
              @drop.prevent="
                (e) => {
                  editNewContent = (e as DragEvent).dataTransfer?.files[0] ?? null;
                }
              "
            >
              <input
                ref="contentInputRef"
                type="file"
                class="hidden"
                @change="
                  (e) => {
                    editNewContent = (e.target as HTMLInputElement).files?.[0] ?? null;
                    (e.target as HTMLInputElement).value = '';
                  }
                "
              />
              {{ editNewContent?.name || 'Click or drop to replace file' }}
            </div>
            <button
              v-if="editNewContent"
              type="button"
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 self-start cursor-pointer"
              @click="editNewContent = null"
            >
              Remove
            </button>
          </section>

          <!-- Thumbnail replacement -->
          <section v-if="canEditPostThumbnail" class="flex flex-col gap-1">
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
              >Replace thumbnail</label
            >
            <div
              class="border border-dashed bg-gray-50 dark:bg-gray-800 border-gray-400 dark:border-gray-600 p-2 text-center text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-500 transition-colors"
              @click="thumbnailInputRef?.click()"
              @dragover.prevent
              @drop.prevent="
                (e) => {
                  editNewThumbnail = (e as DragEvent).dataTransfer?.files[0] ?? null;
                }
              "
            >
              <input
                ref="thumbnailInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="
                  (e) => {
                    editNewThumbnail = (e.target as HTMLInputElement).files?.[0] ?? null;
                    (e.target as HTMLInputElement).value = '';
                  }
                "
              />
              {{ editNewThumbnail?.name || 'Click or drop to replace thumbnail' }}
            </div>
            <button
              v-if="editNewThumbnail"
              type="button"
              class="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 self-start cursor-pointer"
              @click="editNewThumbnail = null"
            >
              Remove
            </button>
          </section>

          <!-- Save button -->
          <FlatButton
            class="w-full py-1.5 text-sm font-medium"
            :disabled="editSaving"
            @click="savePost"
          >
            {{ editSaving ? 'Saving…' : 'Save' }}
          </FlatButton>

          <!-- Management -->
          <section
            v-if="canDeletePost || canMergePost || canFeaturePost"
            class="flex flex-col gap-2 pt-1 border-t border-gray-200 dark:border-gray-700"
          >
            <label
              class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
              >Management</label
            >

            <button
              v-if="canFeaturePost"
              type="button"
              class="text-xs text-left w-fit text-cyan-400 hover:text-cyan-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-cyan-400"
              :disabled="isCurrentlyFeatured"
              @click="featurePost"
            >
              {{ isCurrentlyFeatured ? 'Currently featured' : 'Feature this post on main page' }}
            </button>

            <div v-if="canMergePost" class="flex flex-col gap-1">
              <span class="text-xs text-gray-500 dark:text-gray-400">Merge with post #</span>
              <div class="flex gap-1">
                <FlatInput
                  v-model="editMergeTargetId"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="flex-1 px-2 py-0.5 text-xs bg-gray-50! dark:bg-gray-800!"
                  placeholder="Post ID"
                  @keydown.enter.prevent="goToMerge"
                />
                <FlatButton type="button" kind="warn" class="px-2! py-0! text-black! text-xs">
                  Go
                </FlatButton>
              </div>
            </div>

            <button
              v-if="canDeletePost"
              type="button"
              class="text-xs text-left text-red-500 dark:text-red-400 dark:hover:text-red-500 hover:text-red-600 cursor-pointer w-fit"
              @click="confirmDeletePost"
            >
              Delete this post
            </button>
          </section>
        </div>
      </template>

      <!-- ── View mode sidebar ──────────────────────────────────── -->
      <template v-else>
        <!-- Details card -->
        <div class="card p-3 flex flex-col gap-3 text-sm">
          <!-- Download -->
          <section class="flex flex-col gap-1">
            <a
              :href="resolveApiUrl(post.contentUrl)"
              download
              class="flex items-center gap-1.5 text-cyan-500 hover:underline font-medium w-fit"
            >
              <DownloadIcon :size="14" />
              {{ formatFileSize(post.fileSize) }}
              {{ mimeLabel(post.mimeType) }}
            </a>
            <span
              v-if="post.canvasWidth && post.canvasHeight"
              class="text-gray-500 dark:text-gray-400 text-xs"
            >
              {{ post.canvasWidth }}×{{ post.canvasHeight }}
              <span
                v-if="post.flags?.includes('loop')"
                class="text-gray-700 dark:text-gray-300"
                title="Loops"
              >
                <RepeatIcon :size="11" class="inline" />
              </span>
              <span
                v-if="post.flags?.includes('sound')"
                class="text-gray-700 dark:text-gray-300"
                title="Has audio"
              >
                <Volume2Icon :size="11" class="inline" />
              </span>
            </span>
          </section>

          <!-- Upload info -->
          <section class="text-gray-500 dark:text-gray-400 text-xs">
            <span>
              Uploaded by
              <AvatarLink
                :simple="!canViewUsers"
                :name="post.user?.name ?? 'anonymous'"
                :avatar-url="post.user?.avatarUrl"
              />
            </span>
            <span v-if="post.creationTime">, <RelativeTime :time="post.creationTime" /></span>
          </section>

          <!-- Safety -->
          <section v-if="enableSafety" class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" :class="safetyColor(post.safety)" />
            <span class="capitalize">{{ post.safety }}</span>
          </section>

          <!-- Fit mode -->
          <section class="flex gap-2 flex-wrap text-xs">
            <button
              v-for="mode in fitModes"
              :key="mode.value"
              class="cursor-pointer hover:text-cyan-500 transition-colors"
              :class="
                settings.fitMode === mode.value
                  ? 'text-cyan-500 font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              "
              @click="settings.fitMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </section>

          <!-- Source -->
          <section v-if="post.source" class="flex flex-col gap-0.5">
            <span class="text-gray-500 dark:text-gray-400 text-xs">Source:</span>
            <div class="flex flex-wrap gap-1 text-xs">
              <template v-for="(src, i) in sourceParts" :key="i">
                <span v-if="i > 0" class="text-gray-400">·</span>
                <a
                  :href="src"
                  :title="src"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-cyan-500 hover:underline truncate max-w-40"
                >
                  {{ extractDomain(src) }}
                </a>
              </template>
            </div>
          </section>

          <!-- External search -->
          <section class="flex flex-wrap gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Search on:</span>
            <a
              :href="`http://iqdb.org/?url=${encodeURIComponent(fullContentUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
              >IQDB</a
            >
            <span>·</span>
            <a
              v-if="post.checksumMD5"
              :href="`https://danbooru.donmai.us/posts?tags=md5:${post.checksumMD5}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
              >Danbooru</a
            >
            <span v-if="post.checksumMD5">·</span>
            <a
              :href="`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(fullContentUrl)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-cyan-500 hover:underline"
              >Google</a
            >
          </section>

          <!-- Score + Favorite -->
          <section class="flex items-center gap-3">
            <!-- Score -->
            <div class="flex items-center gap-1.5">
              <button
                class="cursor-pointer transition-colors"
                :class="
                  localOwnScore === 1 ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                "
                :disabled="!canScore"
                :title="canScore ? 'Upvote' : ''"
                @click="vote(1)"
              >
                <ThumbsUpIcon :size="15" />
              </button>
              <span class="font-medium text-sm tabular-nums">{{ localScore }}</span>
              <button
                class="cursor-pointer transition-colors"
                :class="
                  localOwnScore === -1
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                "
                :disabled="!canScore"
                :title="canScore ? 'Downvote' : ''"
                @click="vote(-1)"
              >
                <ThumbsDownIcon :size="15" />
              </button>
            </div>

            <!-- Favorite -->
            <button
              class="flex items-center gap-1 cursor-pointer transition-colors"
              :class="
                localOwnFavorite
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400'
              "
              :disabled="!canFavorite"
              :title="
                canFavorite ? (localOwnFavorite ? 'Remove from favorites' : 'Add to favorites') : ''
              "
              @click="toggleFavorite"
            >
              <HeartIcon :size="15" :fill="localOwnFavorite ? 'currentColor' : 'none'" />
              <span class="text-sm tabular-nums">{{ localFavoriteCount }}</span>
            </button>
          </section>
        </div>

        <!-- Relations -->
        <div v-if="post.relations?.length" class="card p-3 flex flex-col gap-2">
          <h2
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
          >
            Relations ({{ post.relations.length }})
          </h2>
          <div class="flex flex-wrap gap-1">
            <RouterLink
              v-for="rel in post.relations"
              :key="rel.id"
              :to="neighborUrl(rel.id)"
              class="block"
            >
              <img
                :src="resolveApiUrl(rel.thumbnailUrl)"
                :alt="`Post #${rel.id}`"
                class="w-16 h-16 object-cover hover:ring-2 hover:ring-cyan-500"
                loading="lazy"
              />
            </RouterLink>
          </div>
        </div>

        <!-- Tags -->
        <div class="card p-3 flex flex-col gap-2">
          <h2
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
          >
            Tags ({{ post.tags?.length ?? 0 }})
          </h2>
          <ul v-if="post.tags?.length" class="flex flex-col gap-1">
            <li
              v-for="tag in post.tags"
              :key="tag.names[0]"
              class="flex items-center gap-1 text-sm"
            >
              <RouterLink
                v-if="canViewTags"
                :to="`/tag/${tag.names[0]}`"
                class="shrink-0 hover:brightness-110"
                :style="{ color: `var(--tag-cat-${tag.category})` }"
              >
                <TagIcon :size="12" />
              </RouterLink>
              <RouterLink
                v-if="canListPosts"
                :to="{ path: '/posts', query: { query: tag.names[0] } }"
                class="hover:brightness-110 truncate"
                :style="{ color: `var(--tag-cat-${tag.category})` }"
              >
                {{ displayTagName(tag.names[0]) }}
              </RouterLink>
              <span v-else class="truncate" :style="{ color: `var(--tag-cat-${tag.category})` }">
                {{ displayTagName(tag.names[0]) }}
              </span>
              <span class="text-gray-400 text-xs ml-auto tabular-nums">{{ tag.usages }}</span>
            </li>
          </ul>
          <p v-else class="text-xs text-gray-500 dark:text-gray-400">
            No tags yet.
            <RouterLink
              v-if="canEditPost"
              :to="`/post/${post.id}/edit`"
              class="text-cyan-500 hover:underline"
            >
              Add some.
            </RouterLink>
          </p>
        </div>

        <!-- Pools -->
        <div v-if="post.pools?.length" class="card p-3 flex flex-col gap-2">
          <h2
            class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide"
          >
            Pools ({{ post.pools.length }})
          </h2>
          <ul class="flex flex-col gap-1 text-sm">
            <li v-for="pool in post.pools" :key="pool.id">
              <RouterLink
                :to="`/pool/${pool.id}`"
                class="text-cyan-500 hover:underline truncate block"
              >
                {{ pool.names?.[0] ?? `Pool #${pool.id}` }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </template>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────── -->
    <main class="flex-1 min-w-0 flex flex-col gap-4 order-1 lg:order-2">
      <!-- Content viewer -->
      <div
        class="flex items-start w-full"
        :class="{
          'overflow-hidden': settings.fitMode !== 'fit-original',
        }"
      >
        <!-- Image / Animation -->
        <div
          v-if="post.type === 'image' || post.type === 'animation'"
          ref="imgMediaWrapperRef"
          class="relative"
          :class="[mediaWrapperClass, { 'transparency-grid': settings.transparencyGrid }]"
        >
          <img
            ref="imgRef"
            :key="`image-${post.id}`"
            :src="resolveApiUrl(post.contentUrl)"
            :alt="`Post #${post.id}`"
            :width="post.canvasWidth || undefined"
            :height="post.canvasHeight || undefined"
            class="block"
            :class="fitClass"
            :style="{
              aspectRatio: `${post.canvasWidth ?? 1} / ${post.canvasHeight ?? 1}`,
            }"
            draggable="false"
          />
          <PostNotesOverlay
            v-if="!isEditMode && post.notes?.length"
            :notes="post.notes"
            :img-el="imgRef"
          />
        </div>

        <!-- Video -->
        <div
          v-else-if="post.type === 'video'"
          ref="videoMediaWrapperRef"
          class="relative"
          :class="[mediaWrapperClass, { 'transparency-grid': settings.transparencyGrid }]"
        >
          <video
            ref="videoRef"
            :key="`video-${post.id}`"
            :width="post.canvasWidth || undefined"
            :height="post.canvasHeight || undefined"
            :class="fitClass"
            :style="{
              aspectRatio: `${post.canvasWidth ?? 1} / ${post.canvasHeight ?? 1}`,
            }"
            controls
            playsinline
            :loop="post.flags?.includes('loop')"
            :autoplay="settings.autoplayVideos"
            :muted="settings.muteVideos"
          >
            <source :src="resolveApiUrl(post.contentUrl)" :type="post.mimeType" />
            Your browser does not support this video format.
          </video>
          <PostNotesOverlay
            v-if="!isEditMode && post.notes?.length"
            :notes="post.notes"
            :img-el="videoRef"
          />
        </div>

        <!-- Flash (Ruffle) -->
        <div
          v-else-if="post.type === 'flash'"
          ref="flashMediaWrapperRef"
          :key="`flash-${post.id}`"
          class="relative"
          :class="[mediaWrapperClass]"
        >
          <FlashPlayer
            :src="resolveApiUrl(post.contentUrl)!"
            :class="fitClass"
            :style="{
              aspectRatio: `${post.canvasWidth ?? 1} / ${post.canvasHeight ?? 1}`,
            }"
          />
          <PostNotesOverlay
            v-if="!isEditMode && post.notes?.length"
            :notes="post.notes"
            :img-el="flashMediaWrapperRef"
          />
        </div>

        <!-- Ugoira (animated ZIP) -->
        <div
          v-else-if="post.type === 'ugoira'"
          ref="ugoiraMediaWrapperRef"
          :key="`ugoira-${post.id}`"
          class="relative"
          :class="[mediaWrapperClass]"
        >
          <UgoiraPlayer
            ref="ugoiraPlayerRef"
            :src="resolveApiUrl(post.contentUrl)!"
            :class="fitClass"
            :click-to-play="!isEditMode"
            :style="{
              aspectRatio: `${post.canvasWidth ?? 1} / ${post.canvasHeight ?? 1}`,
            }"
          />
          <PostNotesOverlay
            v-if="!isEditMode && post.notes?.length"
            :notes="post.notes"
            :img-el="ugoiraPlayerRef?.canvas ?? null"
          />
        </div>
      </div>

      <!-- Notes editor (edit mode only) -->
      <PostNotesEditor
        v-if="isEditMode && canEditPostNotes"
        ref="notesEditorRef"
        :notes="editNotes"
        :img-el="imgRef ?? videoRef ?? flashMediaWrapperRef ?? ugoiraPlayerRef?.canvas ?? null"
        :overlay-container="activeMediaWrapper"
        @update="(n) => (editNotes = n)"
      />

      <!-- Description (view mode only) -->
      <div v-if="renderedDescription && !isEditMode" class="text-sm">
        <details open>
          <summary class="cursor-pointer font-medium mb-2">Description</summary>
          <div
            class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
            v-html="renderedDescription"
          />
        </details>
      </div>

      <!-- Comments (view mode only) -->
      <section v-if="!isEditMode" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Comments ({{ localComments.length }})
        </h2>

        <div v-if="localComments.length > 0" class="flex flex-col gap-4">
          <CommentItem
            v-for="comment in localComments"
            :key="comment.id"
            :comment="comment"
            @update="(c) => updateComment(c)"
            @delete="(id) => removeComment(id)"
          />
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>

        <!-- Create comment -->
        <div
          v-if="canCreateComment"
          class="flex flex-col gap-2 pt-1 border-t border-gray-200 dark:border-gray-700"
        >
          <!-- Write / Preview tabs -->
          <div class="flex gap-2 text-xs border-b border-gray-200 dark:border-gray-600">
            <button
              type="button"
              class="px-2 py-1 cursor-pointer transition-colors"
              :class="
                !newCommentPreview
                  ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              "
              @click="newCommentPreview = false"
            >
              Write
            </button>
            <button
              type="button"
              class="px-2 py-1 cursor-pointer transition-colors"
              :class="
                newCommentPreview
                  ? 'border-b-2 border-accent-500 text-accent-500 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              "
              @click="newCommentPreview = true"
            >
              Preview
            </button>
          </div>

          <FlatTextarea
            v-if="!newCommentPreview"
            v-model="newCommentText"
            rows="3"
            placeholder="Write a comment… (Markdown supported)"
            class="w-full text-sm"
          />
          <div
            v-else
            class="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 min-h-16 px-2 py-1.5 wrap-break-word"
            v-html="newCommentPreviewHtml"
          />

          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <FlatButton
                type="button"
                class="w-fit"
                :disabled="!newCommentText.trim() || submittingComment"
                @click="submitComment"
              >
                {{ submittingComment ? 'Posting…' : 'Post comment' }}
              </FlatButton>
              <RouterLink to="/help/comments" class="text-cyan-500 hover:underline text-sm">
                Help
              </RouterLink>
            </div>
            <span v-if="commentError" class="text-xs text-red-500 dark:text-red-400">
              {{ commentError }}
            </span>
          </div>
        </div>
        <p v-else-if="!api.userToken" class="text-sm text-gray-500 dark:text-gray-400">
          <RouterLink to="/login" class="text-cyan-500 hover:underline">Log in</RouterLink> to
          comment.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw, onMounted, onActivated, onDeactivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHeadSafe } from '@unhead/vue';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Download as DownloadIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  List as ListIcon,
  Pencil as PencilIcon,
  Repeat as RepeatIcon,
  Tag as TagIcon,
  ThumbsDown as ThumbsDownIcon,
  ThumbsUp as ThumbsUpIcon,
  Volume2 as Volume2Icon,
} from '@lucide/vue';
import { useTokenStore } from '@/stores/api';
import { useLoaderStore } from '@/stores/loader';
import { usePostCacheStore } from '@/stores/cache';
import { useSettingsStore } from '@/stores/settings';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import type {
  CommentInfo,
  Note,
  PostInfo,
  PostNeighbors,
  PostSafety,
  PostFlag,
  PostUpdateBody,
} from '@/types/oxibooru.gen';
import AutoCompleteTag from '@/components/AutoCompleteTag.vue';
import CommentItem from '@/components/CommentItem.vue';
import PostNotesOverlay from '@/components/PostNotesOverlay.vue';
import PostNotesEditor from '@/components/PostNotesEditor.vue';
import FlashPlayer from '@/components/FlashPlayer.vue';
import UgoiraPlayer from '@/components/UgoiraPlayer.vue';
import { renderMarkdown } from '@/utils/markdown';
import { resolveApiUrl } from '@/utils/url';
import FlatInput from '@/components/FlatInput.vue';
import FlatTextarea from '@/components/FlatTextarea.vue';
import FlatButton from '@/components/FlatButton.vue';
import AvatarLink from '@/components/AvatarLink.vue';
import RelativeTime from '@/components/RelativeTime.vue';

const route = useRoute();
const router = useRouter();
const api = useTokenStore();
const loader = useLoaderStore();
const { settings } = useSettingsStore();
const confirm = useConfirm();
const toast = useToast();
const serverName = computed(() => api.config?.config.name || 'Oxibooru');

const postId = computed(() => Number(route.params.id));
const contextQuery = computed(() => (route.query.query as string) ?? '');
const isEditMode = computed(() => route.name === 'post-edit');

const imgRef = ref<HTMLImageElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const ugoiraPlayerRef = ref<InstanceType<typeof UgoiraPlayer> | null>(null);

const post = ref<PostInfo | null>(null);
const neighbors = ref<PostNeighbors>({});
const loadError = ref('');

// ── Local interactive state ────────────────────────────────────
const localLoaded = ref(-1);
const localScore = ref(0);
const localOwnScore = ref(0);
const localOwnFavorite = ref(false);
const localFavoriteCount = ref(0);
const postCache = usePostCacheStore();

// ── Edit state ────────────────────────────────────────────────
const editTags = ref<string[]>([]);
const editSafety = ref<PostSafety>('safe');
const editSource = ref('');
const editRelations = ref('');
const editLoopFlag = ref(false);
const editSoundFlag = ref(false);
const editDescription = ref('');
const editNotes = ref<Note[]>([]);
const editNewContent = ref<File | null>(null);
const editNewThumbnail = ref<File | null>(null);
const editSaving = ref(false);
const editError = ref('');
const editMergeTargetId = ref('');
const contentInputRef = ref<HTMLInputElement | null>(null);
const thumbnailInputRef = ref<HTMLInputElement | null>(null);

// Media wrapper refs (for teleporting the notes SVG overlay)
const imgMediaWrapperRef = ref<HTMLDivElement | null>(null);
const videoMediaWrapperRef = ref<HTMLDivElement | null>(null);
const flashMediaWrapperRef = ref<HTMLDivElement | null>(null);
const ugoiraMediaWrapperRef = ref<HTMLDivElement | null>(null);
const activeMediaWrapper = computed(
  () =>
    imgMediaWrapperRef.value ??
    videoMediaWrapperRef.value ??
    flashMediaWrapperRef.value ??
    ugoiraMediaWrapperRef.value ??
    null,
);
// Ref to the notes editor component so the sidebar "Add note" button can call startDrawing()
const notesEditorRef = ref<InstanceType<typeof PostNotesEditor> | null>(null);

const editTagCategories = computed(() => {
  const map: Record<string, string> = {};
  for (const tag of post.value?.tags ?? []) {
    const name = tag.names[0];
    if (name) map[name] = tag.category;
  }
  return map;
});

function syncEditFields() {
  if (!post.value) return;
  editTags.value = post.value.tags?.map((t) => t.names[0] ?? '').filter(Boolean) ?? [];
  editSafety.value = post.value.safety ?? 'safe';
  editSource.value = post.value.source ?? '';
  editRelations.value = post.value.relations?.map((r) => r.id).join(' ') ?? '';
  editLoopFlag.value = post.value.flags?.includes('loop') ?? false;
  editSoundFlag.value = post.value.flags?.includes('sound') ?? false;
  editDescription.value = post.value.description ?? '';
  editNotes.value = structuredClone(toRaw(post.value.notes ?? []));
  editNewContent.value = null;
  editNewThumbnail.value = null;
  editError.value = '';
}

watch(post, (p) => {
  if (p) syncEditFields();
});

// ── Privileges ────────────────────────────────────────────────
const canViewUsers = computed(() => api.hasPrivilege('user_view'));
const canViewTags = computed(() => api.hasPrivilege('tag_view'));
const canListPosts = computed(() => api.hasPrivilege('post_list'));
const canEditPost = computed(() => api.hasPrivilege('post_edit'));
const canScore = computed(() => !!api.userToken && api.hasPrivilege('post_score'));
const canFavorite = computed(() => !!api.userToken && api.hasPrivilege('post_favorite'));
const canEditPostTags = computed(() => api.hasPrivilege('post_edit_tag'));
const canEditPostSafety = computed(() => api.hasPrivilege('post_edit_safety'));
const canEditPostSource = computed(() => api.hasPrivilege('post_edit_source'));
const canEditPostRelations = computed(() => api.hasPrivilege('post_edit_relation'));
const canEditPostFlags = computed(() => api.hasPrivilege('post_edit_flag'));
const canEditPostDescription = computed(() => api.hasPrivilege('post_edit_description'));
const canEditPostContent = computed(() => api.hasPrivilege('post_edit_content'));
const canEditPostThumbnail = computed(() => api.hasPrivilege('post_edit_thumbnail'));
const canEditPostNotes = computed(() => api.hasPrivilege('post_edit_note'));
const canDeletePost = computed(() => api.hasPrivilege('post_delete'));
const canMergePost = computed(() => api.hasPrivilege('post_merge'));
const canFeaturePost = computed(() => api.hasPrivilege('post_feature'));
const isCurrentlyFeatured = computed(
  () => api.config?.featuredPost?.id != null && api.config.featuredPost.id === post.value?.id,
);

const enableSafety = computed(() => api.config?.config.enableSafety ?? false);

// ── Safety options ────────────────────────────────────────────
const safetyOptions = [
  {
    value: 'safe' as const,
    label: 'Safe',
    dotClass: 'bg-green-500',
    activeClass: 'text-green-600 dark:text-green-400',
  },
  {
    value: 'sketchy' as const,
    label: 'Sketchy',
    dotClass: 'bg-yellow-400',
    activeClass: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    value: 'unsafe' as const,
    label: 'Unsafe',
    dotClass: 'bg-red-500',
    activeClass: 'text-red-600 dark:text-red-400',
  },
];

// ── Derived data ──────────────────────────────────────────────
const prevPost = computed(() => neighbors.value.prev ?? null);
const nextPost = computed(() => neighbors.value.next ?? null);

const backToListUrl = computed(() => {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  if (route.query.offset) q.offset = route.query.offset as string;
  return { path: '/posts', query: q };
});

function neighborUrl(id: number) {
  const q: Record<string, string> = {};
  if (route.query.query) q.query = route.query.query as string;
  const urlPath = isEditMode.value ? `/post/${id}/edit` : `/post/${id}`;
  return { path: urlPath, query: q };
}

const fullContentUrl = computed(() => resolveApiUrl(post.value?.contentUrl) ?? '');

const sourceParts = computed(() => {
  if (!post.value?.source) return [];
  return post.value.source.split(/\s+/).filter(Boolean);
});

function displayTagName(name: string | undefined): string {
  if (!name) return '';
  return settings.tagUnderscoresAsSpaces ? name.replace(/_/g, ' ') : name;
}

const fitModes = [
  { value: 'fit-both' as const, label: 'Fit both' },
  { value: 'fit-width' as const, label: 'Fit width' },
  { value: 'fit-height' as const, label: 'Fit height' },
  { value: 'fit-original' as const, label: 'Original' },
];

const fitClass = computed(() => {
  const upscale = settings.upscaleSmallPosts;
  switch (settings.fitMode) {
    case 'fit-original':
      return 'max-w-none max-h-none pr-4';
    case 'fit-height':
      return 'max-h-screen h-screen max-w-fit object-contain';
    case 'fit-width':
      return 'w-full h-auto object-contain';
    default:
      // fit-both: upscale forces full container width so small images stretch
      return upscale
        ? 'w-full max-h-screen object-contain'
        : 'max-w-full max-h-screen object-contain';
  }
});

const mediaWrapperClass = computed(() => {
  switch (settings.fitMode) {
    case 'fit-original':
      return 'self-start';
    case 'fit-height':
      return 'self-start';
    case 'fit-width':
      return 'w-full';
    default:
      return 'w-full'; // fit-both: fill width, let aspect-ratio constrain height
  }
});

const renderedDescription = computed(() => {
  const desc = post.value?.description;
  if (desc?.trim()) {
    return renderMarkdown(desc);
  }
  return null;
});

// ── Helpers ───────────────────────────────────────────────────
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

const MIME_LABELS: Record<string, string> = {
  'image/gif': 'GIF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/bmp': 'BMP',
  'image/avif': 'AVIF',
  'image/heif': 'HEIF',
  'image/heic': 'HEIC',
  'image/jxl': 'JXL',
  'video/webm': 'WEBM',
  'video/mp4': 'MPEG-4',
  'video/quicktime': 'MOV',
  'application/x-shockwave-flash': 'SWF',
  'application/vnd.adobe.flash.movie': 'SWF',
  'application/zip': 'ZIP',
};

function mimeLabel(mime?: string): string {
  return mime ? (MIME_LABELS[mime] ?? mime) : '';
}

function safetyColor(safety?: string): string {
  if (safety === 'safe') return 'bg-green-500';
  if (safety === 'sketchy') return 'bg-yellow-400';
  if (safety === 'unsafe') return 'bg-red-500';
  return 'bg-gray-400';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ── Interactions ──────────────────────────────────────────────
async function vote(score: 1 | -1) {
  if (!canScore.value || !post.value?.id) return;
  const newScore = localOwnScore.value === score ? 0 : score;
  const result = await api.ratePost(post.value.id, newScore);
  if (result.success) {
    localScore.value = result.data.score ?? localScore.value;
    localOwnScore.value = result.data.ownScore ?? 0;
  }
}

async function toggleFavorite() {
  if (!canFavorite.value || !post.value?.id) return;
  const result = localOwnFavorite.value
    ? await api.unfavoritePost(post.value.id)
    : await api.favoritePost(post.value.id);
  if (result.success) {
    localOwnFavorite.value = result.data.ownFavorite ?? !localOwnFavorite.value;
    localFavoriteCount.value = result.data.favoriteCount ?? localFavoriteCount.value;
  }
}

// ── Edit operations ───────────────────────────────────────────
async function savePost() {
  if (!post.value?.id || !post.value.version) return;
  editSaving.value = true;
  editError.value = '';

  const flags: PostFlag[] = [];
  if (editLoopFlag.value) flags.push('loop');
  if (editSoundFlag.value) flags.push('sound');

  const body: PostUpdateBody = {
    version: post.value.version,
    tags: editTags.value,
    safety: editSafety.value,
    source: editSource.value || null,
    relations: editRelations.value
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n)),
    flags,
    description: editDescription.value || null,
    notes: canEditPostNotes.value ? editNotes.value : undefined,
  };

  if (editNewContent.value) {
    const uploadResult = await api.uploadContent(editNewContent.value);
    if (!uploadResult.success) {
      editError.value = `Upload failed: ${uploadResult.description}`;
      editSaving.value = false;
      return;
    }
    body.contentToken = uploadResult.data.token;
  }

  if (editNewThumbnail.value) {
    const uploadResult = await api.uploadContent(editNewThumbnail.value);
    if (!uploadResult.success) {
      editError.value = `Thumbnail upload failed: ${uploadResult.description}`;
      editSaving.value = false;
      return;
    }
    body.thumbnailToken = uploadResult.data.token;
  }

  const result = await api.updatePost(post.value.id, body);
  editSaving.value = false;

  if (result.success) {
    postCache.setPost(result.data.id!, result.data);
    post.value = result.data;
    syncEditFields();
    toast.showSuccess('Post saved.');
  } else {
    editError.value = result.description;
  }
}

async function confirmDeletePost() {
  if (!post.value?.id || !post.value.version) return;
  const ok = await confirm.confirm({
    title: 'Delete post?',
    message: `Permanently delete Post #${post.value.id}? This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;

  const result = await api.deletePost(post.value.id, post.value.version);
  if (result.success) {
    postCache.invalidatePost(post.value.id!);
    toast.showSuccess(`Post #${post.value.id} deleted.`);
    router.push('/posts');
  } else {
    editError.value = result.description;
  }
}

function dispatchRefreshInfo() {
  api.refreshInfo().catch((err) => console.error('Failed to refresh info', err));
}

async function featurePost() {
  if (!post.value?.id) return;
  try {
    const result = await api.featurePost(post.value.id);
    if (result.success) {
      toast.showSuccess('Post featured.');
      dispatchRefreshInfo();
    } else {
      toast.showError(result.description);
    }
  } catch (err) {
    toast.showError((err as Error).message);
  }
}

function goToMerge() {
  const otherId = parseInt(editMergeTargetId.value.trim());
  if (!otherId || isNaN(otherId) || !post.value?.id) return;
  router.push(`/post/merge/${post.value.id}/${otherId}`);
}

// ── Comments ───────────────────────────────────────────────────
const localComments = ref<CommentInfo[]>([]);
const newCommentText = ref('');
const newCommentPreview = ref(false);
const submittingComment = ref(false);
const commentError = ref('');

const newCommentPreviewHtml = computed(() =>
  newCommentText.value ? renderMarkdown(newCommentText.value) : '',
);

const canCreateComment = computed(() => !!api.userToken && api.hasPrivilege('comment_create'));

function updateComment(updated: CommentInfo) {
  const idx = localComments.value.findIndex((c) => c.id === updated.id);
  if (idx !== -1) localComments.value[idx] = updated;
}

function removeComment(id: number) {
  localComments.value = localComments.value.filter((c) => c.id !== id);
}

async function submitComment() {
  if (!post.value?.id || !newCommentText.value.trim()) return;
  submittingComment.value = true;
  commentError.value = '';

  const result = await api.createComment({
    postId: post.value.id,
    text: newCommentText.value.trim(),
  });

  submittingComment.value = false;

  if (!result.success) {
    commentError.value = result.description;
    return;
  }

  localComments.value.push(result.data);
  newCommentText.value = '';
  newCommentPreview.value = false;
}

// ── Data loading ──────────────────────────────────────────────
async function refreshNeighborsOnly(id: number, force = false) {
  const result = await api.getPostNeighbors(id, contextQuery.value || undefined);
  if (result.success) {
    postCache.setNeighbors(id, result.data);
    if (force) {
      neighbors.value = result.data;
    }

    if (result.data.next?.id) {
      postCache.setPost(result.data.next.id, result.data.next);
    }
    if (result.data.prev?.id) {
      postCache.setPost(result.data.prev.id, result.data.prev);
    }
  }
}

async function lazyloadNeighbors(id: number) {
  const prevId = id + 1;
  const nextId = id - 1;
  const cached = postCache.getNeighbors(id);
  if (cached) {
    neighbors.value = cached;
    return;
  }
  const prevCache = postCache.getPost(prevId);
  const nextCache = postCache.getPost(nextId);
  if (prevCache && nextCache) {
    const neigh = {
      prev: prevCache,
      next: nextCache,
    };
    postCache.setNeighbors(id, neigh);
    neighbors.value = neigh;
    return;
  }
  await refreshNeighborsOnly(id, true);
}

async function loadPost(id: number) {
  if (Number.isNaN(id) || id <= 0) return;

  loadError.value = '';
  localLoaded.value = id;

  const cachedPage = postCache.getPost(id);
  if (cachedPage) {
    post.value = cachedPage;
    localScore.value = cachedPage.score ?? 0;
    localOwnScore.value = cachedPage.ownScore ?? 0;
    localOwnFavorite.value = cachedPage.ownFavorite ?? false;
    localFavoriteCount.value = cachedPage.favoriteCount ?? 0;
    localComments.value = cachedPage.comments ?? [];
    await lazyloadNeighbors(id);
    return;
  }

  // find in neighbors
  if (neighbors.value && neighbors.value.prev?.id === id) {
    post.value = neighbors.value.prev;
    localScore.value = neighbors.value.prev.score ?? 0;
    localOwnScore.value = neighbors.value.prev.ownScore ?? 0;
    localOwnFavorite.value = neighbors.value.prev.ownFavorite ?? false;
    localFavoriteCount.value = neighbors.value.prev.favoriteCount ?? 0;
    localComments.value = neighbors.value.prev.comments ?? [];
    await lazyloadNeighbors(neighbors.value.prev.id);
    return;
  } else if (neighbors.value && neighbors.value.next?.id === id) {
    post.value = neighbors.value.next;
    localScore.value = neighbors.value.next.score ?? 0;
    localOwnScore.value = neighbors.value.next.ownScore ?? 0;
    localOwnFavorite.value = neighbors.value.next.ownFavorite ?? false;
    localFavoriteCount.value = neighbors.value.next.favoriteCount ?? 0;
    localComments.value = neighbors.value.next.comments ?? [];
    await lazyloadNeighbors(neighbors.value.next.id);
    return;
  }

  loader.start();
  let postResult: Awaited<ReturnType<typeof api.getPost>>;
  let neighborsResult: Awaited<ReturnType<typeof api.getPostNeighbors>>;
  try {
    [postResult, neighborsResult] = await Promise.all([
      api.getPost(id),
      api.getPostNeighbors(id, contextQuery.value || undefined),
    ]);
  } catch (e) {
    postResult = { success: false, description: String(e) };
    neighborsResult = { success: false, description: String(e) };
  } finally {
    loader.done();
  }

  if (!postResult.success) {
    loadError.value = postResult.description;
    return;
  }

  postCache.setPost(id, postResult.data);
  post.value = postResult.data;
  localScore.value = postResult.data.score ?? 0;
  localOwnScore.value = postResult.data.ownScore ?? 0;
  localOwnFavorite.value = postResult.data.ownFavorite ?? false;
  localFavoriteCount.value = postResult.data.favoriteCount ?? 0;
  localComments.value = postResult.data.comments ?? [];

  if (neighborsResult.success) {
    neighbors.value = neighborsResult.data;
    postCache.setNeighbors(id, neighborsResult.data);

    if (neighborsResult.data.next?.id) {
      postCache.setPost(neighborsResult.data.next.id, neighborsResult.data.next);
      await refreshNeighborsOnly(neighborsResult.data.next.id);
    }
    if (neighborsResult.data.prev?.id) {
      postCache.setPost(neighborsResult.data.prev.id, neighborsResult.data.prev);
      await refreshNeighborsOnly(neighborsResult.data.prev.id);
    }
  }
}

onMounted(async () => {
  await loadPost(postId.value);
});

watch(
  () => postId.value,
  async (id) => {
    await loadPost(id);
  },
);

useHeadSafe(() => ({
  title: post.value ? `${serverName.value} - Post #${post.value.id}` : serverName.value + ' - Post',
}));

onActivated(() => loadPost(postId.value));

onDeactivated(() => {
  // we keep the local cache, but remove the post value
  post.value = null;
});

// ── Touch swipe navigation ───────────────────────────────────
const postViewRef = ref<HTMLElement | null>(null);
const touchStartX = ref(0);
const touchStartY = ref(0);
const EDGE_WIDTH = 60;
const SWIPE_THRESHOLD = 80;

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  if (!t) return;
  touchStartX.value = t.clientX;
  touchStartY.value = t.clientY;
}

function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0];
  if (!t) return;
  const dx = t.clientX - touchStartX.value;
  const dy = t.clientY - touchStartY.value;

  // Only trigger if primarily horizontal and exceeds threshold
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < 2 * Math.abs(dy)) return;

  // Only from edges
  const fromLeftEdge = touchStartX.value <= EDGE_WIDTH;
  const fromRightEdge = touchStartX.value >= window.innerWidth - EDGE_WIDTH;
  if (!fromLeftEdge && !fromRightEdge) return;

  if (dx < 0 && fromRightEdge && nextPost.value?.id != null) {
    // Swipe left from right edge → next
    router.push(neighborUrl(nextPost.value.id));
  } else if (dx > 0 && fromLeftEdge && prevPost.value?.id != null) {
    // Swipe right from left edge → previous
    router.push(neighborUrl(prevPost.value.id));
  }
}

useKeyboardShortcuts({
  ArrowLeft: () => {
    if (prevPost.value?.id != null) router.push(neighborUrl(prevPost.value.id));
  },
  ArrowRight: () => {
    if (nextPost.value?.id != null) router.push(neighborUrl(nextPost.value.id));
  },
  F: () => {
    if (!isEditMode.value) {
      // cycle post fit
      const current = settings.fitMode;
      const findIndex = fitModes.findIndex((mode) => mode.value === current);
      const next = fitModes[(findIndex + 1) % fitModes.length]?.value;
      if (next) {
        settings.fitMode = next;
      }
    }
  },
  f: () => {
    if (!isEditMode.value) toggleFavorite();
  },
  e: () => {
    if (!post.value) return;
    if (isEditMode.value) router.push(`/post/${post.value.id}`);
    else if (canEditPost.value) router.push(`/post/${post.value.id}/edit`);
  },
  a: () => {
    if (videoRef.value) {
      if (videoRef.value.paused) videoRef.value.play();
      else videoRef.value.pause();
    } else if (ugoiraPlayerRef.value) {
      if (ugoiraPlayerRef.value.paused) ugoiraPlayerRef.value.play();
      else ugoiraPlayerRef.value.pause();
    }
  },
});
</script>
