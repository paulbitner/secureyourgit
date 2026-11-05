import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Finding } from '../scanner/types';
import { findingsExtension, setFindings } from './editorFindings';

/** Read a design token as a CSS color. Tokens switch automatically with the `.dark` class. */
const tok = (name: string, alpha?: number) => (alpha === undefined ? `rgb(var(--${name}))` : `rgb(var(--${name}) / ${alpha})`);

const editorTheme = EditorView.theme({
  '&': { backgroundColor: tok('surface'), color: tok('fg'), fontSize: '0.875rem', height: '100%' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", ui-monospace, monospace', lineHeight: '1.375rem' },
  '.cm-content': { caretColor: tok('fg'), padding: '12px 0' },
  '.cm-gutters': { backgroundColor: tok('surface-2'), color: tok('fg-muted'), border: 'none', borderRight: `1px solid ${tok('border')}` },
  '.cm-activeLine': { backgroundColor: tok('surface-2', 0.7) },
  '.cm-activeLineGutter': { backgroundColor: tok('border', 0.6), color: tok('fg') },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: tok('fg') },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: tok('primary', 0.25) },
  '.cm-placeholder': { color: tok('fg-muted') },
});

const highlight = HighlightStyle.define([
  { tag: [t.propertyName, t.definition(t.propertyName)], color: tok('primary') },
  { tag: [t.string, t.special(t.string)], color: tok('success') },
  { tag: [t.number, t.bool, t.null], color: tok('accent') },
  { tag: t.comment, color: tok('fg-muted'), fontStyle: 'italic' },
  { tag: [t.labelName, t.meta, t.typeName], color: tok('warning') },
  { tag: t.punctuation, color: tok('fg-muted') },
]);

export interface WorkflowEditorHandle {
  /** Scroll to a finding, select its span and focus the editor. */
  reveal(finding: Finding): void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  findings: Finding[];
  /** The exact text the findings were computed from; highlights are applied only when it matches. */
  findingsSource: string;
  ref?: Ref<WorkflowEditorHandle>;
  /** id of an element describing the editor (e.g. the privacy note). */
  describedBy?: string;
}

export function WorkflowEditor({ value, onChange, findings, findingsSource, describedBy, ref }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // CodeMirror touches the DOM, so it is created only in the browser (never during pre-rendering).
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          findingsExtension(),
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          // Tab is intentionally NOT captured so keyboard users can move focus out of the editor.
          keymap.of([...defaultKeymap, ...historyKeymap]),
          yaml(),
          syntaxHighlighting(highlight),
          editorTheme,
          placeholder('Paste a workflow file, e.g. .github/workflows/ci.yml'),
          EditorView.contentAttributes.of({
            'aria-label': 'GitHub Actions workflow YAML',
            'aria-multiline': 'true',
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // Created once; later `value` changes are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes (e.g. "Load example") without clobbering the user's undo history needlessly.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  // Paint findings once the scan result matches what is in the editor (scans are debounced).
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() === findingsSource) {
      v.dispatch({ effects: setFindings.of(findings) });
    }
  }, [findings, findingsSource]);

  useImperativeHandle(ref, () => ({
    reveal(finding) {
      const v = view.current;
      if (!v) return;
      const len = v.state.doc.length;
      const from = Math.min(finding.offset, len);
      const to = Math.min(Math.max(finding.offset, finding.endOffset), len);
      v.dispatch({
        selection: { anchor: from, head: to },
        effects: EditorView.scrollIntoView(from, { y: 'center' }),
      });
      v.focus();
    },
  }));

  return (
    <div
      ref={host}
      className="h-editor overflow-hidden rounded-md border border-border focus-within:shadow-focus sm:h-editor-lg"
    />
  );
}
