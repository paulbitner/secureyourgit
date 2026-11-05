/**
 * A thin, position-preserving view over a parsed workflow (or composite action)
 * document. Rules read the workflow through this model so that aliases, merge
 * keys and the various shapes of `on:` are handled in one place.
 */
import {
  isAlias,
  isMap,
  isNode,
  isScalar,
  isSeq,
  type Document,
  type Node,
  type Scalar,
  type YAMLMap,
} from 'yaml';

const MAX_ALIAS_DEPTH = 32;
const MAX_MERGE_DEPTH = 8;

export interface Entry {
  key: string;
  keyNode: Scalar;
  value: Node | undefined;
}

export interface MapView {
  node: YAMLMap;
  entries: Map<string, Entry>;
  get(key: string): Node | undefined;
  /** Scalar value of `key` as a string, if it is a scalar. */
  str(key: string): string | undefined;
  /** Nested map view of `key`, if it is a map. */
  map(key: string): MapView | undefined;
}

export interface StepModel extends MapView {
  index: number;
  jobId: string;
}

export interface JobModel extends MapView {
  id: string;
  keyNode: Scalar;
  steps: StepModel[];
}

export interface WorkflowModel {
  kind: 'workflow' | 'composite' | 'unknown';
  root: MapView | undefined;
  /** Event names from `on:`. */
  triggers: string[];
  jobs: JobModel[];
}

export function deref(doc: Document, node: unknown): Node | undefined {
  let current = node;
  for (let i = 0; i < MAX_ALIAS_DEPTH && isAlias(current); i++) {
    current = current.resolve(doc);
  }
  return isNode(current) && !isAlias(current) ? current : undefined;
}

export function scalarText(node: Node | undefined): string | undefined {
  if (!isScalar(node)) return undefined;
  const { value } = node;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function isMergeKey(key: unknown): boolean {
  return isScalar(key) && (typeof key.value === 'symbol' || key.value === '<<');
}

function collectEntries(doc: Document, node: Node | undefined, depth: number): Entry[] {
  if (!isMap(node)) return [];
  const direct: Entry[] = [];
  const merged: Entry[] = [];
  for (const pair of node.items) {
    if (isMergeKey(pair.key)) {
      if (depth >= MAX_MERGE_DEPTH) continue;
      const source = deref(doc, pair.value);
      const sources = isSeq(source) ? source.items.map((n) => deref(doc, n)) : [source];
      for (const s of sources) merged.push(...collectEntries(doc, s, depth + 1));
      continue;
    }
    if (!isScalar(pair.key)) continue;
    const key = scalarText(pair.key);
    if (key === undefined) continue;
    direct.push({ key, keyNode: pair.key, value: deref(doc, pair.value) });
  }
  // Explicit keys win over merged ones; earlier merge sources win over later ones.
  const result = new Map<string, Entry>();
  for (const e of [...direct, ...merged]) if (!result.has(e.key)) result.set(e.key, e);
  return [...result.values()];
}

export function mapView(doc: Document, node: unknown): MapView | undefined {
  const resolved = deref(doc, node);
  if (!isMap(resolved)) return undefined;
  const entries = new Map(collectEntries(doc, resolved, 0).map((e) => [e.key, e]));
  const view: MapView = {
    node: resolved,
    entries,
    get: (key) => entries.get(key)?.value,
    str: (key) => scalarText(entries.get(key)?.value),
    map: (key) => mapView(doc, entries.get(key)?.value),
  };
  return view;
}

function seqItems(doc: Document, node: Node | undefined): Node[] {
  if (!isSeq(node)) return [];
  return node.items.map((n) => deref(doc, n)).filter((n): n is Node => n !== undefined);
}

function readTriggers(doc: Document, root: MapView): string[] {
  // YAML 1.1 parsers turn a bare `on` key into boolean true; accept both spellings.
  const on = root.get('on') ?? root.get('true');
  const single = scalarText(on);
  if (single !== undefined) return [single];
  if (isSeq(on)) {
    return seqItems(doc, on)
      .map(scalarText)
      .filter((s): s is string => s !== undefined);
  }
  return [...(mapView(doc, on)?.entries.keys() ?? [])];
}

function readSteps(doc: Document, stepsNode: Node | undefined, jobId: string): StepModel[] {
  const steps: StepModel[] = [];
  seqItems(doc, stepsNode).forEach((item, index) => {
    const view = mapView(doc, item);
    if (view) steps.push({ ...view, index, jobId });
  });
  return steps;
}

export function buildWorkflowModel(doc: Document): WorkflowModel {
  const root = mapView(doc, doc.contents);
  if (!root) return { kind: 'unknown', root: undefined, triggers: [], jobs: [] };

  const runs = root.map('runs');
  if (runs && runs.str('using') === 'composite') {
    const runsEntry = root.entries.get('runs');
    const jobId = '(composite action)';
    const job: JobModel = {
      ...runs,
      id: jobId,
      keyNode: runsEntry!.keyNode,
      steps: readSteps(doc, runs.get('steps'), jobId),
    };
    return { kind: 'composite', root, triggers: [], jobs: [job] };
  }

  const jobsView = root.map('jobs');
  const jobs: JobModel[] = [];
  for (const entry of jobsView?.entries.values() ?? []) {
    const view = mapView(doc, entry.value);
    if (!view) continue;
    jobs.push({
      ...view,
      id: entry.key,
      keyNode: entry.keyNode,
      steps: readSteps(doc, view.get('steps'), entry.key),
    });
  }
  const kind = jobsView || root.get('on') !== undefined ? 'workflow' : 'unknown';
  return { kind, root, triggers: readTriggers(doc, root), jobs };
}
