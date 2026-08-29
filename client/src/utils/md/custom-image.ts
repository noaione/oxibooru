import { visit } from 'unist-util-visit';
import type { Node, Parent } from 'mdast';

interface ImageNode {
  type: 'image';
  url: string;
  alt?: string | null;
  title?: string | null;
  data?: {
    hProperties?: Record<string, unknown>;
  };
}

export function remarkImageSize() {
  return (tree: Node) => {
    visit(
      tree,
      (node: unknown): node is Parent => Array.isArray((node as Parent).children),
      (parent: Parent) => {
        if (!parent.children) return;

        const children = parent.children;

        for (let i = 0; i < children.length - 1; i++) {
          const current = children[i];
          const next = children[i + 1];

          if (current?.type !== 'image' || next?.type !== 'text') {
            continue;
          }

          const match = next.value.match(/^(?<esc>\\)?{(?<main>[^}]+)}(?<esc2>\\)?/);

          if (!match) continue;

          // if escaped, ignore
          if (match.groups?.esc || match.groups?.esc2) continue;
          // if empty
          if (!match.groups?.main) continue;

          applyAttributes(current, match.groups.main as string);

          // remove attribute text
          next.value = next.value.slice(match[0].length);

          // remove empty text node
          if (!next.value.length) {
            children.splice(i + 1, 1);
          }
        }
      },
    );
  };
}

function normalizeSize(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function applyAttributes(node: ImageNode, raw: string) {
  node.data ??= {};
  node.data.hProperties ??= {};

  const props = node.data.hProperties;

  const tokens = raw.trim().split(/\s+/);

  for (const token of tokens) {
    const sizeMatch = token.match(
      /^((?:\d+(?:\.\d+)?(?:px|%|rem|em)?)|auto)?x((?:\d+(?:\.\d+)?(?:px|%|rem|em)?)|auto)?$/,
    );

    if (sizeMatch) {
      const [, width, height] = sizeMatch;

      if (width) {
        props.width = normalizeSize(width);
      }

      if (height) {
        props.height = normalizeSize(height);
      }

      continue;
    }

    const kvMatch = token.match(/^([^=]+)=(.+)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (!key || !value) continue;
      props[key] = value;
      continue;
    }

    switch (token) {
      case 'lazy':
        props.loading = 'lazy';
        break;

      case 'async':
        props.decoding = 'async';
        break;

      default:
        props[token] = true;
    }
  }
}
