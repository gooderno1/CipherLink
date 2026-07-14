import { SelectionRange } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";

export function livePreviewExtension(openLink: (target: string) => void) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, openLink);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view, openLink);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}

function buildDecorations(view: EditorView, openLink: (target: string) => void): DecorationSet {
  const ranges: Array<{ from: number; to: number; decoration: Decoration }> = [];
  const cursor = view.state.selection.main;
  for (const viewport of view.visibleRanges) {
    let position = viewport.from;
    while (position <= viewport.to) {
      const line = view.state.doc.lineAt(position);
      decorateLine(line.text, line.from, cursor, ranges, openLink);
      if (line.to >= viewport.to || line.number === view.state.doc.lines) break;
      position = line.to + 1;
    }
  }
  const nonOverlapping = ranges
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .filter((range, index, all) => {
      const previous = all[index - 1];
      return !previous || range.from >= previous.to || range.from === range.to;
    });
  return Decoration.set(
    nonOverlapping.map((range) => range.decoration.range(range.from, range.to)),
    true,
  );
}

function decorateLine(
  text: string,
  offset: number,
  cursor: SelectionRange,
  ranges: Array<{ from: number; to: number; decoration: Decoration }>,
  openLink: (target: string) => void,
): void {
  const heading = text.match(/^(#{1,6})\s+/);
  if (heading) {
    ranges.push({
      from: offset,
      to: offset,
      decoration: Decoration.line({ class: `cipherlink-lp-h${heading[1]!.length}` }),
    });
    const lineTo = offset + text.length;
    if (!cursorTouches(cursor, offset, lineTo)) {
      ranges.push({
        from: offset,
        to: offset + heading[0].length,
        decoration: Decoration.replace({}),
      });
    }
  }
  if (/^>\s*\[![^\]]+\]/.test(text)) {
    ranges.push({
      from: offset,
      to: offset,
      decoration: Decoration.line({ class: "cipherlink-lp-callout" }),
    });
  }
  const wikilinks = [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)];
  for (const match of wikilinks) {
    const from = offset + (match.index ?? 0);
    const to = from + match[0].length;
    if (cursorTouches(cursor, from, to)) continue;
    ranges.push({
      from,
      to,
      decoration: Decoration.replace({
        widget: new WikiLinkWidget(match[2] ?? match[1]!, match[1]!, openLink),
      }),
    });
  }
  const task = text.match(/^(\s*[-*+]\s+)\[([ xX])\]/);
  if (task) {
    const from = offset + task[1]!.length;
    const to = from + 3;
    if (!cursorTouches(cursor, from, to)) {
      ranges.push({
        from,
        to,
        decoration: Decoration.replace({ widget: new TaskWidget(task[2]! !== " ", from) }),
      });
    }
  }
  addInlineMarks(text, offset, cursor, ranges, /\*\*([^*\n]+)\*\*/g, "cipherlink-lp-strong");
  addInlineMarks(text, offset, cursor, ranges, /(?<!\*)\*([^*\n]+)\*(?!\*)/g, "cipherlink-lp-em");
  addInlineMarks(text, offset, cursor, ranges, /==([^=\n]+)==/g, "cipherlink-lp-highlight");
  addInlineMarks(text, offset, cursor, ranges, /~~([^~\n]+)~~/g, "cipherlink-lp-strike");
  addInlineMarks(text, offset, cursor, ranges, /`([^`\n]+)`/g, "cipherlink-lp-code");
}

function addInlineMarks(
  text: string,
  offset: number,
  cursor: SelectionRange,
  ranges: Array<{ from: number; to: number; decoration: Decoration }>,
  expression: RegExp,
  className: string,
): void {
  for (const match of text.matchAll(expression)) {
    const from = offset + (match.index ?? 0);
    const to = from + match[0].length;
    if (cursorTouches(cursor, from, to)) continue;
    const delimiter = match[0].startsWith("**") || match[0].startsWith("==") || match[0].startsWith("~~") ? 2 : 1;
    ranges.push({ from, to: from + delimiter, decoration: Decoration.replace({}) });
    ranges.push({
      from: from + delimiter,
      to: to - delimiter,
      decoration: Decoration.mark({ class: className }),
    });
    ranges.push({ from: to - delimiter, to, decoration: Decoration.replace({}) });
  }
}

function cursorTouches(cursor: SelectionRange, from: number, to: number): boolean {
  return cursor.from <= to && cursor.to >= from;
}

class WikiLinkWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly target: string,
    private readonly openLink: (target: string) => void,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const link = document.createElement("a");
    link.className = "internal-link cipherlink-lp-link";
    link.textContent = this.label;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      this.openLink(this.target);
    });
    return link;
  }
}

class TaskWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly position: number,
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.className = "task-list-item-checkbox";
    checkbox.addEventListener("change", () => {
      view.dispatch({ changes: { from: this.position + 1, to: this.position + 2, insert: checkbox.checked ? "x" : " " } });
    });
    return checkbox;
  }
}
