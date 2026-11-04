/**
 * components/CustomSelect/selectA11y.tsx
 *
 * 选择框无障碍与键盘导航（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nz9pbsr3.js (22)
 * attribution: placement 22
 */
import {
  init_react_production,
  createContext,
  useRef,
  useState,
  childrenExport,
  useContext,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useMeasured, Input } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useStrayClickGuard } from "./strayClickGuard.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { cellText } from "./selectTable.js";
import { TABLE_FILL_MIN_WIDTH } from "../design-system/Table.js";
import { isDisabledValue, merged as merged_2, isMenuOpen, NO_FOCUS_CONTEXT } from "./select.js";
import { useLatestState } from "./option-map.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ListItem } from "../design-system/ListItem.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useHoverHighlight, USER_MESSAGE_BACKGROUND } from "./selectTypeahead.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { Cursor } from "../../utils/Cursor.js";
import { isNativeCursorEnabled } from "../../ink/nativeCursor.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { inverseText } from "../../ink/screen.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nz9pbsr3.js:904-908 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nz9pbsr3.js:904", () => {
  init_react_production();
});
//@ chunk-nz9pbsr3.js:908-988 placement
var A11Y_SPACE_WIDTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var A11Y_LABEL_GAP;
var A11Y_ROW_PADDING;
var A11Y_STACKED_PADDING;
var WRAP_TRIM;
var A11Y_AUTO_FOCUS_INPUT;
var A11Y_INPUT_CONTEXT;
var A11Y_CYCLE_CONTEXT;
var A11Y_BOOLEAN_CONTEXT;
deferInit("chunk-nz9pbsr3.js:908", () => {
  A11Y_SPACE_WIDTH = 32;
  A11Y_LABEL_GAP = 2;
  A11Y_ROW_PADDING = 2;
  A11Y_STACKED_PADDING = 2;
  WRAP_TRIM = "wrap-trim";
  A11Y_AUTO_FOCUS_INPUT = true;
  A11Y_INPUT_CONTEXT = createContext(undefined);
  A11Y_CYCLE_CONTEXT = createContext(false);
  A11Y_BOOLEAN_CONTEXT = createContext(false);
});
//@ chunk-nz9pbsr3.js:988-3816 placement
function useSelectNavigation({ children, ...props }) {
  let scrollViewportSize = useScrollViewportSize(useTerminalSize());
  let containerRef = useRef(null);
  let [sharedRowLines] = useState(() => new Set());
  let width = useMeasured(() => {
    let [sharedNode] = sharedRowLines;
    return (
      (sharedNode && measureElement(sharedNode).width) ||
      (containerRef.current && measureElement(containerRef.current).width) ||
      scrollViewportSize.columns
    );
  });
  let strayClickGuard = useStrayClickGuard();
  let [pendingValues] = useState(() => new WeakMap());
  let childArray = childrenExport.toArray(children);
  let filtered = childArray.filter(isA11ySection);
  let min = Math.min(
    Math.max(0, ...filtered.map((section) => bunStringWidth(cellText(section.props.label)))),
    Math.max(
      A11Y_SPACE_WIDTH,
      width -
        A11Y_ROW_PADDING -
        A11Y_LABEL_GAP -
        Math.max(
          TABLE_FILL_MIN_WIDTH,
          ...filtered.map((section) => measureA11yValueWidth(section.props.children)),
        ),
    ),
  );
  let isStacked = width - A11Y_ROW_PADDING - min - A11Y_LABEL_GAP < TABLE_FILL_MIN_WIDTH;
  let filtered_2 = filtered.filter((section) => !isChildOfType(section.props.children, A11yTextValue));
  let isDisabled = isDisabledValue(props.isDisabled);
  let contentWidth = isStacked
    ? width - A11Y_ROW_PADDING - A11Y_STACKED_PADDING
    : width - A11Y_ROW_PADDING - min - A11Y_LABEL_GAP;
  let [editingRow, setEditingRow, getEditingRow] = useLatestState(undefined);
  let [refusal, setRefusal] = useState(undefined);
  let inputRef = useRef(null);
  let { focusManager } = useContext(APP_CONTEXT);
  let searchInput = useSearchInput({
    isActive: true,
    columns: contentWidth,
    backspaceExitsOnEmpty: false,
    onExit: () => endEditing(true, true),
    onCancel: () => endEditing(false),
    onExitUp: () => endEditing(true, true),
    onExitDown: () => endEditing(true, true),
  });
  function endEditing(commit, keepOpen = false) {
    let editing = getEditingRow();
    if (editing === undefined) return true;
    let children = filtered.find((row) => row.key === editing.key)?.props.children;
    let query = searchInput.queryRef.current;
    let validationError =
      commit && query !== editing.from && isChildOfType(children, useSelectA11yInput)
        ? (children.props.validate?.(query) ?? null)
        : null;
    if (validationError !== null && keepOpen) {
      setRefusal({
        draft: query,
        reason: validationError,
      });
      return false;
    }
    setEditingRow(undefined);
    setRefusal(undefined);
    if (inputRef.current && focusManager?.activeElement === inputRef.current) focusManager.blur();
    if (
      !commit ||
      validationError !== null ||
      !isChildOfType(children, useSelectA11yInput) ||
      children.props.disabled
    )
      return true;
    if (query !== editing.from) {
      setPendingValue(pendingValues, children.props, query);
      children.props.onChange(query);
    }
    return true;
  }
  function rowActions(row) {
    let children = row?.props.children;
    if (
      !isChildOfType(children, useSelectA11yInput) ||
      children.props.disabled ||
      typeof row?.key !== "string"
    )
      return getA11yValueActions(children, pendingValues);
    let editingTarget = {
      key: row.key,
      from: pendingValueOrValue(children.props, pendingValues),
    };
    return {
      accept: () => {
        endEditing(true);
        searchInput.setQuery(editingTarget.from);
        setEditingRow(editingTarget);
      },
    };
  }
  let mapped = childArray.map((child, index) => {
    if (!isA11ySection(child))
      return isValidElement_default(child) && child.type === merged_2.Heading
        ? child
        : jsxProd_default(
            merged_2.Heading,
            {
              children: child,
            },
            isValidElement_default(child) ? child.key : index,
          );
    let { children } = child.props;
    let label = cellText(child.props.label);
    let reason =
      editingRow?.key === child.key && refusal?.draft === searchInput.query ? refusal.reason : undefined;
    let descriptionText = reason ?? cellText(child.props.description);
    let descriptionLines = descriptionText
      ? countCharInString(
          wrapText(descriptionText, Math.max(1, width - A11Y_ROW_PADDING), WRAP_TRIM),
          `
`,
        ) + 1
      : 0;
    let accept =
      !(!isDisabled || props.onDisabledRowClick !== undefined) || editingRow?.key === child.key
        ? undefined
        : rowActions(child).accept;
    let valueWidth =
      isChildOfType(children, A11yBooleanValue) ||
      isChildOfType(children, A11yCycleValue) ||
      isChildOfType(children, A11yButtonValue)
        ? measureA11yValueWidth(children)
        : 0;
    let children_2 = jsxProd_default(A11ySelectRow, {
      label,
      description: descriptionText,
      ink: child.props.ink,
      refused: reason !== undefined,
      onClick:
        accept &&
        ((event) => {
          if (
            strayClickGuard(event) ||
            (isDisabledValue(props.isDisabled) && props.onDisabledRowClick === undefined)
          )
            return;
          accept();
        }),
      labelColumn: min,
      stacked: isStacked,
      targetWidth: Math.max(0, Math.min(valueWidth, contentWidth)),
      rowLines: isChildOfType(children, A11yTextValue) ? undefined : sharedRowLines,
      children: jsxProd_default(A11Y_INPUT_CONTEXT, {
        value:
          editingRow?.key === child.key &&
          !isDisabled &&
          isChildOfType(children, useSelectA11yInput) &&
          !children.props.disabled
            ? {
                editor: searchInput,
                room: contentWidth,
                input: inputRef,
                end: endEditing,
              }
            : undefined,
        children,
      }),
    });
    return isChildOfType(children, A11yTextValue)
      ? jsxProd_default(
          merged_2.Heading,
          {
            children: children_2,
          },
          child.key,
        )
      : jsxProd_default(
          merged_2.Item,
          {
            declareCursor: editingRow?.key !== child.key,
            lines: (isStacked ? 2 : 1) + descriptionLines,
            children: children_2,
          },
          child.key,
        );
  });
  if (filtered_2.length === 0)
    return jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      children: [
        mapped.length === 0 &&
          props.emptyMessage &&
          jsxProd_default(Text, {
            dimColor: true,
            children: props.emptyMessage,
          }),
        mapped.map((child, index) =>
          jsxProd_default(
            ListItem,
            {
              isFocused: false,
              styled: false,
              children: child,
            },
            isValidElement_default(child) ? child.key : index,
          ),
        ),
      ],
    });
  let children_2 = jsxProd_default(merged_2, {
    ...props,
    rowClick: "move",
    onFocus: (index) => {
      if (filtered_2[index]?.key !== getEditingRow()?.key) endEditing(true);
      props.onFocus?.(index);
    },
    onSelect: (index) => {
      if (getEditingRow() !== undefined) {
        endEditing(true, true);
        return;
      }
      rowActions(filtered_2[index]).accept?.();
    },
    onRowKeyDown: (event, index) => {
      if (getEditingRow() !== undefined) {
        searchInput.handleKeyDown(event);
        return;
      }
      if (event.ctrl || event.meta) return;
      let actions = rowActions(filtered_2[index]);
      let handler =
        event.key === " "
          ? actions.accept
          : event.key === "left"
            ? actions.previous
            : event.key === "right"
              ? actions.next
              : undefined;
      if (handler === undefined) return;
      event.preventDefault();
      handler();
    },
    children: mapped,
  });
  return jsxProd_default(Box, {
    ref: containerRef,
    flexDirection: "column",
    children: jsxProd_default(A11Y_CYCLE_CONTEXT, {
      value: isDisabled,
      children: children_2,
    }),
  });
}
//@ chunk-nz9pbsr3.js:3816-6058 placement
/**
 * 无障碍选择列表的一行：屏幕阅读器模式下输出"标签, 值 + 描述"纯文本；否则两栏或堆叠布局，支持悬停高亮、点击、锁定/被拒样式与描述换行。
 */
