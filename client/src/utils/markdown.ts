import DOMPurify from 'dompurify';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmAutolinkLiteralFromMarkdown } from 'mdast-util-gfm-autolink-literal';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmAutolinkLiteral } from 'micromark-extension-gfm-autolink-literal';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmTable } from 'micromark-extension-gfm-table';
import { toHtml } from 'hast-util-to-html';
import { newlineToBreak } from 'mdast-util-newline-to-break';

import { bbcodeExtension, bbcodeFromMarkdown } from './md/bbcode';
import { remarkImageSize } from './md/custom-image';
import { applyTransforms } from './md/transformers';
import { entityLinksTransformer } from './md/entity-links';
import { toHast } from 'mdast-util-to-hast';
import { raw as hastRaw } from 'hast-util-raw';
import { bbcodeHandlers } from './md/bbcode-hast';

import type { Root as MdastRoot } from 'mdast';
import type { Nodes as HastNodes } from 'hast';

function fromMarkdownToMdast(content: string): MdastRoot {
  const processed = fromMarkdown(content, {
    extensions: [gfmAutolinkLiteral(), gfmStrikethrough(), gfmTable(), bbcodeExtension()],
    mdastExtensions: [
      gfmAutolinkLiteralFromMarkdown(),
      gfmStrikethroughFromMarkdown(),
      gfmTableFromMarkdown(),
      bbcodeFromMarkdown(),
    ],
  });
  return processed;
}

function mdastToHast(mdast: MdastRoot): HastNodes {
  const hast = toHast(mdast, {
    allowDangerousHtml: true,
    clobberPrefix: '',
    handlers: {
      ...bbcodeHandlers,
    },
  });
  return hastRaw(hast);
}

export function renderMarkdown(content: string): string {
  const preprocess = fromMarkdownToMdast(content);
  const processed = applyTransforms(preprocess, [
    remarkImageSize(),
    entityLinksTransformer(),
    newlineToBreak,
  ]);
  const hast = mdastToHast(processed);
  const html = toHtml(hast);
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['del'],
    ADD_ATTR: ['target', 'rel'],
    FORBID_ATTR: ['style'], // disallow inline styles
    FORBID_TAGS: [
      'script',
      'style',
      'title',
      'textarea',
      'select',
      'input',
      'iframe',
      'noembed',
      'noframes',
      'plaintext',
    ],
  });
}
