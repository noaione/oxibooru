import DOMPurify from 'dompurify';
import { marked, type Tokens } from 'marked';

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

// Override the image renderer to support custom sizing: ![alt](href =WxH "title")
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

// Prevent bare #tag being treated as headings, then re-link to search
function preprocessEntityLinks(text: string): string {
  // @123 → post link, only when not already inside a markdown link
  text = text.replace(/(^|[^[\w@])@(\d+)/g, '$1[@$2](/post/$2)');
  // +username → user link
  text = text.replace(/(^|[^[\w+])\+([a-zA-Z0-9_-]+)/g, '$1[+$2](/user/$2)');
  // $123 → pool link
  text = text.replace(/(^|[^[\w$])\$(\d+)/g, '$1[$$2](/pool/$2)');
  // #tag → post search link (must not be at line start to avoid heading conflicts)
  text = text.replace(/([ \t()\[\]])#([a-zA-Z0-9_][a-zA-Z0-9_-]*)/g, '$1[#$2](/posts?query=$2)');
  return text;
}

function postprocessCustomBlocks(html: string): string {
  // [spoiler]...[/spoiler]
  html = html.replace(
    /\[spoiler\]((?:[^\[]|\[(?!\/?spoiler\]))*)\[\/spoiler\]/gi,
    '<span class="spoiler">$1</span>',
  );
  // [sjis]...[/sjis]
  html = html.replace(
    /\[sjis\]((?:[^\[]|\[(?!\/?sjis\]))*)\[\/sjis\]/gi,
    '<pre class="sjis">$1</pre>',
  );
  // [icon]url[/icon] — show the site favicon next to the link
  html = html.replace(
    /\[icon\](https?:\/\/[^\]]+)\[\/icon\]/gi,
    (_match, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">` +
      `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}" alt="" class="inline-block align-middle w-4 h-4 mr-0.5"> ${url}</a>`,
  );
  return html;
}

export function renderMarkdown(text: string): string {
  const preprocessed = preprocessEntityLinks(text);
  const raw = marked.parse(preprocessed) as string;
  const withBlocks = postprocessCustomBlocks(raw);
  return DOMPurify.sanitize(withBlocks, {
    ADD_TAGS: ['del'],
    ADD_ATTR: ['target', 'rel'],
  });
}
