/**
 * components/CustomSelect/select-option.tsx
 *
 * 单个选项行渲染（聚焦指针、选中标记、描述）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select-option.tsx
 * pieces: chunk-p1yqn9ds.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ListItem } from "../design-system/ListItem.js";

//@ chunk-p1yqn9ds.js:25631-26120 fingerprint (2.1.88 match: SelectOption, 0.897)
function SelectOption(props) {
  let $ = useMemoCache(10);
  let {
    isFocused,
    isSelected,
    children,
    description,
    shouldShowDownArrow,
    shouldShowUpArrow,
    declareCursor,
    onClick,
    hoverStyle,
  } = props;
  let t1;
  if (
    $[0] !== children ||
    $[1] !== declareCursor ||
    $[2] !== description ||
    $[3] !== hoverStyle ||
    $[4] !== isFocused ||
    $[5] !== isSelected ||
    $[6] !== onClick ||
    $[7] !== shouldShowDownArrow ||
    $[8] !== shouldShowUpArrow
  ) {
    t1 = jsxProd_default(ListItem, {
      isFocused,
      isSelected,
      description,
      showScrollDown: shouldShowDownArrow,
      showScrollUp: shouldShowUpArrow,
      styled: false,
      declareCursor,
      onClick,
      hoverStyle,
      children,
    });
    $[0] = children;
    $[1] = declareCursor;
    $[2] = description;
    $[3] = hoverStyle;
    $[4] = isFocused;
    $[5] = isSelected;
    $[6] = onClick;
    $[7] = shouldShowDownArrow;
    $[8] = shouldShowUpArrow;
    $[9] = t1;
  } else t1 = $[9];
  return t1;
}
export { SelectOption };