function A11ySelectRow(props) {
  let $ = useMemoCache(54);
  let { label, description, ink, refused, onClick, labelColumn, stacked, targetWidth, rowLines, children } =
    props;
  let isMenuOpenFlag = isMenuOpen();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isHovered, setIsHovered] = useHoverHighlight(onClick !== undefined);
  let dropsClick = useContext(NO_FOCUS_CONTEXT);
  if (isScreenReaderEnabled) {
    let labelElement;
    if ($[0] !== label) {
      labelElement = jsxProd_default_2(Text, {
        children: [label, ","],
      });
      $[0] = label;
      $[1] = labelElement;
    } else labelElement = $[1];
    let labelRow;
    if ($[2] !== children || $[3] !== labelElement) {
      labelRow = jsxProd_default_2(Box, {
        children: [labelElement, children],
      });
      $[2] = children;
      $[3] = labelElement;
      $[4] = labelRow;
    } else labelRow = $[4];
    let descriptionElement;
    if ($[5] !== description) {
      descriptionElement =
        description &&
        jsxProd_default(Text, {
          children: description,
        });
      $[5] = description;
      $[6] = descriptionElement;
    } else descriptionElement = $[6];
    let screenReaderRow;
    if ($[7] !== labelRow || $[8] !== descriptionElement) {
      screenReaderRow = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [labelRow, descriptionElement],
      });
      $[7] = labelRow;
      $[8] = descriptionElement;
      $[9] = screenReaderRow;
    } else screenReaderRow = $[9];
    return screenReaderRow;
  }
  let ref;
  if ($[10] !== rowLines) {
    ref = (rowRef) => {
      let parentNode = rowRef?.parentNode;
      if (!rowLines || !parentNode) {
        return;
      }
      rowLines.add(parentNode);
      return () => {
        rowLines.delete(parentNode);
      };
    };
    $[10] = rowLines;
    $[11] = ref;
  } else ref = $[11];
  const flexDirection = stacked ? "column" : "row";
  const width = stacked ? undefined : labelColumn;
  const marginRight = stacked ? 0 : A11Y_LABEL_GAP;
  const dimColor = ink === "locked";
  const color = isMenuOpenFlag && ink !== "locked" ? "suggestion" : undefined;
  let children_2;
  if ($[12] !== label || $[13] !== dimColor || $[14] !== color) {
    children_2 = jsxProd_default(Text, {
      dimColor,
      color,
      wrap: "truncate-end",
      children: label,
    });
    $[12] = label;
    $[13] = dimColor;
    $[14] = color;
    $[15] = children_2;
  } else children_2 = $[15];
  let labelColumnElement;
  if ($[16] !== width || $[17] !== marginRight || $[18] !== children_2) {
    labelColumnElement = jsxProd_default(Box, {
      width,
      marginRight,
      flexShrink: 0,
      children: children_2,
    });
    $[16] = width;
    $[17] = marginRight;
    $[18] = children_2;
    $[19] = labelColumnElement;
  } else labelColumnElement = $[19];
  const paddingLeft = stacked ? A11Y_STACKED_PADDING : 0;
  const backgroundColor = isHovered ? USER_MESSAGE_BACKGROUND : undefined;
  let onClick_2;
  if ($[20] !== dropsClick || $[21] !== onClick) {
    onClick_2 =
      onClick &&
      ((event) => {
        if (!dropsClick(event)) onClick(event);
      });
    $[20] = dropsClick;
    $[21] = onClick;
    $[22] = onClick_2;
  } else onClick_2 = $[22];
  let onMouseEnter;
  if ($[23] !== onClick || $[24] !== setIsHovered) {
    onMouseEnter = onClick && (() => setIsHovered(true));
    $[23] = onClick;
    $[24] = setIsHovered;
    $[25] = onMouseEnter;
  } else onMouseEnter = $[25];
  let onMouseLeave;
  if ($[26] !== onClick || $[27] !== setIsHovered) {
    onMouseLeave = onClick && (() => setIsHovered(false));
    $[26] = onClick;
    $[27] = setIsHovered;
    $[28] = onMouseLeave;
  } else onMouseLeave = $[28];
  const value = ink !== undefined;
  let children_3;
  if ($[29] !== children || $[30] !== value) {
    children_3 = jsxProd_default(A11Y_BOOLEAN_CONTEXT, {
      value,
      children,
    });
    $[29] = children;
    $[30] = value;
    $[31] = children_3;
  } else children_3 = $[31];
  let children_4;
  if (
    $[32] !== backgroundColor ||
    $[33] !== onClick_2 ||
    $[34] !== onMouseEnter ||
    $[35] !== onMouseLeave ||
    $[36] !== children_3 ||
    $[37] !== targetWidth
  ) {
    children_4 = jsxProd_default(Box, {
      minWidth: targetWidth,
      backgroundColor,
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: children_3,
    });
    $[32] = backgroundColor;
    $[33] = onClick_2;
    $[34] = onMouseEnter;
    $[35] = onMouseLeave;
    $[36] = children_3;
    $[37] = targetWidth;
    $[38] = children_4;
  } else children_4 = $[38];
  let valueBox;
  if ($[39] !== children_4 || $[40] !== paddingLeft) {
    valueBox = jsxProd_default(Box, {
      paddingLeft,
      children: children_4,
    });
    $[39] = children_4;
    $[40] = paddingLeft;
    $[41] = valueBox;
  } else valueBox = $[41];
  let mainRow;
  if ($[42] !== valueBox || $[43] !== flexDirection || $[44] !== labelColumnElement) {
    mainRow = jsxProd_default_2(Box, {
      flexDirection,
      children: [labelColumnElement, valueBox],
    });
    $[42] = valueBox;
    $[43] = flexDirection;
    $[44] = labelColumnElement;
    $[45] = mainRow;
  } else mainRow = $[45];
  let descriptionText;
  if ($[46] !== description || $[47] !== refused || $[48] !== rowLines) {
    descriptionText =
      description &&
      jsxProd_default(Text, {
        dimColor: !refused,
        color: refused ? "error" : undefined,
        wrap: rowLines === undefined ? "truncate-end" : WRAP_TRIM,
        children: description,
      });
    $[46] = description;
    $[47] = refused;
    $[48] = rowLines;
    $[49] = descriptionText;
  } else descriptionText = $[49];
  let rowElement;
  if ($[50] !== ref || $[51] !== mainRow || $[52] !== descriptionText) {
    rowElement = jsxProd_default_2(Box, {
      ref,
      flexDirection: "column",
      children: [mainRow, descriptionText],
    });
    $[50] = ref;
    $[51] = mainRow;
    $[52] = descriptionText;
    $[53] = rowElement;
  } else rowElement = $[53];
  return rowElement;
}
//@ chunk-nz9pbsr3.js:6058-6769 placement
/**
 * 选择行的值文本：屏幕阅读器下读 spoken（禁用加 ", unavailable"），否则显示 before/children/after，禁用或锁定时变暗。
 */
