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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { errorMessage } from "../utils/errors.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";

//@ chunk-d051nw0y.js:331-526 placement
/**
 * 以错误颜色显示错误信息，无错误时不渲染。
 */
function ErrorText(props) {
  let $ = useMemoCache(4);
  let { error } = props;
  if (!error) {
    return null;
  }
  let children;
  if ($[0] !== error) {
    children = errorMessage(error);
    $[0] = error;
    $[1] = children;
  } else children = $[1];
  let textNode;
  if ($[2] !== children) {
    textNode = jsxProd_default(Text, {
      color: "error",
      children,
    });
    $[2] = children;
    $[3] = textNode;
  } else textNode = $[3];
  return textNode;
}
export { ErrorText };
