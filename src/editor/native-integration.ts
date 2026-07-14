import { EditorState, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import {
  editorInfoField,
  getFrontMatterInfo,
  MarkdownPostProcessor,
  parseYaml,
  TFile,
} from "obsidian";
import { SecureBodyController, SecureBodyHost } from "./secure-body";

const SECURE_CALLOUT = /^(?:> \[!cipherlink\][^\n]*|> \[!locked\]\s*(?:加密内容|Encrypted content)[^\n]*)(?:\n>[^\n]*)*/m;
const controllers = new WeakMap<HTMLElement, SecureBodyController>();

export function createSecureBodyEditorExtension(host: SecureBodyHost) {
  const envelopeReadOnly = StateField.define<boolean>({
    create: (state) => cipherLinkEnvelopeId(state.doc.toString()) !== null,
    update: (value, transaction) => {
      const previousFile = transaction.startState.field(editorInfoField, false)?.file?.path;
      const currentFile = transaction.state.field(editorInfoField, false)?.file?.path;
      if (transaction.docChanged || previousFile !== currentFile) {
        return cipherLinkEnvelopeId(transaction.state.doc.toString()) !== null;
      }
      return value;
    },
    provide: (field) => EditorView.editable.from(field, (isEnvelope) => !isEnvelope),
  });
  const secureBody = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, host),
    update: (decorations, transaction) => {
      const previousFile = transaction.startState.field(editorInfoField, false)?.file?.path;
      const currentFile = transaction.state.field(editorInfoField, false)?.file?.path;
      if (transaction.docChanged || previousFile !== currentFile) {
        return buildDecorations(transaction.state, host);
      }
      return decorations.map(transaction.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
  return [envelopeReadOnly, secureBody];
}

export function createSecureBodyPostProcessor(host: SecureBodyHost): MarkdownPostProcessor {
  return (el, context) => {
    const frontmatter: unknown = context.frontmatter;
    if (!isRecord(frontmatter) || frontmatter["cipherlink"] !== true) return;
    const envelopeId = typeof frontmatter["cipherlink_id"] === "string"
      ? frontmatter["cipherlink_id"]
      : "";
    if (!envelopeId) return;
    const callout = findRenderedSecureCallout(el);
    if (!callout) return;
    const file = host.app.vault.getAbstractFileByPath(context.sourcePath);
    if (!(file instanceof TFile)) return;
    const container = el.ownerDocument.createElement("div");
    container.className = "cipherlink-embedded";
    callout.replaceWith(container);
    context.addChild(new SecureBodyController(container, host, file, envelopeId, "read"));
  };
}

function buildDecorations(state: EditorState, host: SecureBodyHost): DecorationSet {
  const info = state.field(editorInfoField, false);
  const file = info?.file;
  if (!file) return Decoration.none;
  const content = state.doc.toString();
  const envelopeId = cipherLinkEnvelopeId(content);
  if (!envelopeId) return Decoration.none;
  const callout = SECURE_CALLOUT.exec(content);
  if (!callout || callout.index === undefined) return Decoration.none;
  const from = callout.index;
  const to = from + callout[0].length;
  return Decoration.set([
    Decoration.replace({
      block: true,
      widget: new SecureBodyWidget(host, file, envelopeId),
    }).range(from, to),
  ]);
}

function cipherLinkEnvelopeId(content: string): string | null {
  try {
    const info = getFrontMatterInfo(content);
    if (!info.exists) return null;
    const parsed = parseYaml(info.frontmatter) as Record<string, unknown> | null;
    const id = parsed?.cipherlink_id;
    return parsed?.cipherlink === true && typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

function findRenderedSecureCallout(el: HTMLElement): HTMLElement | null {
  const candidates: HTMLElement[] = el.matches(".callout") ? [el] : [];
  candidates.push(...Array.from(el.querySelectorAll<HTMLElement>(".callout")));
  return candidates.find((candidate) => {
    const kind = candidate.dataset.callout;
    if (kind === "cipherlink") return true;
    if (kind !== "locked") return false;
    const titleElement = candidate.querySelector<HTMLElement>(".callout-title-inner");
    const title = titleElement?.innerText.trim();
    return title === "加密内容" || title === "Encrypted content";
  }) ?? null;
}

class SecureBodyWidget extends WidgetType {
  constructor(
    private readonly host: SecureBodyHost,
    private readonly file: TFile,
    private readonly envelopeId: string,
  ) {
    super();
  }

  eq(other: SecureBodyWidget): boolean {
    return other.envelopeId === this.envelopeId;
  }

  toDOM(view: EditorView): HTMLElement {
    const focusOnMount = this.host.consumeSecureBodyFocusRequest(this.envelopeId) || view.hasFocus;
    const ownerDocument = view.dom.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    const container = ownerDocument.createElement("div");
    container.className = "cipherlink-embedded";
    container.tabIndex = -1;
    if (focusOnMount) {
      const activeElement = ownerDocument.activeElement;
      if (ownerWindow && activeElement instanceof ownerWindow.HTMLElement) activeElement.blur();
      ownerWindow?.requestAnimationFrame(() => {
        if (container.isConnected) container.focus({ preventScroll: true });
      });
    }
    const controller = new SecureBodyController(
      container,
      this.host,
      this.file,
      this.envelopeId,
      "edit",
      () => focusOnMount,
    );
    controllers.set(container, controller);
    controller.load();
    return container;
  }

  destroy(dom: HTMLElement): void {
    const controller = controllers.get(dom);
    controllers.delete(dom);
    if (controller) void controller.dispose();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