function A11yValueText(props) {
  let $ = useMemoCache(15);
  let { spoken, disabled, before, after, children } = props;
  let isDisabled = disabled === undefined ? false : disabled;
  let isMenuOpenFlag = isMenuOpen();
  let booleanContext = useContext(A11Y_BOOLEAN_CONTEXT);
  if (useIsScreenReaderEnabled()) {
    const unavailableSuffix = isDisabled && ", unavailable";
    let spokenElement;
    if ($[0] !== spoken || $[1] !== unavailableSuffix) {
      spokenElement = jsxProd_default_2(Text, {
        children: [spoken, unavailableSuffix],
      });
      $[0] = spoken;
      $[1] = unavailableSuffix;
      $[2] = spokenElement;
    } else spokenElement = $[2];
    return spokenElement;
  }
  const dimColor = isDisabled || booleanContext;
  let beforeElement;
  if ($[3] !== before) {
    beforeElement =
      before &&
      jsxProd_default(Text, {
        dimColor: true,
        children: before,
      });
    $[3] = before;
    $[4] = beforeElement;
  } else beforeElement = $[4];
  const color = isMenuOpenFlag && !isDisabled && !booleanContext ? "suggestion" : undefined;
  let valueElement;
  if ($[5] !== children || $[6] !== color) {
    valueElement = jsxProd_default(Text, {
      color,
      children,
    });
    $[5] = children;
    $[6] = color;
    $[7] = valueElement;
  } else valueElement = $[7];
  let afterElement;
  if ($[8] !== after) {
    afterElement =
      after &&
      jsxProd_default(Text, {
        dimColor: true,
        children: after,
      });
    $[8] = after;
    $[9] = afterElement;
  } else afterElement = $[9];
  let textElement;
  if ($[10] !== dimColor || $[11] !== beforeElement || $[12] !== valueElement || $[13] !== afterElement) {
    textElement = jsxProd_default_2(Text, {
      dimColor,
      wrap: "truncate-end",
      children: [beforeElement, valueElement, afterElement],
    });
    $[10] = dimColor;
    $[11] = beforeElement;
    $[12] = valueElement;
    $[13] = afterElement;
    $[14] = textElement;
  } else textElement = $[14];
  return textElement;
}
//@ chunk-nz9pbsr3.js:6769-6879 placement
function A11ySection(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let fragment;
  if ($[0] !== children) {
    fragment = jsxProd_default(Fragment, {
      children,
    });
    $[0] = children;
    $[1] = fragment;
  } else fragment = $[1];
  return fragment;
}
//@ chunk-nz9pbsr3.js:6879-7085 placement
function A11yBooleanValue(props) {
  let $ = useMemoCache(4);
  let { value, disabled } = props;
  const spoken = String(value);
  const children = String(value);
  let valueText;
  if ($[0] !== disabled || $[1] !== spoken || $[2] !== children) {
    valueText = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children,
    });
    $[0] = disabled;
    $[1] = spoken;
    $[2] = children;
    $[3] = valueText;
  } else valueText = $[3];
  return valueText;
}
//@ chunk-nz9pbsr3.js:7085-7490 placement
/**
 * 循环选择型值：显示当前选项标签，可用时两侧加 ‹ ›。
 */
