/**
 * components/permissions/rules/RecentDenialsTab.tsx
 *
 * 最近被 auto 模式拦截的命令列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/RecentDenialsTab.tsx
 * pieces: chunk-h5wy8vq5.js (11)
 * attribution: placement 7, layout 2, fingerprint 1, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
} from "../../../../vendor/react/cjs/react.production.js";
import { INVISIBLE_SYMBOL_RE } from "../../../utils/emojiPatterns.js";
import {
  hasVisibleText,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  displayField,
  MAX_DISPLAY_UNITS,
  serializeApprovalList,
  replaceLineBreaks,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { truncateToLength, countCodePoints, plural } from "../../../utils/stringUtils.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { statusSnapshot, statusRowTexts } from "../../Spinner/spinnerStatus.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { useTabHeaderFocus } from "../../design-system/Tabs.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { MAX_WIDTH_RATIO, NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { truncateToWidth } from "../../../utils/format.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { useShortcutDisplay } from "../../../keybindings/useKeybindingDisplay.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";
import { AUTO_MODE_PREFIX } from "../../../utils/messages.js";
import { useDialogKeybindings } from "../../../keybindings/dialogKeyHints.js";
import { Blockquote } from "../../Blockquote.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { formatHiddenRowsHint } from "../BashPermissionRequest/commandDisplay.js";
import { formatShortcutHint } from "../../design-system/KeyboardShortcutHint.js";

//@ chunk-h5wy8vq5.js:27043-27047 placement
init_react_production();
//@ chunk-h5wy8vq5.js:27047-27075 placement
var MAX_DENIAL_ROWS = 8;
var MAX_DENIAL_TEXT = 200;
var MIN_DECISION_COLUMN = 80;
var MAX_DENIAL_LINES = 14;
//@ chunk-h5wy8vq5.js:27075-27138 placement
function hasNoVisibleToken(text) {
  return !text.replace(INVISIBLE_SYMBOL_RE, " ").split(/\s+/).some(hasVisibleText);
}
//@ chunk-h5wy8vq5.js:27138-27729 placement
function RecentDenialRow(denial, cache) {
  let cached = cache.get(denial);
  if (cached !== undefined) return cached;
  let payload = serializeApprovalPayload(denial.display, {
    maxUnits: MAX_PAYLOAD_UNITS,
  });
  let label =
    payload.kind !== "withheld" && hasNoVisibleToken(payload.text)
      ? `Call with no description: ${denial.toolName}`
      : denial.display;
  let quote =
    denial.command !== undefined
      ? formatDenialCommand(denial.command)
      : denial.input === undefined
        ? undefined
        : denial.input.kind === "withheld"
          ? {
              ...displayField("Input not shown"),
              refusal: notApprovableHereText("its input can't be read in full"),
            }
          : {
              text: denial.input.text,
              needsGutter: denial.input.needsGutter,
            };
  let isUnreadable = quote === undefined || (quote.refusal === undefined && hasNoVisibleToken(quote.text));
  let row = {
    label,
    isUnreadable,
    quote: isUnreadable
      ? {
          ...displayField("Input not shown"),
          refusal: notApprovableHereText(
            quote === undefined ? "its input wasn't recorded" : "its input can't be read",
          ),
        }
      : quote,
  };
  cache.set(denial, row);
  return row;
}
//@ chunk-h5wy8vq5.js:27729-27767 placement
function quotedReason(denial, index) {
  return RecentDenialRow(denial, index).quote;
}
//@ chunk-h5wy8vq5.js:27767-27805 placement
function shortDenialLabel(denial, index) {
  return RecentDenialRow(denial, index).label;
}
//@ chunk-h5wy8vq5.js:27805-28097 placement
function formatDenialCommand(command) {
  let serialized = serializeApprovalPayload(command, {
    maxUnits: MAX_PAYLOAD_UNITS,
  });
  if (serialized.kind !== "withheld")
    return {
      text: serialized.text,
      needsGutter: serialized.needsGutter,
    };
  let head = truncateToLength(command, MAX_DISPLAY_UNITS);
  let tail = countCodePoints(command.slice(head.length));
  return {
    ...displayField(command),
    refusal: notApprovableHereText(
      tail > 0
        ? `the other ${tail.toLocaleString("en-US")} ${plural(tail, "character")} can't be read`
        : "its command can't be read in full",
    ),
  };
}
//@ chunk-h5wy8vq5.js:28097-28158 layout
function notApprovableHereText(reason) {
  return `This row can't be approved here: ${reason}`;
}
//@ chunk-h5wy8vq5.js:28158-28235 layout
function withoutId(ids, id) {
  if (!ids.has(id)) return ids;
  let next = new Set(ids);
  next.delete(id);
  return next;
}
//@ chunk-h5wy8vq5.js:28235-28980 fingerprint (2.1.88 match: RecentDenialsTab, 0.316)
function RecentDenialsTab(props) {
  let $ = useMemoCache(15);
  let { onHeaderFocusChange, onStateChange, isMidTurn } = props;
  let { getDenials } = statusSnapshot();
  let [denials] = useState(getDenials);
  let t8 = denials.length === 0;
  let hasNone;
  let approved;
  if ($[0] !== t8 || $[1] !== onHeaderFocusChange) {
    hasNone = () => {
      if (t8) onHeaderFocusChange(true);
    };
    approved = [t8, onHeaderFocusChange];
    $[0] = t8;
    $[1] = onHeaderFocusChange;
    $[2] = hasNone;
    $[3] = approved;
  } else {
    hasNone = $[2];
    approved = $[3];
  }
  useEffect(hasNone, approved);
  let retry;
  let deps;
  if ($[4] !== denials || $[5] !== t8 || $[6] !== onStateChange) {
    retry = () => {
      if (t8)
        onStateChange({
          approved: new Set(),
          retry: new Set(),
          denials,
          canMark: false,
        });
    };
    deps = [t8, denials, onStateChange];
    $[4] = denials;
    $[5] = t8;
    $[6] = onStateChange;
    $[7] = retry;
    $[8] = deps;
  } else {
    retry = $[7];
    deps = $[8];
  }
  useLayoutEffect(retry, deps);
  if (t8) {
    let textElement;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      textElement = jsxProd_default(Text, {
        dimColor: true,
        children: "No recent blocks. Commands auto mode blocks will appear here.",
      });
      $[9] = textElement;
    } else textElement = $[9];
    return textElement;
  }
  let recentDenialsListElement;
  if ($[10] !== denials || $[11] !== isMidTurn || $[12] !== onHeaderFocusChange || $[13] !== onStateChange) {
    recentDenialsListElement = jsxProd_default(RecentDenialsList, {
      denials,
      onHeaderFocusChange,
      onStateChange,
      isMidTurn,
    });
    $[10] = denials;
    $[11] = isMidTurn;
    $[12] = onHeaderFocusChange;
    $[13] = onStateChange;
    $[14] = recentDenialsListElement;
  } else recentDenialsListElement = $[14];
  return recentDenialsListElement;
}
//@ chunk-h5wy8vq5.js:28980-33626 sole-consumer
/**
 * 最近 auto 模式拒绝列表：可标记批准（空格）或重试（r），按终端尺寸裁剪显示，聚焦项展开命令全文，状态通过 onStateChange 上报；终端缩小时清除标记。
 */
