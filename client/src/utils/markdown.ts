import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.use({ async: false, breaks: true });

export function renderMarkdown(text: string): string {
  const raw = marked.parse(text) as string;
  return DOMPurify.sanitize(raw);
}