function A11yCycleValue(props) {
  let $ = useMemoCache(8);
  let { value, options, disabled } = props;
  let cycleContext = useContext(A11Y_CYCLE_CONTEXT);
  let menuOpen = isMenuOpen();
  let label;
  if ($[0] !== options || $[1] !== value) {
    label = options.find((option) => option.value === value)?.label ?? value;
    $[0] = options;
    $[1] = value;
    $[2] = label;
  } else label = $[2];
  let label_ = label;
  let interactive = !disabled && !cycleContext && (menuOpen || !A11Y_AUTO_FOCUS_INPUT);
  const before = interactive ? "\u2039 " : undefined;
  const after = interactive ? " \u203A" : undefined;
  let valueText;
  if ($[3] !== disabled || $[4] !== label_ || $[5] !== before || $[6] !== after) {
    valueText = jsxProd_default(A11yValueText, {
      spoken: label_,
      disabled,
      before,
      after,
      children: label_,
    });
    $[3] = disabled;
    $[4] = label_;
    $[5] = before;
    $[6] = after;
    $[7] = valueText;
  } else valueText = $[7];
  return valueText;
}
//@ chunk-nz9pbsr3.js:7490-7749 placement
function A11yOpenerValue(props) {
  let $ = useMemoCache(5);
  let { children, disabled } = props;
  const spoken = children ? `${children}, opens` : "opens";
  const after = children ? " \u203A" : "\u203A";
  let valueText;
  if ($[0] !== children || $[1] !== disabled || $[2] !== spoken || $[3] !== after) {
    valueText = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      after,
      children,
    });
    $[0] = children;
    $[1] = disabled;
    $[2] = spoken;
    $[3] = after;
    $[4] = valueText;
  } else valueText = $[4];
  return valueText;
}
//@ chunk-nz9pbsr3.js:7749-7962 placement
function A11yButtonValue(props) {
  let $ = useMemoCache(4);
  let { children, disabled } = props;
  const spoken = children ? `${children}, button` : "button";
  let valueText;
  if ($[0] !== children || $[1] !== disabled || $[2] !== spoken) {
    valueText = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children,
    });
    $[0] = children;
    $[1] = disabled;
    $[2] = spoken;
    $[3] = valueText;
  } else valueText = $[3];
  return valueText;
}
//@ chunk-nz9pbsr3.js:7962-8245 placement
function A11yTextValue(props) {
  let $ = useMemoCache(6);
  let { children, disabled } = props;
  const spoken = children || "empty";
  let children_2;
  if ($[0] !== children) {
    children_2 =
      children ||
      jsxProd_default(Text, {
        dimColor: true,
        children: "\u2014",
      });
    $[0] = children;
    $[1] = children_2;
  } else children_2 = $[1];
  let valueText;
  if ($[2] !== disabled || $[3] !== spoken || $[4] !== children_2) {
    valueText = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children: children_2,
    });
    $[2] = disabled;
    $[3] = spoken;
    $[4] = children_2;
    $[5] = valueText;
  } else valueText = $[5];
  return valueText;
}
//@ chunk-nz9pbsr3.js:8245-10910 placement
/**
 * 可编辑选择框的无障碍输入行为（编辑文本、取消）
 */
