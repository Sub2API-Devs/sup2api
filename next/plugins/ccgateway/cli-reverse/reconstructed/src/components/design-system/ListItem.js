/**
 * components/design-system/ListItem.tsx
 *
 * 列表项：聚焦指针、选中/禁用/成功等状态色、描述。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ListItem.tsx
 * pieces: chunk-p1yqn9ds.js (3)
 * attribution: fingerprint 1, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  useHoverHighlight,
  userMessageBackgroundMode,
  USER_MESSAGE_BACKGROUND,
} from "../CustomSelect/selectTypeahead.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p1yqn9ds.js:19767-22050 fingerprint (2.1.88 match: ListItem, 0.589)
function ListItem(props) {
  let $ = useMemoCache(47);
  let {
    isFocused,
    isSelected,
    children,
    description,
    showScrollDown,
    showScrollUp,
    styled,
    disabled,
    idle,
    declareCursor,
    onClick,
    hoverStyle,
    onHoverChange,
  } = props;
  let isSelectedFlag = isSelected === undefined ? false : isSelected;
  let isStyled = styled === undefined ? true : styled;
  let isDisabled = disabled === undefined ? false : disabled;
  let isIdle = idle === undefined ? false : idle;
  let hoverStyleValue = hoverStyle === undefined ? "tint" : hoverStyle;
  let isClickable = !isDisabled && onClick !== undefined;
  let tracksHover = !isDisabled && (onClick !== undefined || onHoverChange !== undefined);
  let [isHovered, setIsHovered] = useHoverHighlight(tracksHover);
  let isHighlighted = isHovered && isClickable;
  let backgroundMode = userMessageBackgroundMode(hoverStyleValue);
  let hoverHandlerCached;
  if ($[0] !== onHoverChange || $[1] !== setIsHovered) {
    hoverHandlerCached = (hovered) => {
      setIsHovered(hovered);
      onHoverChange?.(hovered);
    };
    $[0] = onHoverChange;
    $[1] = setIsHovered;
    $[2] = hoverHandlerCached;
  } else hoverHandlerCached = $[2];
  let handleHoverChange = hoverHandlerCached;
  let getTextColorCached;
  if (
    $[3] !== isDisabled ||
    $[4] !== isIdle ||
    $[5] !== isFocused ||
    $[6] !== isSelectedFlag ||
    $[7] !== isStyled
  ) {
    getTextColorCached = function getTextColor() {
      if (isDisabled) {
        return "inactive";
      }
      if (!isStyled) {
        return;
      }
      if (isSelectedFlag) {
        return "success";
      }
      if (isFocused && !isIdle) {
        return "suggestion";
      }
    };
    $[3] = isDisabled;
    $[4] = isIdle;
    $[5] = isFocused;
    $[6] = isSelectedFlag;
    $[7] = isStyled;
    $[8] = getTextColorCached;
  } else getTextColorCached = $[8];
  let getTextColor = getTextColorCached;
  let color = getTextColor();
  const active = isFocused && !isDisabled && declareCursor !== false;
  let t7;
  if ($[9] !== active) {
    t7 = {
      line: 0,
      column: 0,
      active,
    };
    $[9] = active;
    $[10] = t7;
  } else t7 = $[10];
  let cursorRef = useDeclaredCursor(t7);
  const backgroundColor = isHighlighted && backgroundMode === "tint" ? USER_MESSAGE_BACKGROUND : undefined;
  const onClick_2 = isClickable ? onClick : undefined;
  let onMouseEnter;
  if ($[11] !== tracksHover || $[12] !== handleHoverChange) {
    onMouseEnter = tracksHover ? () => handleHoverChange(true) : undefined;
    $[11] = tracksHover;
    $[12] = handleHoverChange;
    $[13] = onMouseEnter;
  } else onMouseEnter = $[13];
  let onMouseLeave;
  if ($[14] !== tracksHover || $[15] !== handleHoverChange) {
    onMouseLeave = tracksHover ? () => handleHoverChange(false) : undefined;
    $[14] = tracksHover;
    $[15] = handleHoverChange;
    $[16] = onMouseLeave;
  } else onMouseLeave = $[16];
  const hovered = isHighlighted && backgroundMode === "pointer";
  const inverse = isHighlighted && backgroundMode === "inverse";
  let indicatorElement;
  if (
    $[17] !== isDisabled ||
    $[18] !== isIdle ||
    $[19] !== isFocused ||
    $[20] !== showScrollDown ||
    $[21] !== showScrollUp ||
    $[22] !== hovered ||
    $[23] !== inverse
  ) {
    indicatorElement = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(ListItemIndicator, {
        disabled: isDisabled,
        isFocused,
        idle: isIdle,
        showScrollUp,
        showScrollDown,
        hovered,
        inverse,
      }),
    });
    $[17] = isDisabled;
    $[18] = isIdle;
    $[19] = isFocused;
    $[20] = showScrollDown;
    $[21] = showScrollUp;
    $[22] = hovered;
    $[23] = inverse;
    $[24] = indicatorElement;
  } else indicatorElement = $[24];
  let labelElement;
  if ($[25] !== children || $[26] !== isDisabled || $[27] !== isStyled || $[28] !== color) {
    labelElement = isStyled
      ? jsxProd_default(Text, {
          color,
          dimColor: isDisabled,
          wrap: "truncate-end",
          children,
        })
      : children;
    $[25] = children;
    $[26] = isDisabled;
    $[27] = isStyled;
    $[28] = color;
    $[29] = labelElement;
  } else labelElement = $[29];
  let selectedMarkElement;
  if ($[30] !== isDisabled || $[31] !== isSelectedFlag) {
    selectedMarkElement =
      isSelectedFlag &&
      !isDisabled &&
      jsxProd_default(Box, {
        flexShrink: 0,
        children: jsxProd_default(Text, {
          "aria-label": "(selected)",
          color: "success",
          children: figures_default.tick,
        }),
      });
    $[30] = isDisabled;
    $[31] = isSelectedFlag;
    $[32] = selectedMarkElement;
  } else selectedMarkElement = $[32];
  let t11;
  if ($[33] !== indicatorElement || $[34] !== labelElement || $[35] !== selectedMarkElement) {
    t11 = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [indicatorElement, labelElement, selectedMarkElement],
    });
    $[33] = indicatorElement;
    $[34] = labelElement;
    $[35] = selectedMarkElement;
    $[36] = t11;
  } else t11 = $[36];
  let t12;
  if ($[37] !== description) {
    t12 =
      description &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: description,
        }),
      });
    $[37] = description;
    $[38] = t12;
  } else t12 = $[38];
  let rowElement;
  if (
    $[39] !== cursorRef ||
    $[40] !== backgroundColor ||
    $[41] !== onClick_2 ||
    $[42] !== onMouseEnter ||
    $[43] !== onMouseLeave ||
    $[44] !== t11 ||
    $[45] !== t12
  ) {
    rowElement = jsxProd_default_2(Box, {
      ref: cursorRef,
      flexDirection: "column",
      backgroundColor,
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [t11, t12],
    });
    $[39] = cursorRef;
    $[40] = backgroundColor;
    $[41] = onClick_2;
    $[42] = onMouseEnter;
    $[43] = onMouseLeave;
    $[44] = t11;
    $[45] = t12;
    $[46] = rowElement;
  } else rowElement = $[46];
  return rowElement;
}
//@ chunk-p1yqn9ds.js:22050-22946 sole-consumer
/**
 * 列表项左侧指示符：禁用、焦点、悬停、可向上/向下滚动时显示不同符号。
 */
