/**
 * BBCode-style tag extension for micromark + mdast-util-from-markdown.
 *
 * Supported tags:
 *   [sjis]...[/sjis]        → BbSjis    { type: 'bbSjis',    children: PhrasingContent[] }
 *   [spoiler]...[/spoiler]  → BbSpoiler { type: 'bbSpoiler', children: PhrasingContent[] }
 *   [icon]url[/icon]        → BbIcon    { type: 'bbIcon',    url: string }
 *
 * Usage:
 *   fromMarkdown(src, {
 *     extensions:      [bbcodeExtension()],
 *     mdastExtensions: [bbcodeFromMarkdown()],
 *   })
 */

import type { PhrasingContent } from 'mdast';
import type {
  CompileContext,
  Extension as FromMarkdownExtension,
  Handle,
  Token,
} from 'mdast-util-from-markdown';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type {
  Code,
  Effects,
  Extension as MicromarkExtension,
  State,
  TokenType,
} from 'micromark-util-types';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    // Scratch token used before the tag name is resolved
    bbcodeTemp: 'bbcodeTemp';

    // [sjis]
    bbSjis: 'bbSjis';
    bbSjisOpenTag: 'bbSjisOpenTag';
    bbSjisContent: 'bbSjisContent';
    bbSjisCloseTag: 'bbSjisCloseTag';

    // [spoiler]
    bbSpoiler: 'bbSpoiler';
    bbSpoilerOpenTag: 'bbSpoilerOpenTag';
    bbSpoilerContent: 'bbSpoilerContent';
    bbSpoilerCloseTag: 'bbSpoilerCloseTag';

    // [icon]
    bbIcon: 'bbIcon';
    bbIconOpenTag: 'bbIconOpenTag';
    bbIconContent: 'bbIconContent';
    bbIconCloseTag: 'bbIconCloseTag';
  }
}

declare module 'mdast' {
  interface PhrasingContentMap {
    bbSjis: BbSjis;
    bbSpoiler: BbSpoiler;
    bbIcon: BbIcon;
  }

  // Also register in RootContentMap so they can appear at block level if needed
  interface RootContentMap {
    bbSjis: BbSjis;
    bbSpoiler: BbSpoiler;
    bbIcon: BbIcon;
  }
}

/** [sjis]…[/sjis] — renders content in a Shift-JIS / kaomoji context. */
export interface BbSjis {
  type: 'bbSjis';
  children: PhrasingContent[];
}

/** [spoiler]…[/spoiler] — hidden/collapsible content. */
export interface BbSpoiler {
  type: 'bbSpoiler';
  children: PhrasingContent[];
}

/** [icon]url[/icon] — link + host-specific icon/embed. */
export interface BbIcon {
  type: 'bbIcon';
  /** The raw URL from inside the tag. */
  url: string;
}

const OPEN_BRACKET = 91 as const; // char code for `[`
const CLOSE_BRACKET = 93 as const; // char code for `]`
const SLASH = 47 as const; // char code for `/`

/** Tag registry — leaf:true means the inner text is raw (not re-parsed). */
interface TagDefinition {
  readonly leaf: boolean;
}

const TAGS: Readonly<Record<string, TagDefinition>> = {
  sjis: { leaf: false },
  spoiler: { leaf: false },
  icon: { leaf: true },
} as const;

type KnownTag = keyof typeof TAGS;

