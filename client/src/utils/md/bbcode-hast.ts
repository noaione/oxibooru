/**
 * mdast-util-to-hast handlers for the custom BBCode nodes produced by
 * `bbcode-extension.ts`.
 *
 * ─── Rendered output ────────────────────────────────────────────────────────
 *
 *   [sjis]…[/sjis]
 *     → <span class="sjis">…</span>
 *       Inner children are recursively converted, so inline markdown inside
 *       the tag (bold, links, etc.) continues to work.
 *
 *   [spoiler]…[/spoiler]
 *     → <details class="spoiler"><summary>Spoiler</summary>…</details>
 *       Same recursive child handling.
 *
 *   [icon]url[/icon]
 *     → <a href="url" class="icon icon--{provider}" ...>
 *         <span class="icon__label">{hostname}</span>
 *       </a>
 *       Provider-specific aria-label and rel attributes are added.
 *       The `provider` field set by `resolveIconProvider` drives the CSS class.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   import { toHast } from 'mdast-util-to-hast';
 *   import { toHtml } from 'hast-util-to-html';
 *   import { bbcodeHandlers } from './bbcode-to-hast';
 *
 *   const hast = toHast(mdastTree, { handlers: bbcodeHandlers });
 *   const html = toHtml(hast);
 */

import type { Element, ElementContent, Properties } from 'hast';
import type { PhrasingContent } from 'mdast';
import type { Handler, State } from 'mdast-util-to-hast';
import type { BbIcon, BbSjis, BbSpoiler } from './bbcode';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an array of mdast phrasing nodes to hast element children via the
 * shared `state` object, which handles all standard node types automatically.
 */
function convertChildren(state: State, node: { children: PhrasingContent[] }): ElementContent[] {
  // state.all expects a parent node — cast is safe because we only care about
  // the children array, which our node has
  return state.all(node as Parameters<State['all']>[0]);
}

/** Builds a minimal hast element. */
function el(tagName: string, properties: Properties, children?: ElementContent[]): Element {
  return { type: 'element', tagName, properties, children: children ?? [] };
}

function txt(value: string): ElementContent {
  return { type: 'text', value };
}

/**
 * `[sjis]…[/sjis]` → `<span class="sjis">…</span>`
 *
 * Intended for Shift-JIS kaomoji / emoticons that need a specific font or
 * character-encoding context.  Inner content is recursively converted so that
 * inline markdown (bold, links, etc.) continues to render normally.
 */
const sjisHandler: Handler = (state: State, node: BbSjis): Element => {
  const result = el('span', { className: ['sjis'] }, convertChildren(state, node));
  state.patch(node, result);
  return state.applyData(node, result);
};

/**
 * `[spoiler]…[/spoiler]` → `<span class="spoiler">…</span>`
 */
const spoilerHandler: Handler = (state: State, node: BbSpoiler): Element => {
  const result = el('span', { className: ['spoiler'] }, convertChildren(state, node));
  state.patch(node, result);
  return state.applyData(node, result);
};

/**
 * `[icon]url[/icon]`
 *
 * Renders a linked icon badge.  The `provider` field (set by
 * `resolveIconProvider` during parsing) drives both the CSS class and the
 * human-readable label.
 *
 * Output:
 * ```html
 * <a href="url"
 *    class="icon icon--youtube"
 *    aria-label="YouTube"
 *    rel="noopener noreferrer"
 *    target="_blank">
 *   <span class="icon__label">youtube.com</span>
 * </a>
 * ```
 */
const iconHandler: Handler = (state: State, node: BbIcon): Element => {
  const fullUrl = new URL(node.url);
  const hostname = fullUrl.hostname;

  const result = el(
    'a',
    {
      target: '_blank',
      rel: 'noopener noreferrer',
      href: node.url,
      className: ['link-with-icons'],
      'aria-label': hostname.replace(/^www\./, ''),
    },
    [
      el(
        'img',
        {
          className: 'inlined-icon inline-block align-middle w-4 h-4 mr-0.5',
          src: 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(fullUrl.origin),
          alt: '',
        },
        [],
      ),
      txt(node.url), // full URL here
    ],
  );
  state.patch(node, result);
  return state.applyData(node, result);
};

/**
 * Pass to `toHast` as `handlers` to enable BBCode node rendering.
 *
 * @example
 * ```ts
 * const hast = toHast(tree, { handlers: bbcodeHandlers });
 * ```
 */
export const bbcodeHandlers = {
  bbSjis: sjisHandler,
  bbSpoiler: spoilerHandler,
  bbIcon: iconHandler,
} satisfies Partial<Record<string, Handler>>;
