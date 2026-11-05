import type { LineCounter, Node } from 'yaml';
import type { Location } from './types';

export function locateOffsets(lineCounter: LineCounter, offset: number, endOffset: number): Location {
  const start = lineCounter.linePos(offset);
  const end = lineCounter.linePos(Math.max(offset, endOffset));
  return {
    line: start.line,
    column: start.col,
    endLine: end.line,
    endColumn: end.col,
    offset,
    endOffset,
  };
}

/** Location of a node's value, excluding trailing whitespace/newlines (block scalars include them). */
export function locateNode(lineCounter: LineCounter, source: string, node: Node | undefined): Location {
  const [start, valueEnd] = node?.range ?? [0, 0];
  let end = valueEnd;
  while (end > start && /\s/.test(source[end - 1] ?? '')) end--;
  return locateOffsets(lineCounter, start, end);
}
