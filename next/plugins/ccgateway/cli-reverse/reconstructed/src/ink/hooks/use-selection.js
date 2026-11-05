/**
 * ink/hooks/use-selection.ts
 *
 * useSelection / useHasSelection：订阅鼠标选区状态、复制选区
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-selection.ts
 * pieces: chunk-emhzq435.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useContext, useSyncExternalStore } from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../terminalModes.js";
import { getSecondRootError } from "../terminal.js";

//@ chunk-emhzq435.js:26794-26822 affinity
var noopSubscribe = () => () => {};
var alwaysFalse = () => false;
//@ chunk-emhzq435.js:26822-26958 fingerprint (2.1.88 match: useHasSelection, 1)
/**
 * 订阅式读取“是否有选区”（useSyncExternalStore）。
 */
function useHasSelection(enabled = true) {
  useContext(StdinContextAlias);
  let ink = enabled ? getSecondRootError().get(process.stdout) : undefined;
  return useSyncExternalStore(
    ink ? ink.subscribeToSelectionChange : noopSubscribe,
    ink ? ink.hasTextSelection : alwaysFalse,
  );
}
export { useHasSelection };