function isKnownTag(name: string): name is KnownTag {
  return Object.prototype.hasOwnProperty.call(TAGS, name);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isLetterCode(code: Code): code is number {
  return code !== null && ((code >= 65 && code <= 90) || (code >= 97 && code <= 122));
}

/** Token-type names derived from a resolved tag name. */
interface TagTokenNames {
  outer: TokenType;
  open: TokenType;
  content: TokenType;
  close: TokenType;
}

function tokenNamesFor(tagName: KnownTag): TagTokenNames {
  const c = capitalize(tagName);
  return {
    outer: ('bb' + c) as TokenType,
    open: ('bb' + c + 'OpenTag') as TokenType,
    content: ('bb' + c + 'Content') as TokenType,
    close: ('bb' + c + 'CloseTag') as TokenType,
  };
}

/**
 * Returns a micromark Extension that recognises [tag]…[/tag] sequences
 * and emits typed tokens consumed by {@link bbcodeFromMarkdown}.
 */
export function bbcodeExtension(): MicromarkExtension {
  return {
    text: { [OPEN_BRACKET]: { tokenize: tokenizeBBCode } },
  };
}

function tokenizeBBCode(this: void, effects: Effects, ok: State, nok: State): State {
  let tagName: KnownTag | '' = '';
  const nameBuf: string[] = [];
  const closeNameBuf: string[] = [];

  // tok() is only safe to call after tagName has been resolved
  function tok(): TagTokenNames {
    return tokenNamesFor(tagName as KnownTag);
  }

  // ── state machine ──────────────────────────────────────────────────────────

  function start(code: Code): State | undefined {
    if (code !== OPEN_BRACKET) return nok(code);
    nameBuf.length = 0;
    tagName = '';
    effects.enter('bbcodeTemp');
    effects.consume(code);
    return readOpenTagName;
  }

  function readOpenTagName(code: Code): State | undefined {
    if (isLetterCode(code)) {
      nameBuf.push(String.fromCharCode(code));
      effects.consume(code);
      return readOpenTagName;
    }

    if (code === CLOSE_BRACKET) {
      const candidate = nameBuf.join('').toLowerCase();

      if (!isKnownTag(candidate)) {
        effects.exit('bbcodeTemp');
        return nok(code);
      }

      tagName = candidate;
      effects.exit('bbcodeTemp');

      const t = tok();
      effects.enter(t.outer);
      effects.enter(t.open);
      effects.consume(code); // `]`
      effects.exit(t.open);

      return TAGS[tagName]!.leaf ? readLeafContent : readContainerContent;
    }

    effects.exit('bbcodeTemp');
    return nok(code);
  }

  // ── container content ─────────────────────────────────────────────────────

  function readContainerContent(code: Code): State | undefined {
    effects.enter(tok().content);
    return readUntilClose(code);
  }

  function readUntilClose(code: Code): State | undefined {
    if (code === null) {
      effects.exit(tok().content);
      effects.exit(tok().outer);
      return nok(code);
    }
    if (code === OPEN_BRACKET) {
      effects.exit(tok().content);
      return readCloseTag(code);
    }
    effects.consume(code);
    return readUntilClose;
  }

  // ── leaf content ──────────────────────────────────────────────────────────

  function readLeafContent(code: Code): State | undefined {
    effects.enter(tok().content);
    return readLeafUntilClose(code);
  }

  function readLeafUntilClose(code: Code): State | undefined {
    if (code === null) {
      effects.exit(tok().content);
      effects.exit(tok().outer);
      return nok(code);
    }
    if (code === OPEN_BRACKET) {
      effects.exit(tok().content);
      return readCloseTag(code);
    }
    effects.consume(code);
    return readLeafUntilClose;
  }

  // ── closing [/tag] ─────────────────────────────────────────────────────────

  function readCloseTag(code: Code): State | undefined {
    if (code !== OPEN_BRACKET) return nok(code);
    effects.enter(tok().close);
    effects.consume(code); // `[`
    return readCloseSlash;
  }

  function readCloseSlash(code: Code): State | undefined {
    if (code !== SLASH) return nok(code);
    effects.consume(code); // `/`
    return readCloseTagName;
  }

  function readCloseTagName(code: Code): State | undefined {
    const t = tok();

    if (isLetterCode(code)) {
      closeNameBuf.push(String.fromCharCode(code));
      effects.consume(code);
      return readCloseTagName;
    }

    if (code === CLOSE_BRACKET) {
      const closeName = closeNameBuf.join('').toLowerCase();
      closeNameBuf.length = 0;
      if (closeName !== tagName) return nok(code);
      effects.consume(code); // `]`
      effects.exit(t.close);
      effects.exit(t.outer);
      return ok;
    }

    return nok(code);
  }

  return start;
}

/**
 * Returns a FromMarkdown extension that maps micromark bbcode tokens into
 * typed mdast nodes ({@link BbSjis}, {@link BbSpoiler}, {@link BbIcon}).
 *
 * Container nodes (`bbSjis`, `bbSpoiler`) re-parse their raw inner text so
 * that `children` contains proper inline mdast nodes.
 *
 * Leaf nodes (`bbIcon`) store the trimmed URL in `url` and resolve the
 * hosting provider via {@link resolveIconProvider}.
 */
export function bbcodeFromMarkdown(): FromMarkdownExtension {
  return {
    canContainEols: ['bbSjis', 'bbSpoiler', 'bbIcon'],

    enter: {
      bbSjis: enterContainer('bbSjis'),
      bbSpoiler: enterContainer('bbSpoiler'),
      bbIcon: enterLeaf(),
    },

    exit: {
      bbSjisContent: exitContainerContent,
      bbSpoilerContent: exitContainerContent,
      bbIconContent: exitLeafContent,
      bbSjis: exitNode,
      bbSpoiler: exitNode,
      bbIcon: exitNode,
    },
  };
}

// ── handler helpers ───────────────────────────────────────────────────────────

type ContainerType = 'bbSjis' | 'bbSpoiler';
type ContainerNode = BbSjis | BbSpoiler;

function enterContainer(type: ContainerType): Handle {
  return function (this: CompileContext, token: Token): undefined {
    const node: ContainerNode = { type, children: [] } as ContainerNode;
    // CompileContext.enter accepts Nodes; our augmented types satisfy that
    this.enter(node as Parameters<CompileContext['enter']>[0], token);
  };
}

function enterLeaf(): Handle {
  return function (this: CompileContext, token: Token): undefined {
    const node: BbIcon = { type: 'bbIcon', url: '' };
    this.enter(node as Parameters<CompileContext['enter']>[0], token);
  };
}

/**
 * Exit handler for `bbSjisContent` / `bbSpoilerContent`.
 *
 * Re-parses the raw inner text as inline markdown and splices the resulting
 * phrasing children directly into the parent container node.
 */
function exitContainerContent(this: CompileContext, token: Token): undefined {
  const raw = this.sliceSerialize(token);
  const parent = this.stack[this.stack.length - 1] as ContainerNode;

  const innerTree = fromMarkdown(raw);
  const firstParagraph = innerTree.children[0];

  if (firstParagraph?.type === 'paragraph') {
    parent.children.push(...firstParagraph.children);
  } else if (raw.trim()) {
    parent.children.push({ type: 'text', value: raw });
  }
}

/**
 * Exit handler for `bbIconContent`.
 *
 * Stores the trimmed URL on the node and resolves the icon provider.
 */
function exitLeafContent(this: CompileContext, token: Token): undefined {
  const raw = this.sliceSerialize(token).trim();
  const node = this.stack[this.stack.length - 1] as BbIcon;
  node.url = raw;
}

/** Pops a bb* node off the compile stack. */
function exitNode(this: CompileContext, token: Token): undefined {
  this.exit(token);
}
