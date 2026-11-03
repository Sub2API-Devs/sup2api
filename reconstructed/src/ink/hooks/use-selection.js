/**
 * ink/hooks/use-selection.ts
 *
 * useSelection / useHasSelection：订阅鼠标选区状态、复制选区
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-selection.ts
 * pieces: chunk-x6v6jz2y.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { Se, yt } from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../terminalModes.js";
import { di } from "../terminal.js";

//@ chunk-x6v6jz2y.js:27033-27061 affinity
var noopSubscribe = () => () => {},
  alwaysFalse = () => !1;
/**
 * 订阅式读取“是否有选区”（useSyncExternalStore）。
 */
//@ chunk-x6v6jz2y.js:27061-27197 fingerprint = useHasSelection (1)
function useHasSelection(o = !0) {
  Se(StdinContextAlias);
  let r = o ? di().get(process.stdout) : void 0;
  return yt(r ? r.subscribeToSelectionChange : noopSubscribe, r ? r.hasTextSelection : alwaysFalse);
}

export { useHasSelection };
