/**
 * components/permissions/rules/RecentDenialsTab.tsx
 *
 * 最近被 auto 模式拦截的命令列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/RecentDenialsTab.tsx
 * pieces: chunk-p2qwpk2k.js (11)
 * attribution: placement 7, layout 2, fingerprint 1, sole-consumer 1
 */
import { init_react_production, y, P, zt, Q } from "../../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../../vendor/react/compiler-runtime.js";
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

//@ chunk-p2qwpk2k.js:25922-25926 placement
init_react_production();
//@ chunk-p2qwpk2k.js:25926-25954 placement
var MAX_DENIAL_ROWS = 8;
var MAX_DENIAL_TEXT = 200;
var MIN_DECISION_COLUMN = 80;
var MAX_DENIAL_LINES = 14;
//@ chunk-p2qwpk2k.js:25954-26017 placement
function hasNoVisibleToken(text) {
  return !text.replace(INVISIBLE_SYMBOL_RE, " ").split(/\s+/).some(hasVisibleText);
}
//@ chunk-p2qwpk2k.js:26017-26608 placement
function RecentDenialRow(h, i) {
  let m = i.get(h);
  if (m !== undefined) return m;
  let a = serializeApprovalPayload(h.display, {
    maxUnits: MAX_PAYLOAD_UNITS,
  });
  let label =
    a.kind !== "withheld" && hasNoVisibleToken(a.text)
      ? `Call with no description: ${h.toolName}`
      : h.display;
  let v =
    h.command !== undefined
      ? formatDenialCommand(h.command)
      : h.input === undefined
        ? undefined
        : h.input.kind === "withheld"
          ? {
              ...displayField("Input not shown"),
              refusal: notApprovableHereText("its input can't be read in full"),
            }
          : {
              text: h.input.text,
              needsGutter: h.input.needsGutter,
            };
  let x = v === undefined || (v.refusal === undefined && hasNoVisibleToken(v.text));
  let C = {
    label,
    isUnreadable: x,
    quote: x
      ? {
          ...displayField("Input not shown"),
          refusal: notApprovableHereText(
            v === undefined ? "its input wasn't recorded" : "its input can't be read",
          ),
        }
      : v,
  };
  i.set(h, C);
  return C;
}
//@ chunk-p2qwpk2k.js:26608-26646 placement
function quotedReason(h, i) {
  return RecentDenialRow(h, i).quote;
}
//@ chunk-p2qwpk2k.js:26646-26684 placement
function shortDenialLabel(denial, i) {
  return RecentDenialRow(denial, i).label;
}
//@ chunk-p2qwpk2k.js:26684-26977 placement
function formatDenialCommand(command) {
  let i = serializeApprovalPayload(command, {
    maxUnits: MAX_PAYLOAD_UNITS,
  });
  if (i.kind !== "withheld")
    return {
      text: i.text,
      needsGutter: i.needsGutter,
    };
  let m = truncateToLength(command, MAX_DISPLAY_UNITS);
  let a = countCodePoints(command.slice(m.length));
  return {
    ...displayField(command),
    refusal: notApprovableHereText(
      a > 0
        ? `the other ${a.toLocaleString("en-US")} ${plural(a, "character")} can't be read`
        : "its command can't be read in full",
    ),
  };
}
//@ chunk-p2qwpk2k.js:26977-27038 layout
function notApprovableHereText(h) {
  return `This row can't be approved here: ${h}`;
}
//@ chunk-p2qwpk2k.js:27038-27115 layout
function withoutId(h, focusedIndex) {
  if (!h.has(focusedIndex)) return h;
  let m = new Set(h);
  m.delete(focusedIndex);
  return m;
}
//@ chunk-p2qwpk2k.js:27115-27860 fingerprint = RecentDenialsTab (0.316)
function RecentDenialsTab(props) {
  let $ = w(15);
  let { onHeaderFocusChange, onStateChange, isMidTurn } = props;
  let { getDenials } = statusSnapshot();
  let [g] = y(getDenials);
  let t8 = g.length === 0;
  let C;
  let c;
  if ($[0] !== t8 || $[1] !== onHeaderFocusChange) {
    C = () => {
      if (t8) onHeaderFocusChange(true);
    };
    c = [t8, onHeaderFocusChange];
    $[0] = t8;
    $[1] = onHeaderFocusChange;
    $[2] = C;
    $[3] = c;
  } else {
    C = $[2];
    c = $[3];
  }
  P(C, c);
  let M;
  let b;
  if ($[4] !== g || $[5] !== t8 || $[6] !== onStateChange) {
    M = () => {
      if (t8)
        onStateChange({
          approved: new Set(),
          retry: new Set(),
          denials: g,
          canMark: false,
        });
    };
    b = [t8, g, onStateChange];
    $[4] = g;
    $[5] = t8;
    $[6] = onStateChange;
    $[7] = M;
    $[8] = b;
  } else {
    M = $[7];
    b = $[8];
  }
  zt(M, b);
  if (t8) {
    let T;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default(Text, {
        dimColor: true,
        children: "No recent blocks. Commands auto mode blocks will appear here.",
      });
      $[9] = T;
    } else T = $[9];
    return T;
  }
  let T;
  if ($[10] !== g || $[11] !== isMidTurn || $[12] !== onHeaderFocusChange || $[13] !== onStateChange) {
    T = jsxProd_default(RecentDenialsList, {
      denials: g,
      onHeaderFocusChange,
      onStateChange,
      isMidTurn,
    });
    $[10] = g;
    $[11] = isMidTurn;
    $[12] = onHeaderFocusChange;
    $[13] = onStateChange;
    $[14] = T;
  } else T = $[14];
  return T;
}
//@ chunk-p2qwpk2k.js:27860-32506 sole-consumer
/**
 * 最近 auto 模式拒绝列表：可标记批准（空格）或重试（r），按终端尺寸裁剪显示，聚焦项展开命令全文，状态通过 onStateChange 上报；终端缩小时清除标记。
 */
