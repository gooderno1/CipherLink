import { EditorState, Extension, Prec, StateField, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export function createPublicEnvelopeGuard(
  isEnvelope: (state: EditorState) => boolean,
): Extension {
  const envelopeReadOnly = StateField.define<boolean>({
    create: isEnvelope,
    update: (value, transaction) => transaction.docChanged ? isEnvelope(transaction.state) : value,
    provide: (field) => [
      Prec.highest(EditorView.editable.from(field, (secureEnvelope) => !secureEnvelope)),
      Prec.highest(EditorView.contentAttributes.from(field, (secureEnvelope) =>
        secureEnvelope ? { contenteditable: "false", "aria-readonly": "true" } : {},
      )),
    ],
  });
  const publicInputGuard = Prec.highest(EditorState.changeFilter.of((transaction) => {
    if (!transaction.docChanged || !transaction.annotation(Transaction.userEvent)) return true;
    return !isEnvelope(transaction.startState);
  }));
  return [envelopeReadOnly, publicInputGuard];
}
