/**
 * components/CustomSelect/select-option.tsx
 *
 * 单个选项行渲染（聚焦指针、选中标记、描述）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/select-option.tsx
 * pieces: chunk-ey2qag4x.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ListItem } from "../design-system/ListItem.js";

//@ chunk-ey2qag4x.js:25844-26333 fingerprint = SelectOption (0.897)
function SelectOption(t0) {
  let $ = w(10),
    {
      isFocused: isFocused,
      isSelected: isSelected,
      children: children,
      description: description,
      shouldShowDownArrow: shouldShowDownArrow,
      shouldShowUpArrow: shouldShowUpArrow,
      declareCursor: declareCursor,
      onClick: onClick,
      hoverStyle: hoverStyle,
    } = t0,
    t1;
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
  )
    ((t1 = e(ListItem, {
      isFocused: isFocused,
      isSelected: isSelected,
      description: description,
      showScrollDown: shouldShowDownArrow,
      showScrollUp: shouldShowUpArrow,
      styled: !1,
      declareCursor: declareCursor,
      onClick: onClick,
      hoverStyle: hoverStyle,
      children: children,
    })),
      ($[0] = children),
      ($[1] = declareCursor),
      ($[2] = description),
      ($[3] = hoverStyle),
      ($[4] = isFocused),
      ($[5] = isSelected),
      ($[6] = onClick),
      ($[7] = shouldShowDownArrow),
      ($[8] = shouldShowUpArrow),
      ($[9] = t1));
  else t1 = $[9];
  return t1;
}

export { SelectOption };