function RecentDenialsList({ denials, onHeaderFocusChange, onStateChange, isMidTurn }) {
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  P(() => {
    onHeaderFocusChange(headerFocused);
  }, [headerFocused, onHeaderFocusChange]);
  let v = statusRowTexts();
  let [approved, setApproved] = y(() => new Set());
  let [retry, setRetry] = y(() => new Set());
  let [focusedIndex, setFocusedIndex] = y(0);
  let serialized = Q(
    () =>
      serializeApprovalList(
        denials.map((denial) => shortDenialLabel(denial, v)),
        {
          maxUnits: MAX_PAYLOAD_UNITS,
        },
      ),
    [denials, v],
  );
  let isScreenReader = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let [L, B] = y({
    rows,
    columns,
  });
  let [Y, se] = y(false);
  if (rows !== L.rows || columns !== L.columns) {
    B({
      rows,
      columns,
    });
    if (!isScreenReader && approved.size + retry.size > 0 && (rows < L.rows || columns < L.columns)) {
      setApproved(new Set());
      setRetry(new Set());
      se(true);
    }
  }
  let max = Math.max(
    1,
    Math.min(MIN_DECISION_COLUMN, Math.floor(columns * MAX_WIDTH_RATIO) - MAX_DENIAL_LINES),
  );
  let le = Q(
    () => serialized.map((W) => (W.withheld ? W.text : truncateToWidth(W.text, max))),
    [serialized, max],
  );
  let J = Q(() => denials.map((denial) => quotedReason(denial, v)), [denials, v]);
  let K = isScreenReader ? undefined : J[focusedIndex];
  let min = Math.min(10, denials.length);
  let ue = `${rows}x${columns}:${denials.length}:${K !== undefined}`;
  let [ee, ce] = y();
  let te = ee?.listKey === ue ? ee.listed : min;
  let Se =
    retry.size > 0
      ? isMidTurn
        ? `   Esc will tell Claude about ${retry.size} blocked ${plural(retry.size, "call")} at your next prompt`
        : `   Esc will retry ${retry.size} blocked ${plural(retry.size, "call")}`
      : approved.size > 0
        ? `   Esc will approve ${approved.size} blocked ${plural(approved.size, "call")}`
        : "";
  let de = Q(
    () => ({
      denials,
      focusedIdx: focusedIndex,
      listed: te,
      listKey: ue,
    }),
    [denials, focusedIndex, te, ue],
  );
  let X = FittedOfferBody(K?.text ?? "", {
    isActive: K !== undefined,
    isCut: true,
    contentKey: de,
    maxRows: MAX_DENIAL_ROWS,
  });
  let Ve = X.hiddenRows > 0 || X.hiddenAbove > 0;
  let Le = K !== undefined && X.isBodyOnScreen === false;
  let vt = K !== undefined && X.isBodyOnScreen !== true;
  let $e = K?.refusal ?? (Le ? notApprovableHereText("this terminal is too short to show it") : undefined);
  let trimmed = `${Y ? "Marks cleared: terminal shrank. " : ""}${Le ? $e : ""}`.trim();
  let [, Ge] = y(0);
  zt(() => {
    Ge((W) => W + 1);
  }, [de]);
  let isSettled = ee?.listKey === ue && ee.isSettled;
  let wasShort = ee?.listKey === ue ? ee.wasShort : 0;
  let wasFocused = ee?.wasFocused;
  zt(() => {
    if (X.shortRows === 0 || isSettled) return;
    if (te > 1)
      ce({
        listKey: ue,
        listed: te - 1,
        isSettled: false,
        wasShort: X.shortRows,
        wasFocused: focusedIndex,
      });
    else if (denials.length === 2 && wasFocused === focusedIndex && X.shortRows >= wasShort)
      ce({
        listKey: ue,
        listed: 2,
        isSettled: true,
        wasShort,
        wasFocused,
      });
  }, [X.shortRows, isSettled, wasShort, wasFocused, focusedIndex, te, ue, denials.length]);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let [bt, Te] = y();
  let et = Q(
    () => new Set(serialized.flatMap((W, N) => (W.withheld || J[N]?.refusal !== undefined ? [N] : []))),
    [serialized, J],
  );
  let rt = Q(() => (vt ? new Set(et).add(focusedIndex) : et), [vt, et, focusedIndex]);
  let dt = isScreenReader ? et.size < denials.length : !et.has(focusedIndex) && !Le;
  zt(() => {
    if (Le) {
      setApproved((W) => withoutId(W, focusedIndex));
      setRetry((W) => withoutId(W, focusedIndex));
    }
  }, [Le, focusedIndex]);
  zt(() => {
    onStateChange({
      approved,
      retry,
      denials,
      canMark: dt,
    });
  }, [approved, retry, denials, dt, onStateChange]);
  let [Qe, no] = y();
  let onChange = (W) => {
    let N = Number(W);
    if (isScreenReader) no(N);
    if (!isScreenReader && N !== focusedIndex) {
      setFocusedIndex(N);
      Te(W);
      return;
    }
    if (rt.has(N)) return;
    se(false);
    setApproved((ae) => {
      let ge = new Set(ae);
      if (ge.has(N)) ge.delete(N);
      else ge.add(N);
      return ge;
    });
    setRetry((ae) => withoutId(ae, N));
  };
  let onFocus = (W) => {
    if (Number(W) !== focusedIndex) setFocusedIndex(Number(W));
    if (isScreenReader) no(Number(W));
    Te(undefined);
  };
  function fr(event) {
    if (headerFocused) return;
    if (event.ctrl || event.meta || event.shift) return;
    if (event.key !== "r") return;
    event.preventDefault();
    let N = isScreenReader ? Qe : focusedIndex;
    if (N === undefined || rt.has(N)) return;
    se(false);
    setRetry((ae) => {
      let ge = new Set(ae);
      if (ge.has(N)) ge.delete(N);
      else ge.add(N);
      return ge;
    });
    setApproved((ae) => {
      if (ae.has(N)) return ae;
      let ge = new Set(ae);
      ge.add(N);
      return ge;
    });
  }
  let Do = Q(
    () =>
      denials.map((denial) => {
        let N = denial.reason
          ? replaceLineBreaks(displayField(denial.reason).text).replace(/\s+/g, " ").trim()
          : undefined;
        return N && !isScreenReader ? truncateToWidth(N, MAX_DENIAL_TEXT) : N;
      }),
    [denials, isScreenReader],
  );
  let options = denials.map((denial, N) => {
    let ae = approved.has(N);
    let children = retry.has(N)
      ? " (retry)"
      : !isScreenReader
        ? ""
        : ae
          ? " (approved)"
          : J[N]?.refusal !== undefined
            ? " (can't be approved)"
            : "";
    let ke = Do[N];
    return {
      label: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: ae ? "success" : "error",
            withSpace: true,
          }),
          le[N],
          jsxProd_default(Text, {
            dimColor: true,
            children,
          }),
        ],
      }),
      value: String(N),
      ...(ke && {
        description: `${AUTO_MODE_PREFIX}${ke}`,
        dimDescription: true,
      }),
    };
  });
  return jsxProd_default(useDialogKeybindings, {
    bindings: [
      {
        action: "app:toggleTranscript",
        run: () => {
          if (Ve) X.showNextRows();
        },
      },
    ],
    active: K !== undefined && !headerFocused,
    flexDirection: "column",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown: fr,
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
          denials.map((denial, N) => {
            let ae = J[N];
            return (
              ae !== undefined &&
              jsxProd_default_2(
                Box,
                {
                  flexDirection: "column",
                  children: [
                    jsxProd_default_2(Text, {
                      children: [
                        RecentDenialRow(denial, v).isUnreadable || denial.command === undefined
                          ? "Input for row"
                          : "Command for row",
                        " ",
                        N + 1,
                        ":",
                      ],
                    }),
                    jsxProd_default(Blockquote, {
                      multiline: true,
                      children: jsxProd_default(Text, {
                        children: ae.text,
                      }),
                    }),
                    ae.refusal !== undefined &&
                      jsxProd_default(Text, {
                        children: ae.refusal,
                      }),
                  ],
                },
                N,
              )
            );
          }),
        jsxProd_default(Box, {
          marginTop: trimmed === "" ? 1 : 0,
          children: jsxProd_default(ModelSelector, {
            options,
            onChange,
            onFocus,
            defaultFocusValue: bt,
            selectedValue: NO_COMMITTED_ROW,
            visibleOptionCount: te,
            hiddenBelowUnit: "blocked command",
            isDisabled: headerFocused,
            onUpFromFirstItem: focusHeader,
          }),
        }),
        Se !== "" &&
          jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: Se,
          }),
        K !== undefined &&
          jsxProd_default(Box, {
            marginTop: Se === "" ? 1 : 0,
            flexDirection: "column",
            children: jsxProd_default_2(DiffFrame, {
              children: [
                jsxProd_default_2(Box, {
                  ref: X.box,
                  flexDirection: "column",
                  children: [
                    jsxProd_default(Blockquote, {
                      multiline: K.needsGutter,
                      children: jsxProd_default(Box, {
                        ref: X.textBox,
                        flexDirection: "column",
                        flexGrow: 1,
                        children: jsxProd_default(Text, {
                          children: X.text,
                        }),
                      }),
                    }),
                    Ve &&
                      jsxProd_default(Text, {
                        dimColor: true,
                        wrap: "truncate-end",
                        children: formatHiddenRowsHint({
                          hiddenRows: X.hiddenRows,
                          hiddenAbove: X.hiddenAbove,
                          hint: headerFocused
                            ? ""
                            : formatShortcutHint({
                                chord,
                                action: X.hiddenRows > 0 ? "see more" : "see the first lines",
                                parens: true,
                                format: {
                                  keyCase: "lower",
                                },
                              }),
                          columns: X.columns,
                        }),
                      }),
                  ],
                }),
                $e !== undefined &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    wrap: "truncate-end",
                    children: $e,
                  }),
              ],
            }),
          }),
      ],
    }),
  });
}
export { quotedReason, RecentDenialsTab };
