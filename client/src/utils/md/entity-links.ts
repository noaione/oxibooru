import { findAndReplace } from 'mdast-util-find-and-replace';
import type { Nodes, Link } from 'mdast';

function mkLink(url: string, label: string): Link {
  return {
    type: 'link',
    url,
    children: [{ type: 'text' as const, value: label }],
  };
}

export function entityLinksTransformer() {
  return (tree: Nodes) => {
    findAndReplace(
      tree,
      [
        [/@(\d+)/g, (_: string, id: string) => mkLink(`/post/${id}`, `@${id}`)],
        [/\+([a-zA-Z0-9_-]+)/g, (_: string, u: string) => mkLink(`/user/${u}`, `+${u}`)],
        [/%(\d+)/g, (_: string, id: string) => mkLink(`/pool/${id}`, `%${id}`)],
        [
          /#([a-zA-Z0-9_][a-zA-Z0-9_-]*)/g,
          (_: string, t: string) => mkLink(`/posts?query=${t}`, `#${t}`),
        ],
      ],
      { ignore: ['link', 'linkReference', 'code', 'inlineCode'] },
    );
  };
}
