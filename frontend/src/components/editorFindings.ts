/**
 * CodeMirror extension that paints scan findings into the editor: a tinted,
 * severity-colored line, a wavy underline on the exact span, a gutter dot and
 * a hover tooltip.
 */
import { RangeSet, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  gutter,
  GutterMarker,
  hoverTooltip,
  type DecorationSet,
} from '@codemirror/view';
import { SEVERITY_ORDER, type Finding, type Severity } from '../scanner/types';

/** Severity → design token. Matches the badge colors. */
const SEVERITY_TOKEN: Record<Severity, string> = {
  critical: 'danger',
  high: 'accent',
  medium: 'warning',
  low: 'info',
};

const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);

export const setFindings = StateEffect.define<Finding[]>();

class SeverityMarker extends GutterMarker {
  constructor(readonly severity: Severity) {
    super();
  }
  eq(other: SeverityMarker) {
    return other.severity === this.severity;
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = `cm-severity-dot cm-severity-dot-${this.severity}`;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }
}

const MARKERS = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, new SeverityMarker(s)])) as Record<
  Severity,
  SeverityMarker
>;

interface FindingsState {
  findings: Finding[];
  /** True once the text was edited after the scan; offsets no longer line up exactly. */
  stale: boolean;
  decorations: DecorationSet;
  markers: RangeSet<GutterMarker>;
}

function build(view: { doc: EditorView['state']['doc'] }, findings: Finding[]): FindingsState {
  const { doc } = view;
  const clamp = (n: number) => Math.max(0, Math.min(n, doc.length));

  // Worst severity per line decides the line tint and gutter dot.
  const worstByLine = new Map<number, Severity>();
  for (const f of findings) {
    const from = doc.lineAt(clamp(f.offset)).number;
    const to = doc.lineAt(clamp(Math.max(f.offset, f.endOffset))).number;
    for (let n = from; n <= to; n++) {
      const cur = worstByLine.get(n);
      if (!cur || rank(f.severity) < rank(cur)) worstByLine.set(n, f.severity);
    }
  }

  const ranges = [];
  for (const [n, severity] of worstByLine) {
    ranges.push(Decoration.line({ class: `cm-finding-line cm-finding-line-${severity}` }).range(doc.line(n).from));
  }
  for (const f of findings) {
    const from = clamp(f.offset);
    const to = clamp(f.endOffset);
    if (to > from) ranges.push(Decoration.mark({ class: `cm-finding-mark cm-finding-mark-${f.severity}` }).range(from, to));
  }

  const markers = new RangeSetBuilder<GutterMarker>();
  for (const n of [...worstByLine.keys()].sort((a, b) => a - b)) {
    markers.add(doc.line(n).from, doc.line(n).from, MARKERS[worstByLine.get(n)!]);
  }

  return { findings, stale: false, decorations: Decoration.set(ranges, true), markers: markers.finish() };
}

const findingsField = StateField.define<FindingsState>({
  create: () => ({ findings: [], stale: false, decorations: Decoration.none, markers: RangeSet.empty }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setFindings)) return build(tr.state, e.value);
    if (!tr.docChanged) return value;
    // Keep highlights attached to the text while the user types; the next scan replaces them.
    return {
      findings: value.findings,
      stale: true,
      decorations: value.decorations.map(tr.changes),
      markers: value.markers.map(tr.changes),
    };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
});

const severityGutter = gutter({
  class: 'cm-severity-gutter',
  markers: (view) => view.state.field(findingsField).markers,
});

/** Hover over a highlighted span or its line to see what was found there. */
const findingsTooltip = hoverTooltip((view, pos) => {
  const state = view.state.field(findingsField);
  if (state.stale) return null;
  const line = view.state.doc.lineAt(pos);
  const hits = state.findings.filter((f) => f.offset <= line.to && Math.max(f.offset, f.endOffset) >= line.from);
  if (hits.length === 0) return null;
  return {
    pos: line.from,
    end: line.to,
    above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'cm-finding-tooltip';
      for (const f of hits) {
        const row = document.createElement('div');
        row.className = 'cm-finding-tooltip-row';
        const badge = document.createElement('span');
        badge.className = `badge-${f.severity}`;
        badge.textContent = f.severity;
        const title = document.createElement('span');
        title.textContent = f.title.replace(/`/g, '');
        row.append(badge, title);
        dom.append(row);
      }
      return { dom };
    },
  };
});

const tok = (name: string, alpha?: number) => (alpha === undefined ? `rgb(var(--${name}))` : `rgb(var(--${name}) / ${alpha})`);

const findingsTheme = EditorView.theme({
  '.cm-severity-gutter': { width: '14px' },
  '.cm-severity-gutter .cm-gutterElement': { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  '.cm-severity-dot': { display: 'block', width: '8px', height: '8px', borderRadius: '9999px' },
  '.cm-finding-tooltip': {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxWidth: '28rem',
    padding: '8px 10px',
    fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
    fontSize: '0.8125rem',
    lineHeight: '1.25rem',
  },
  '.cm-finding-tooltip-row': { display: 'flex', alignItems: 'baseline', gap: '8px' },
  '.cm-tooltip:has(.cm-finding-tooltip)': {
    backgroundColor: tok('bg'),
    color: tok('fg'),
    border: `1px solid ${tok('border')}`,
    borderRadius: '4px',
  },
  ...Object.fromEntries(
    SEVERITY_ORDER.flatMap((s) => {
      const c = SEVERITY_TOKEN[s];
      return [
        [`.cm-severity-dot-${s}`, { backgroundColor: tok(c) }],
        [`.cm-finding-line-${s}`, { backgroundColor: tok(c, 0.08), boxShadow: `inset 3px 0 0 ${tok(c)}` }],
        [
          `.cm-finding-mark-${s}`,
          {
            backgroundColor: tok(c, 0.14),
            textDecoration: `underline wavy ${tok(c)}`,
            textDecorationSkipInk: 'none',
            textUnderlineOffset: '3px',
          },
        ],
      ];
    }),
  ),
});

export function findingsExtension(): Extension {
  return [findingsField, severityGutter, findingsTooltip, findingsTheme];
}