function useSelectA11yInput(props) {
  let $ = useMemoCache(75);
  let { value, placeholder, disabled } = props;
  let inputContext = useContext(A11Y_INPUT_CONTEXT);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let terminalFocus = useTerminalFocus();
  if (inputContext === undefined) {
    const spoken = `${value || "empty"}, edit text`;
    let children;
    if ($[0] !== placeholder || $[1] !== value) {
      children =
        value ||
        jsxProd_default(Text, {
          dimColor: true,
          children: placeholder,
        });
      $[0] = placeholder;
      $[1] = value;
      $[2] = children;
    } else children = $[2];
    let readonlyElement;
    if ($[3] !== disabled || $[4] !== spoken || $[5] !== children) {
      readonlyElement = jsxProd_default(A11yValueText, {
        spoken,
        disabled,
        children,
      });
      $[3] = disabled;
      $[4] = spoken;
      $[5] = children;
      $[6] = readonlyElement;
    } else readonlyElement = $[6];
    return readonlyElement;
  }
  let { editor, input, end } = inputContext;
  let AnsiComponent;
  let TextComponent;
  let InputComponent;
  let BoxComponent;
  let KeybindingsComponent;
  let children;
  let scope;
  let bindings;
  let wrap;
  let preserveWhitespace;
  let ref;
  let autoFocus;
  let caret;
  let onKeyDown;
  let onPaste;
  let onBlur;
  if (
    $[7] !== inputContext.room ||
    $[8] !== editor ||
    $[9] !== end ||
    $[10] !== input ||
    $[11] !== isScreenReaderEnabled ||
    $[12] !== terminalFocus
  ) {
    let cursor = Cursor.fromText(editor.query, inputContext.room, editor.cursorOffset);
    let placeholderChar = terminalFocus && !isScreenReaderEnabled && !isNativeCursorEnabled() ? " " : "";
    let exitUp;
    if ($[29] !== end) {
      exitUp = () => (end(true, true) ? false : undefined);
      $[29] = end;
      $[30] = exitUp;
    } else exitUp = $[30];
    let run = exitUp;
    KeybindingsComponent = useDialogKeybindings;
    scope = "Select";
    let cancelBinding;
    if ($[31] !== end) {
      cancelBinding = {
        action: "select:cancel",
        run: () => {
          end(false);
        },
      };
      $[31] = end;
      $[32] = cancelBinding;
    } else cancelBinding = $[32];
    let firstBinding;
    if ($[33] !== editor) {
      firstBinding = {
        action: "select:first",
        run: () => editor.setCursorOffset(0),
      };
      $[33] = editor;
      $[34] = firstBinding;
    } else firstBinding = $[34];
    let lastBinding;
    if ($[35] !== editor) {
      lastBinding = {
        action: "select:last",
        run: () => editor.setCursorOffset(editor.queryRef.current.length),
      };
      $[35] = editor;
      $[36] = lastBinding;
    } else lastBinding = $[36];
    let previousBinding;
    let nextBinding;
    if ($[37] !== run) {
      previousBinding = {
        action: "select:previous",
        run,
      };
      nextBinding = {
        action: "select:next",
        run,
      };
      $[37] = run;
      $[38] = previousBinding;
      $[39] = nextBinding;
    } else {
      previousBinding = $[38];
      nextBinding = $[39];
    }
    if (
      $[40] !== cancelBinding ||
      $[41] !== firstBinding ||
      $[42] !== lastBinding ||
      $[43] !== previousBinding ||
      $[44] !== nextBinding
    ) {
      bindings = [cancelBinding, firstBinding, lastBinding, previousBinding, nextBinding];
      $[40] = cancelBinding;
      $[41] = firstBinding;
      $[42] = lastBinding;
      $[43] = previousBinding;
      $[44] = nextBinding;
      $[45] = bindings;
    } else bindings = $[45];
    BoxComponent = Box;
    if ($[46] !== end) {
      onBlur = (blurEvent) => end(blurEvent.relatedTarget !== null);
      $[46] = end;
      $[47] = onBlur;
    } else onBlur = $[47];
    InputComponent = Input;
    ref = input;
    autoFocus = true;
    caret = {
      line: 0,
      column: cursor.getPosition().column,
      visible: true,
    };
    if ($[48] !== editor) {
      onKeyDown = (event) => {
        editor.handleKeyDown(event);
        if (event.defaultPrevented) event.stopImmediatePropagation();
      };
      $[48] = editor;
      $[49] = onKeyDown;
    } else onKeyDown = $[49];
    onPaste = editor.handlePaste;
    TextComponent = Text;
    wrap = "truncate-end";
    preserveWhitespace = true;
    AnsiComponent = Ansi;
    children = cursor.render(
      placeholderChar,
      "",
      inverseText,
      undefined,
      1,
      undefined,
      undefined,
      isScreenReaderEnabled,
    );
    $[7] = inputContext.room;
    $[8] = editor;
    $[9] = end;
    $[10] = input;
    $[11] = isScreenReaderEnabled;
    $[12] = terminalFocus;
    $[13] = AnsiComponent;
    $[14] = TextComponent;
    $[15] = InputComponent;
    $[16] = BoxComponent;
    $[17] = KeybindingsComponent;
    $[18] = children;
    $[19] = scope;
    $[20] = bindings;
    $[21] = wrap;
    $[22] = preserveWhitespace;
    $[23] = ref;
    $[24] = autoFocus;
    $[25] = caret;
    $[26] = onKeyDown;
    $[27] = onPaste;
    $[28] = onBlur;
  } else {
    AnsiComponent = $[13];
    TextComponent = $[14];
    InputComponent = $[15];
    BoxComponent = $[16];
    KeybindingsComponent = $[17];
    children = $[18];
    scope = $[19];
    bindings = $[20];
    wrap = $[21];
    preserveWhitespace = $[22];
    ref = $[23];
    autoFocus = $[24];
    caret = $[25];
    onKeyDown = $[26];
    onPaste = $[27];
    onBlur = $[28];
  }
  let children_2;
  if ($[50] !== AnsiComponent || $[51] !== children) {
    children_2 = jsxProd_default(AnsiComponent, {
      children,
    });
    $[50] = AnsiComponent;
    $[51] = children;
    $[52] = children_2;
  } else children_2 = $[52];
  let children_3;
  if ($[53] !== TextComponent || $[54] !== children_2 || $[55] !== wrap || $[56] !== preserveWhitespace) {
    children_3 = jsxProd_default(TextComponent, {
      wrap,
      "aria-preserve-whitespace": preserveWhitespace,
      children: children_2,
    });
    $[53] = TextComponent;
    $[54] = children_2;
    $[55] = wrap;
    $[56] = preserveWhitespace;
    $[57] = children_3;
  } else children_3 = $[57];
  let children_4;
  if (
    $[58] !== InputComponent ||
    $[59] !== children_3 ||
    $[60] !== ref ||
    $[61] !== autoFocus ||
    $[62] !== caret ||
    $[63] !== onKeyDown ||
    $[64] !== onPaste
  ) {
    children_4 = jsxProd_default(InputComponent, {
      ref,
      autoFocus,
      caret,
      onKeyDown,
      onPaste,
      children: children_3,
    });
    $[58] = InputComponent;
    $[59] = children_3;
    $[60] = ref;
    $[61] = autoFocus;
    $[62] = caret;
    $[63] = onKeyDown;
    $[64] = onPaste;
    $[65] = children_4;
  } else children_4 = $[65];
  let children_5;
  if ($[66] !== BoxComponent || $[67] !== children_4 || $[68] !== onBlur) {
    children_5 = jsxProd_default(BoxComponent, {
      onBlur,
      children: children_4,
    });
    $[66] = BoxComponent;
    $[67] = children_4;
    $[68] = onBlur;
    $[69] = children_5;
  } else children_5 = $[69];
  let inputElement;
  if ($[70] !== KeybindingsComponent || $[71] !== scope || $[72] !== bindings || $[73] !== children_5) {
    inputElement = jsxProd_default(KeybindingsComponent, {
      scope,
      bindings,
      children: children_5,
    });
    $[70] = KeybindingsComponent;
    $[71] = scope;
    $[72] = bindings;
    $[73] = children_5;
    $[74] = inputElement;
  } else inputElement = $[74];
  return inputElement;
}
//@ chunk-nz9pbsr3.js:10910-11310 placement
/**
 * 计算各种值组件的显示宽度（布尔、循环选项取最长标签加箭头、打开、按钮、文本、输入框），用于对齐值列。
 */
