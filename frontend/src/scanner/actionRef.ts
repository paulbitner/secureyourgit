/** Parsing of `uses:` values. */

export type ActionRef =
  | { kind: 'local'; raw: string }
  | { kind: 'docker'; raw: string; image: string; hasDigest: boolean }
  | {
      kind: 'remote';
      raw: string;
      owner: string;
      repo: string;
      /** Sub-path inside the repo, e.g. `.github/workflows/build.yml` or `init` for `github/codeql-action/init`. */
      path: string;
      ref: string | undefined;
      isReusableWorkflow: boolean;
    }
  | { kind: 'invalid'; raw: string };

export const FULL_SHA = /^[0-9a-f]{40}$/i;

/** Owners whose actions are maintained by GitHub itself. */
export const GITHUB_OWNED = new Set(['actions', 'github']);

export function parseActionRef(raw: string): ActionRef {
  const value = raw.trim();
  if (value.startsWith('./') || value.startsWith('../')) return { kind: 'local', raw };
  if (value.startsWith('docker://')) {
    const image = value.slice('docker://'.length);
    return { kind: 'docker', raw, image, hasDigest: /@sha256:[0-9a-f]{64}$/i.test(image) };
  }
  const at = value.lastIndexOf('@');
  const spec = at === -1 ? value : value.slice(0, at);
  const ref = at === -1 ? undefined : value.slice(at + 1);
  const [owner, repo, ...rest] = spec.split('/');
  if (!owner || !repo) return { kind: 'invalid', raw };
  const path = rest.join('/');
  return {
    kind: 'remote',
    raw,
    owner,
    repo,
    path,
    ref: ref || undefined,
    isReusableWorkflow: /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path),
  };
}

export function isPinned(ref: ActionRef): boolean {
  return ref.kind === 'remote' && ref.ref !== undefined && FULL_SHA.test(ref.ref);
}

export function isGithubOwned(ref: ActionRef): boolean {
  return ref.kind === 'remote' && GITHUB_OWNED.has(ref.owner.toLowerCase());
}

/** `owner/repo[/path]` without the ref. */
export function actionName(ref: Extract<ActionRef, { kind: 'remote' }>): string {
  return [ref.owner, ref.repo, ref.path].filter(Boolean).join('/');
}
