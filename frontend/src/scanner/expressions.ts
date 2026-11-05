/**
 * Helpers for GitHub Actions `${{ ... }}` expressions and the list of contexts
 * an external attacker can control.
 */

export interface Expression {
  /** Offset of `${{` within the searched text. */
  start: number;
  /** Offset just past `}}`. */
  end: number;
  /** Raw text between the braces. */
  inner: string;
}

export function findExpressions(text: string): Expression[] {
  const out: Expression[] = [];
  const re = /\$\{\{([\s\S]*?)\}\}/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push({ start: m.index, end: m.index + m[0].length, inner: m[1] ?? '' });
  }
  return out;
}

/**
 * Attacker-controllable values. `*` matches one path segment (array index or
 * object key). Contexts are case-insensitive, so everything is lowercase.
 */
export const UNTRUSTED_CONTEXTS: readonly string[] = [
  'github.head_ref',
  'github.event.issue.title',
  'github.event.issue.body',
  'github.event.pull_request.title',
  'github.event.pull_request.body',
  'github.event.pull_request.head.ref',
  'github.event.pull_request.head.label',
  'github.event.pull_request.head.repo.default_branch',
  'github.event.comment.body',
  'github.event.review.body',
  'github.event.review_comment.body',
  'github.event.pages.*.page_name',
  'github.event.commits.*.message',
  'github.event.commits.*.author.email',
  'github.event.commits.*.author.name',
  'github.event.head_commit.message',
  'github.event.head_commit.author.email',
  'github.event.head_commit.author.name',
  'github.event.discussion.title',
  'github.event.discussion.body',
  'github.event.workflow_run.head_branch',
  'github.event.workflow_run.display_title',
  'github.event.workflow_run.head_commit.message',
  'github.event.workflow_run.head_commit.author.email',
  'github.event.workflow_run.head_commit.author.name',
  'github.event.workflow_run.pull_requests.*.head.ref',
  'github.event.merge_group.head_commit.message',
];

/** Any event field ending in one of these is treated as free text controlled by its author. */
const UNTRUSTED_LEAF_NAMES = new Set(['body', 'title', 'message', 'page_name', 'head_ref', 'head_branch', 'display_title']);

/** Lowercase, convert `a['b']` / `a["b"]` to `a.b` and `a[0]` / `a[*]` to `a.*`. */
export function normalizeExpression(expr: string): string {
  return expr
    .toLowerCase()
    .replace(/\[\s*(['"])([^'"]*)\1\s*\]/g, '.$2')
    .replace(/\[[^\]]*\]/g, '.*');
}

function segmentsMatch(path: string[], pattern: string[]): boolean {
  return path.length === pattern.length && pattern.every((p, i) => p === '*' || path[i] === '*' || p === path[i]);
}

export interface UntrustedReference {
  /** Normalized context path, e.g. `github.event.issue.title`. */
  path: string;
}

/** Context references in an expression that carry attacker-controlled data. */
export function findUntrustedReferences(inner: string): UntrustedReference[] {
  const normalized = normalizeExpression(inner);
  const serializesObject = /\btojson\s*\(/.test(normalized);
  const refs = normalized.match(/\bgithub(?:\.[a-z0-9_*-]+)+/g) ?? [];
  const found: UntrustedReference[] = [];
  for (const ref of new Set(refs)) {
    const segs = ref.split('.');
    const direct = UNTRUSTED_CONTEXTS.some((p) => {
      const pat = p.split('.');
      // Exact match, or a sub-field of an untrusted value (e.g. `.head.ref.length`).
      return segmentsMatch(segs.slice(0, pat.length), pat);
    });
    const leaf = segs[1] === 'event' && segs.length > 2 && UNTRUSTED_LEAF_NAMES.has(segs[segs.length - 1] ?? '');
    // toJSON(github.event) / toJSON(github.event.issue) dumps untrusted fields wholesale.
    const ancestor =
      serializesObject &&
      UNTRUSTED_CONTEXTS.some((p) => {
        const pat = p.split('.');
        return segs.length < pat.length && segmentsMatch(segs, pat.slice(0, segs.length));
      });
    if (direct || leaf || ancestor) found.push({ path: ref });
  }
  return found;
}

/** Events whose workflows run with a privileged token/secrets while handling outsider input. */
export const PRIVILEGED_UNTRUSTED_TRIGGERS = new Set([
  'pull_request_target',
  'workflow_run',
  'issue_comment',
  'issues',
  'discussion',
  'discussion_comment',
  'pull_request_review',
  'pull_request_review_comment',
]);
