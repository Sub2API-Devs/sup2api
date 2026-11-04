/**
 * ink/hooks/use-declared-cursor.ts
 *
 * useDeclaredCursor：组件声明真实终端光标位置（输入法与无障碍用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-declared-cursor.ts
 * pieces: chunk-x6v6jz2y.js (1)
 * attribution: fingerprint 1
 */
import {
  useContext,
  useRef,
  useCallback,
  useLayoutEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { createContextLazy } from "../../../vendor/convert-to-spaces/dist/index.js";

//@ chunk-x6v6jz2y.js:19403-19648 fingerprint = useDeclaredCursor (0.924)
/**
 * 声明光标位置：组件挂载点 + (line, column) 相对位置，active 时交给 Ink（每帧把真实终端光标停到那里，供 IME 与屏幕阅读器），卸载或失活时撤销。
 */
function useDeclaredCursor({ line, column, active, visible = false }) {
  let setCursorDeclaration = useContext(createContextLazy);
  let nodeRef = useRef(null);
  let setNode = useCallback((node) => {
    nodeRef.current = node;
  }, []);
  useLayoutEffect(() => {
    let node = nodeRef.current;
    if (active && node)
      setCursorDeclaration({
        relativeX: column,
        relativeY: line,
        node,
        visible,
      });
    else setCursorDeclaration(null, node);
  });
  useLayoutEffect(
    () => () => {
      setCursorDeclaration(null, nodeRef.current);
    },
    [setCursorDeclaration],
  );
  return setNode;
}
export { useDeclaredCursor };
