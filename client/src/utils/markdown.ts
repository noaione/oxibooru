import DOMPurify from 'dompurify';
import { marked, type Tokens } from 'marked';

// Sentinel: Unicode Private Use Area — never appears in normal text, not a control character.
const SENTINEL = '';

marked.use({
  async: false,
  breaks: true,
  gfm: true,
  extensions: [
    {
      name: 'del',
      level: 'inline',
      start(src) {
        return src.indexOf('~~');
      },
      tokenizer(src) {
        const match = /^~~([^~]+)~~/.exec(src);
        if (match) {
          return { type: 'del', raw: match[0], text: match[1], tokens: [] };
        }
        return undefined;
      },
      renderer(token) {
        return `<del>${(token as Tokens.Generic).text}</del>`;
      },
    },
  ],
});

// Custom image renderer: support ![alt](href =WxH "title") sizing
const renderer = new marked.Renderer();
renderer.image = ({ href, title, text }: Tokens.Image) => {
  const sizeMatch = /^(.+?)\s+=(\d*)\s*x\s*(\d*)\s*$/.exec(href ?? '');
  let src = href ?? '';
  let width = '';
  let height = '';
  if (sizeMatch) {
    src = sizeMatch[1] ?? src;
    width = sizeMatch[2] ?? '';
    height = sizeMatch[3] ?? '';
  }
  let tag = `<img src="${src}" alt="${text ?? ''}"`;
  if (width) tag += ` width="${width}"`;
  if (height) tag += ` height="${height}"`;
  if (title) tag += ` title="${title}"`;
  return tag + '>';
};
marked.use({ renderer });

// Pre-extract custom blocks to sentinel-delimited placeholders so marked.parse
// never sees their raw content (avoids [sjis](content) being parsed as a
// markdown link, and GFM autolink eating [/icon] into a URL).
function extractPreBlocks(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];

  text = text.replace(/\[sjis\]([\s\S]*?)\[\/sjis\]/gi, (_, content: string) => {
    const idx = blocks.length;
    blocks.push(`<pre class="sjis">${content}</pre>`);
    return `${SENTINEL}BLOCK${idx}${SENTINEL}`;
  });

  text = text.replace(/\[icon\](https?:\/\/.*?)\[\/icon\]/gi, (_, url: string) => {
    const idx = blocks.length;
    blocks.push(
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-with-icons">` +
        `<img class="inlined-icon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}" ` +
        `alt="" class="inline-block align-middle w-4 h-4 mr-0.5"> ${url}</a>`,
    );
    return `${SENTINEL}BLOCK${idx}${SENTINEL}`;
  });

  return { text, blocks };
}

// The sentinel is a literal PUA character embedded in the string; the regex
// matches it by referencing the same constant (no regex escape needed).
const BLOCK_RE = new RegExp(`${SENTINEL}BLOCK(\\d+)${SENTINEL}`, 'g');

function restorePreBlocks(html: string, blocks: string[]): string {
  return html.replace(BLOCK_RE, (_, idx: string) => blocks[parseInt(idx)] ?? '');
}

// Convert entity shorthand to markdown links.
// `m` flag so ^ matches each line start, fixing #tag at start of a paragraph.
function preprocessEntityLinks(text: string): string {
  // @123 → post link
  text = text.replace(/(^|[^[\w@])@(\d+)/gm, '$1[@$2](/post/$2)');
  // +username → user link
  text = text.replace(/(^|[^[\w+])\+([a-zA-Z0-9_-]+)/gm, '$1[+$2](/user/$2)');
  // %123 → pool link
  text = text.replace(/(^|[^[\w%])%(\d+)/gm, '$1[%$2](/pool/$2)');
  // #tag → post search (^ via m flag covers start-of-line too)
  text = text.replace(/(^|[ \t()[\]])#([a-zA-Z0-9_][a-zA-Z0-9_-]*)/gm, '$1[#$2](/posts?query=$2)');
  return text;
}

function postprocessCustomBlocks(html: string): string {
  // [spoiler]...[/spoiler] is safe post-parse: marked doesn't see it as a link
  html = html.replace(
    /\[spoiler\]((?:[^[]|\[(?!\/?spoiler\]))*)\[\/spoiler\]/gi,
    '<span class="spoiler">$1</span>',
  );
  return html;
}

export function renderMarkdown(text: string): string {
  const { text: extracted, blocks } = extractPreBlocks(text);
  const preprocessed = preprocessEntityLinks(extracted);
  const raw = marked.parse(preprocessed) as string;
  const withBlocks = restorePreBlocks(raw, blocks);
  const withPostBlocks = postprocessCustomBlocks(withBlocks);
  return DOMPurify.sanitize(withPostBlocks, {
    ADD_TAGS: ['del'],
    ADD_ATTR: ['target', 'rel'],
  });
}