function measureA11yValueWidth(children) {
  if (isChildOfType(children, A11yBooleanValue)) return bunStringWidth("false");
  if (isChildOfType(children, A11yCycleValue))
    return (
      Math.max(0, ...children.props.options.map((option) => a11yLabelWidth(option.label))) +
      (children.props.disabled ? 0 : bunStringWidth("\u2039  \u203A"))
    );
  if (isChildOfType(children, A11yOpenerValue)) {
    let { children: children_2 } = children.props;
    return children_2 ? a11yLabelWidth(children_2) + bunStringWidth(" \u203A") : bunStringWidth("\u203A");
  }
  if (isChildOfType(children, A11yButtonValue)) return a11yLabelWidth(children.props.children ?? "");
  if (isChildOfType(children, A11yTextValue)) return a11yLabelWidth(children.props.children || "\u2014");
  if (isChildOfType(children, useSelectA11yInput))
    return a11yLabelWidth(children.props.value || (children.props.placeholder ?? "")) + 1;
  return 0;
}
//@ chunk-nz9pbsr3.js:11310-11365 placement
/**
 * 计算无障碍值区域宽度：文本宽度 + 空格数 + 1（无文本时为 2）。
 */
function a11yValueWidth(description) {
  let text = cellText(description);
  return 2 + (text ? countCharInString(text, " ") + 1 : 0);
}
//@ chunk-nz9pbsr3.js:11365-11431 placement
function a11yLabelWidth(text) {
  return Math.max(
    0,
    ...text
      .split(
        `
`,
      )
      .map((line) => bunStringWidth(line)),
  );
}
//@ chunk-nz9pbsr3.js:11431-11986 placement
/**
 * 为值组件给出键盘动作：布尔切换、循环选项前后切换并 onChange、打开器 onOpen、按钮 onPress。
 */
