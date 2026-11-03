/**
 * components/ErrorText.tsx
 *
 * 错误文本组件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d051nw0y.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { errorMessage } from "../utils/errors.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";

/**
 * 以错误颜色显示错误信息，无错误时不渲染。
 */
//@ chunk-d051nw0y.js:331-526 placement
function ErrorText(m) {
  let p = w(4),
    { error: error } = m;
  if (!error) {
    return null;
  }
  let o;
  if (p[0] !== error) ((o = errorMessage(error)), (p[0] = error), (p[1] = o));
  else o = p[1];
  let f;
  if (p[2] !== o) ((f = e(Text, { color: "error", children: o })), (p[2] = o), (p[3] = f));
  else f = p[3];
  return f;
}

export { ErrorText };