function RecentDenialsList({ denials, onHeaderFocusChange, onStateChange, isMidTurn }) {
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  useEffect(() => {
    onHeaderFocusChange(headerFocused);
  }, [headerFocused, onHeaderFocusChange]);
  let rowTexts = statusRowTexts();
  let [approved, setApproved] = useState(() => new Set());
  let [retry, setRetry] = useState(() => new Set());
  let [focusedIndex, setFocusedIndex] = useState(0);
  let serialized = useMemo(
    () =>
      serializeApprovalList(
        denials.map((denial) => shortDenialLabel(denial, rowTexts)),
        {
          maxUnits: MAX_PAYLOAD_UNITS,
        },
      ),
    [denials, rowTexts],
  );
  let isScreenReader = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let [prevSize, setPrevSize] = useState({
    rows,
    columns,
  });
  let [wasCleared, setWasCleared] = useState(false);
  if (rows !== prevSize.rows || columns !== prevSize.columns) {
    setPrevSize({
      rows,
      columns,
    });
    if (
      !isScreenReader &&
      approved.size + retry.size > 0 &&
      (rows < prevSize.rows || columns < prevSize.columns)
    ) {
      setApproved(new Set());
      setRetry(new Set());
      setWasCleared(true);
    }
  }
  let max = Math.max(
    1,
    Math.min(MIN_DECISION_COLUMN, Math.floor(columns * MAX_WIDTH_RATIO) - MAX_DENIAL_LINES),
  );
  let denialLabels = useMemo(
    () => serialized.map((denial) => (denial.withheld ? denial.text : truncateToWidth(denial.text, max))),
    [serialized, max],
  );
  let quotedReasons = useMemo(
    () => denials.map((denial) => quotedReason(denial, rowTexts)),
    [denials, rowTexts],
  );
  let focusedReason = isScreenReader ? undefined : quotedReasons[focusedIndex];
  let min = Math.min(10, denials.length);
  let listKey = `${rows}x${columns}:${denials.length}:${focusedReason !== undefined}`;
  let [visibleState, setVisibleState] = useState();
  let visibleCount = visibleState?.listKey === listKey ? visibleState.listed : min;
  let escapeHint =
    retry.size > 0
      ? isMidTurn
        ? `   Esc will tell Claude about ${retry.size} blocked ${plural(retry.size, "call")} at your next prompt`
        : `   Esc will retry ${retry.size} blocked ${plural(retry.size, "call")}`
      : approved.size > 0
        ? `   Esc will approve ${approved.size} blocked ${plural(approved.size, "call")}`
        : "";
  let offerContentKey = useMemo(
    () => ({
      denials,
      focusedIdx: focusedIndex,
      listed: visibleCount,
      listKey,
    }),
    [denials, focusedIndex, visibleCount, listKey],
  );
  let offerBody = FittedOfferBody(focusedReason?.text ?? "", {
    isActive: focusedReason !== undefined,
    isCut: true,
    contentKey: offerContentKey,
    maxRows: MAX_DENIAL_ROWS,
  });
  let hasHiddenRows = offerBody.hiddenRows > 0 || offerBody.hiddenAbove > 0;
  let isTooShort = focusedReason !== undefined && offerBody.isBodyOnScreen === false;
  let isBodyOffscreen = focusedReason !== undefined && offerBody.isBodyOnScreen !== true;
  let refusalText =
    focusedReason?.refusal ??
    (isTooShort ? notApprovableHereText("this terminal is too short to show it") : undefined);
  let trimmed =
    `${wasCleared ? "Marks cleared: terminal shrank. " : ""}${isTooShort ? refusalText : ""}`.trim();
  let [, bumpTick] = useState(0);
  useLayoutEffect(() => {
    bumpTick((tick) => tick + 1);
  }, [offerContentKey]);
  let isSettled = visibleState?.listKey === listKey && visibleState.isSettled;
  let wasShort = visibleState?.listKey === listKey ? visibleState.wasShort : 0;
  let wasFocused = visibleState?.wasFocused;
  useLayoutEffect(() => {
    if (offerBody.shortRows === 0 || isSettled) return;
    if (visibleCount > 1)
      setVisibleState({
        listKey,
        listed: visibleCount - 1,
        isSettled: false,
        wasShort: offerBody.shortRows,
        wasFocused: focusedIndex,
      });
    else if (denials.length === 2 && wasFocused === focusedIndex && offerBody.shortRows >= wasShort)
      setVisibleState({
        listKey,
        listed: 2,
        isSettled: true,
        wasShort,
        wasFocused,
      });
  }, [
    offerBody.shortRows,
    isSettled,
    wasShort,
    wasFocused,
    focusedIndex,
    visibleCount,
    listKey,
    denials.length,
  ]);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let [defaultFocusValue, setDefaultFocusValue] = useState();
  let blockedIndexes = useMemo(
    () =>
      new Set(
        serialized.flatMap((denial, index) =>
          denial.withheld || quotedReasons[index]?.refusal !== undefined ? [index] : [],
        ),
      ),
    [serialized, quotedReasons],
  );
  let blockedOrFocused = useMemo(
    () => (isBodyOffscreen ? new Set(blockedIndexes).add(focusedIndex) : blockedIndexes),
    [isBodyOffscreen, blockedIndexes, focusedIndex],
  );
  let canMark = isScreenReader
    ? blockedIndexes.size < denials.length
    : !blockedIndexes.has(focusedIndex) && !isTooShort;
  useLayoutEffect(() => {
    if (isTooShort) {
      setApproved((approved) => withoutId(approved, focusedIndex));
      setRetry((retry) => withoutId(retry, focusedIndex));
    }
  }, [isTooShort, focusedIndex]);
  useLayoutEffect(() => {
    onStateChange({
      approved,
      retry,
      denials,
      canMark,
    });
  }, [approved, retry, denials, canMark, onStateChange]);
  let [screenReaderFocusIndex, setScreenReaderFocusIndex] = useState();
  let onChange = (optionValue) => {
    let index = Number(optionValue);
    if (isScreenReader) setScreenReaderFocusIndex(index);
    if (!isScreenReader && index !== focusedIndex) {
      setFocusedIndex(index);
      setDefaultFocusValue(optionValue);
      return;
    }
    if (blockedOrFocused.has(index)) return;
    setWasCleared(false);
    setApproved((prev) => {
      let next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setRetry((prev) => withoutId(prev, index));
  };
  let onFocus = (optionValue) => {
    if (Number(optionValue) !== focusedIndex) setFocusedIndex(Number(optionValue));
    if (isScreenReader) setScreenReaderFocusIndex(Number(optionValue));
    setDefaultFocusValue(undefined);
  };
  function onKeyDown(event) {
    if (headerFocused) return;
    if (event.ctrl || event.meta || event.shift) return;
    if (event.key !== "r") return;
    event.preventDefault();
    let index = isScreenReader ? screenReaderFocusIndex : focusedIndex;
    if (index === undefined || blockedOrFocused.has(index)) return;
    setWasCleared(false);
    setRetry((prev) => {
      let next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setApproved((prev) => {
      if (prev.has(index)) return prev;
      let next = new Set(prev);
      next.add(index);
      return next;
    });
  }
  let reasonTexts = useMemo(
    () =>
      denials.map((denial) => {
        let text = denial.reason
          ? replaceLineBreaks(displayField(denial.reason).text).replace(/\s+/g, " ").trim()
          : undefined;
        return text && !isScreenReader ? truncateToWidth(text, MAX_DENIAL_TEXT) : text;
      }),
    [denials, isScreenReader],
  );
  let options = denials.map((denial, index) => {
    let isApproved = approved.has(index);
    let children = retry.has(index)
      ? " (retry)"
      : !isScreenReader
        ? ""
        : isApproved
          ? " (approved)"
          : quotedReasons[index]?.refusal !== undefined
            ? " (can't be approved)"
            : "";
    let reason = reasonTexts[index];
    return {
      label: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: isApproved ? "success" : "error",
            withSpace: true,
          }),
          denialLabels[index],
          jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        ],
      }),
      value: String(index),
      ...(reason && {
        description: `${AUTO_MODE_PREFIX}${reason}`,
        dimDescription: true,
      }),
    };
  });
  return jsxProd_default(useDialogKeybindings, {
    bindings: [
      {
        action: "app:toggleTranscript",
        run: () => {
          if (hasHiddenRows) offerBody.showNextRows();
        },
      },
    ],
    active: focusedReason !== undefined && !headerFocused,
    flexDirection: "column",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown,
      children: [
        trimmed !== "" &&
          jsxProd_default(Text, {
            wrap: "truncate-end",
            children: trimmed,
          }),
        jsxProd_default(Text, {
          children: "Commands auto mode recently blocked. Approving adds no rule.",
        }),
        isScreenReader &&
          denials.map((denial, index) => {
            let reason = quotedReasons[index];
            return (
              reason !== undefined &&
              jsxProd_default_2(
                Box,
                {
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      children: [
                        RecentDenialRow(denial, rowTexts).isUnreadable || denial.command === undefined
                          ? "Input for row"
                          : "Command for row",
                        " ",
                        index + 1,
                        ":",
                      ],
                    }),
                    jsxProd_default(Blockquote, {
                      multiline: true,
                      children: jsxProd_default(Text, {
                        children: reason.text,
                      }),
                    }),
                    reason.refusal !== undefined &&
                      jsxProd_default(Text, {
                        children: reason.refusal,
                      }),
                  ],
                },
                index,
              )
            );
          }),
        jsxProd_default(Box, {
          marginTop: trimmed === "" ? 1 : 0,
          children: jsxProd_default(ModelSelector, {
            options,
            onChange,
            onFocus,
            defaultFocusValue,
            selectedValue: NO_COMMITTED_ROW,
            visibleOptionCount: visibleCount,
            hiddenBelowUnit: "blocked command",
            isDisabled: headerFocused,
            onUpFromFirstItem: focusHeader,
          }),
        }),
        escapeHint !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: escapeHint,
          }),
        focusedReason !== undefined &&
          jsxProd_default(Box, {
            marginTop: escapeHint === "" ? 1 : 0,
            flexDirection: "column",
            children: jsxProd_default_2(DiffFrame, {
              children: [
                jsxProd_default_2(Box, {
                  ref: offerBody.box,
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Blockquote, {
                      multiline: focusedReason.needsGutter,
                      children: jsxProd_default(Box, {
                        ref: offerBody.textBox,
                        flexDirection: "column",
                        flexGrow: 1,
                        children: jsxProd_default(Text, {
                          children: offerBody.text,
                        }),
                      }),
                    }),
                    hasHiddenRows &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        wrap: "truncate-end",
                        children: formatHiddenRowsHint({
                          hiddenRows: offerBody.hiddenRows,
                          hiddenAbove: offerBody.hiddenAbove,
                          hint: headerFocused
                            ? ""
                            : formatShortcutHint({
                                chord,
                                action: offerBody.hiddenRows > 0 ? "see more" : "see the first lines",
                                parens: true,
                                format: {
                                  keyCase: "lower",
                                },
                              }),
                          columns: offerBody.columns,
                        }),
                      }),
                  ],
                }),
                refusalText !== undefined &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: refusalText,
                  }),
              ],
            }),
          }),
      ],
    }),
  });
}
export { quotedReason, RecentDenialsTab };