function getA11yValueActions(children, pendingValues) {
  if (isChildOfType(children, A11yBooleanValue) && !children.props.disabled) {
    let toggle = toggleBooleanValue.bind(undefined, children.props, pendingValues);
    return {
      accept: toggle,
      previous: toggle,
      next: toggle,
    };
  }
  if (isChildOfType(children, A11yCycleValue) && !children.props.disabled) {
    let { props } = children;
    let cycle = (direction) => () => {
      let optionCount = props.options.length;
      let index = props.options.findIndex(
        (option) => option.value === (pendingValues.get(props) ?? props.value),
      );
      let max = Math.max(index, direction === 1 ? -1 : 0);
      let nextOption = props.options[(max + direction + optionCount) % optionCount];
      if (nextOption === undefined) return;
      setPendingValue(pendingValues, props, nextOption.value);
      props.onChange(nextOption.value);
    };
    return {
      accept: cycle(1),
      next: cycle(1),
      previous: cycle(-1),
    };
  }
  if (isChildOfType(children, A11yOpenerValue) && !children.props.disabled)
    return {
      accept: children.props.onOpen,
      next: children.props.onOpen,
    };
  if (isChildOfType(children, A11yButtonValue) && !children.props.disabled)
    return {
      accept: children.props.onPress,
    };
  return {};
}
//@ chunk-nz9pbsr3.js:11986-12054 placement
function toggleBooleanValue(props, pendingValues) {
  let nextValue = !(pendingValues.get(props) ?? props.value);
  setPendingValue(pendingValues, props, nextValue);
  props.onChange(nextValue);
}
//@ chunk-nz9pbsr3.js:12054-12116 placement
function setPendingValue(pendingValues, props, value) {
  pendingValues.set(props, value);
  queueMicrotask(() => pendingValues.delete(props));
}
//@ chunk-nz9pbsr3.js:12116-12185 placement
function pendingValueOrValue(props, pendingValues) {
  let pending = pendingValues.get(props);
  return typeof pending === "string" ? pending : props.value;
}
//@ chunk-nz9pbsr3.js:12185-12226 placement
function isA11ySection(child) {
  return isValidElement_default(child) && child.type === A11ySection;
}
//@ chunk-nz9pbsr3.js:12226-12267 placement
function isChildOfType(children, componentType) {
  return isValidElement_default(children) && children.type === componentType;
}
//@ chunk-nz9pbsr3.js:12267-12356 placement
var merged; // deferred: uses useSelectNavigation of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nz9pbsr3.js:12267", () => {
  merged = Object.assign(useSelectNavigation, {
    Field: A11ySection,
    Toggle: A11yBooleanValue,
    Select: A11yCycleValue,
    Text: useSelectA11yInput,
    Link: A11yOpenerValue,
    Button: A11yButtonValue,
    Value: A11yTextValue,
  });
});
export { a11yValueWidth, merged };