function ListItemIndicator(props) {
  let $ = useMemoCache(12);
  let { disabled, isFocused, idle, showScrollUp, showScrollDown, hovered, inverse } = props;
  if (disabled) {
    let hiddenPlaceholder;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      hiddenPlaceholder = jsxProd_default(Text, {
        "aria-hidden": true,
        children: " ",
      });
      $[0] = hiddenPlaceholder;
    } else hiddenPlaceholder = $[0];
    return hiddenPlaceholder;
  }
  if (isFocused) {
    const color = idle ? undefined : "suggestion";
    let pointerElement;
    if ($[1] !== idle || $[2] !== inverse || $[3] !== color) {
      pointerElement = jsxProd_default(Text, {
        "aria-hidden": true,
        color,
        dimColor: idle,
        inverse,
        children: figures_default.pointer,
      });
      $[1] = idle;
      $[2] = inverse;
      $[3] = color;
      $[4] = pointerElement;
    } else pointerElement = $[4];
    return pointerElement;
  }
  if (showScrollDown) {
    let moreBelowArrow;
    if ($[5] !== inverse) {
      moreBelowArrow = jsxProd_default(Text, {
        "aria-label": "(more below)",
        dimColor: true,
        inverse,
        children: figures_default.arrowDown,
      });
      $[5] = inverse;
      $[6] = moreBelowArrow;
    } else moreBelowArrow = $[6];
    return moreBelowArrow;
  }
  if (showScrollUp) {
    let moreAboveArrow;
    if ($[7] !== inverse) {
      moreAboveArrow = jsxProd_default(Text, {
        "aria-label": "(more above)",
        dimColor: true,
        inverse,
        children: figures_default.arrowUp,
      });
      $[7] = inverse;
      $[8] = moreAboveArrow;
    } else moreAboveArrow = $[8];
    return moreAboveArrow;
  }
  if (hovered) {
    let hoverPointer;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      hoverPointer = jsxProd_default(Text, {
        "aria-hidden": true,
        dimColor: true,
        children: figures_default.pointer,
      });
      $[9] = hoverPointer;
    } else hoverPointer = $[9];
    return hoverPointer;
  }
  let blankPlaceholder;
  if ($[10] !== inverse) {
    blankPlaceholder = jsxProd_default(Text, {
      "aria-hidden": true,
      inverse,
      children: " ",
    });
    $[10] = inverse;
    $[11] = blankPlaceholder;
  } else blankPlaceholder = $[11];
  return blankPlaceholder;
}
//@ chunk-p1yqn9ds.js:22946-22950 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1yqn9ds.js:22946", () => {
  init_react_production();
});
export { ListItem };
