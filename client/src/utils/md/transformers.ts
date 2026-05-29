/**
 * Transform pipeline — `applyTransforms`
 *
 * `fromMarkdown` supports a `transforms` array inside `mdastExtensions`, but
 * you often also want to compose *external* post-processing functions (e.g.
 * `mdast-util-newline-to-break`, your own custom visitors).  `applyTransforms`
 * is a small helper that chains an ordered list of `(Root) => void` functions
 * and returns the root, making it easy to add steps without nesting calls.
 */

import type { Root, RootContent } from 'mdast';

/**
 * A function that walks or mutates an mdast `Root` tree.
 * Matches the signatures of `imageSizeTransform`, `newlineToBreak`, and any
 * custom visitor you write.
 */
export type TreeTransform = (tree: Root | RootContent) => Root | null | undefined | void;

/**
 * Applies an ordered sequence of tree-transform functions to `tree`,
 * returning the (possibly replaced) root.
 *
 * Each transform may mutate `tree` in place, return a new `Root`, or return
 * nothing.  If a transform returns a non-null `Root`, that value replaces
 * `tree` for subsequent steps.
 *
 * @example
 * ```ts
 * import { newlineToBreak } from 'mdast-util-newline-to-break';
 *
 * const tree = fromMarkdown(src, {
 *   extensions:      [gfm(), bbcodeExtension()],
 *   mdastExtensions: [gfmFromMarkdown(), bbcodeFromMarkdown()],
 * });
 *
 * const processed = applyTransforms(tree, [
 *   imageSizeTransform,   // strip =WxH annotations
 *   newlineToBreak,       // \n → <br>
 *   myCustomTransform,    // your own visitor
 * ]);
 * ```
 */
export function applyTransforms(tree: Root, transforms: ReadonlyArray<TreeTransform>): Root {
  let current = tree;

  for (const transform of transforms) {
    const result = transform(current);
    if (result != null) {
      current = result;
    }
  }

  return current;
}
