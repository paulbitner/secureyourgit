import { LineCounter, parseDocument, type Document } from 'yaml';

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export interface ParsedWorkflow {
  doc: Document.Parsed;
  lineCounter: LineCounter;
  errors: ParseError[];
}

export function parseWorkflow(source: string): ParsedWorkflow {
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, {
    lineCounter,
    keepSourceTokens: true,
    merge: true,
    prettyErrors: false,
    // We never call doc.toJS(); rules walk the AST along fixed paths and resolve
    // aliases one hop at a time, so "billion laughs" inputs cannot fan out.
  });
  const errors = doc.errors.map((e) => {
    const pos = lineCounter.linePos(e.pos[0]);
    return { message: e.message.split('\n')[0] ?? e.message, line: pos.line, column: pos.col };
  });
  return { doc, lineCounter, errors };
}
