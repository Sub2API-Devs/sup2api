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
import { j, y, P, zt, Q } from "../../../../vendor/react/cjs/react.production.js";
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
import { UWe, $nn } from "../../Spinner/spinnerStatus.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { useTabHeaderFocus } from "../../design-system/Tabs.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { _Rr, NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
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
j();
//@ chunk-p2qwpk2k.js:25926-25954 placement
var Kd = 8,
  zd = 200,
  jd = 80,
  Qd = 14;
//@ chunk-p2qwpk2k.js:25954-26017 placement
function Ml(h) {
  return !h.replace(INVISIBLE_SYMBOL_RE, " ").split(/\s+/).some(hasVisibleText);
}
//@ chunk-p2qwpk2k.js:26017-26608 placement
function RecentDenialRow(h, i) {
  let m = i.get(h);
  if (m !== void 0) return m;
  let a = serializeApprovalPayload(h.display, { maxUnits: MAX_PAYLOAD_UNITS }),
    g = a.kind !== "withheld" && Ml(a.text) ? `Call with no description: ${h.toolName}` : h.display,
    v =
      h.command !== void 0
        ? formatDenialCommand(h.command)
        : h.input === void 0
          ? void 0
          : h.input.kind === "withheld"
            ? { ...displayField("Input not shown"), refusal: bn("its input can't be read in full") }
            : { text: h.input.text, needsGutter: h.input.needsGutter },
    x = v === void 0 || (v.refusal === void 0 && Ml(v.text)),
    C = {
      label: g,
      isUnreadable: x,
      quote: x
        ? {
            ...displayField("Input not shown"),
            refusal: bn(v === void 0 ? "its input wasn't recorded" : "its input can't be read"),
          }
        : v,
    };
  return (i.set(h, C), C);
}
//@ chunk-p2qwpk2k.js:26608-26646 placement
function Cn(h, i) {
  return RecentDenialRow(h, i).quote;
}
//@ chunk-p2qwpk2k.js:26646-26684 placement
function qd(h, i) {
  return RecentDenialRow(h, i).label;
}
//@ chunk-p2qwpk2k.js:26684-26977 placement
function formatDenialCommand(h) {
  let i = serializeApprovalPayload(h, { maxUnits: MAX_PAYLOAD_UNITS });
  if (i.kind !== "withheld") return { text: i.text, needsGutter: i.needsGutter };
  let m = truncateToLength(h, MAX_DISPLAY_UNITS),
    a = countCodePoints(h.slice(m.length));
  return {
    ...displayField(h),
    refusal: bn(
      a > 0
        ? `the other ${a.toLocaleString("en-US")} ${plural(a, "character")} can't be read`
        : "its command can't be read in full",
    ),
  };
}
//@ chunk-p2qwpk2k.js:26977-27038 layout
function bn(h) {
  return `This row can't be approved here: ${h}`;
}
//@ chunk-p2qwpk2k.js:27038-27115 layout
function ts(h, i) {
  if (!h.has(i)) return h;
  let m = new Set(h);
  return (m.delete(i), m);
}
//@ chunk-p2qwpk2k.js:27115-27860 fingerprint = RecentDenialsTab (0.316)
function RecentDenialsTab(t0) {
  let $ = w(15),
    { onHeaderFocusChange: onHeaderFocusChange, onStateChange: onStateChange, isMidTurn: isMidTurn } = t0,
    { getDenials: getDenials } = UWe(),
    [g] = y(getDenials),
    t8 = g.length === 0,
    C,
    c;
  if ($[0] !== t8 || $[1] !== onHeaderFocusChange)
    ((C = () => {
      if (t8) onHeaderFocusChange(!0);
    }),
      (c = [t8, onHeaderFocusChange]),
      ($[0] = t8),
      ($[1] = onHeaderFocusChange),
      ($[2] = C),
      ($[3] = c));
  else ((C = $[2]), (c = $[3]));
  P(C, c);
  let M, b;
  if ($[4] !== g || $[5] !== t8 || $[6] !== onStateChange)
    ((M = () => {
      if (t8) onStateChange({ approved: new Set(), retry: new Set(), denials: g, canMark: !1 });
    }),
      (b = [t8, g, onStateChange]),
      ($[4] = g),
      ($[5] = t8),
      ($[6] = onStateChange),
      ($[7] = M),
      ($[8] = b));
  else ((M = $[7]), (b = $[8]));
  if ((zt(M, b), t8)) {
    let T;
    if ($[9] === MEMO_CACHE_SENTINEL)
      ((T = e(Text, {
        dimColor: !0,
        children: "No recent blocks. Commands auto mode blocks will appear here.",
      })),
        ($[9] = T));
    else T = $[9];
    return T;
  }
  let T;
  if ($[10] !== g || $[11] !== isMidTurn || $[12] !== onHeaderFocusChange || $[13] !== onStateChange)
    ((T = e(RecentDenialsList, {
      denials: g,
      onHeaderFocusChange: onHeaderFocusChange,
      onStateChange: onStateChange,
      isMidTurn: isMidTurn,
    })),
      ($[10] = g),
      ($[11] = isMidTurn),
      ($[12] = onHeaderFocusChange),
      ($[13] = onStateChange),
      ($[14] = T));
  else T = $[14];
  return T;
}
/**
 * 最近 auto 模式拒绝列表：可标记批准（空格）或重试（r），按终端尺寸裁剪显示，聚焦项展开命令全文，状态通过 onStateChange 上报；终端缩小时清除标记。
 */
//@ chunk-p2qwpk2k.js:27860-32506 sole-consumer
function RecentDenialsList({
  denials: denials,
  onHeaderFocusChange: onHeaderFocusChange,
  onStateChange: onStateChange,
  isMidTurn: isMidTurn,
}) {
  let { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus();
  P(() => {
    onHeaderFocusChange(headerFocused);
  }, [headerFocused, onHeaderFocusChange]);
  let v = $nn(),
    [approved, setApproved] = y(() => new Set()),
    [retry, setRetry] = y(() => new Set()),
    [focusedIndex, setFocusedIndex] = y(0),
    serialized = Q(
      () =>
        serializeApprovalList(
          denials.map((W) => qd(W, v)),
          { maxUnits: MAX_PAYLOAD_UNITS },
        ),
      [denials, v],
    ),
    isScreenReader = useIsScreenReaderEnabled(),
    { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    [L, B] = y({ rows: rows, columns: columns }),
    [Y, se] = y(!1);
  if (rows !== L.rows || columns !== L.columns) {
    if (
      (B({ rows: rows, columns: columns }),
      !isScreenReader && approved.size + retry.size > 0 && (rows < L.rows || columns < L.columns))
    )
      (setApproved(new Set()), setRetry(new Set()), se(!0));
  }
  let max = Math.max(1, Math.min(jd, Math.floor(columns * _Rr) - Qd)),
    le = Q(
      () => serialized.map((W) => (W.withheld ? W.text : truncateToWidth(W.text, max))),
      [serialized, max],
    ),
    J = Q(() => denials.map((W) => Cn(W, v)), [denials, v]),
    K = isScreenReader ? void 0 : J[focusedIndex],
    min = Math.min(10, denials.length),
    ue = `${rows}x${columns}:${denials.length}:${K !== void 0}`,
    [ee, ce] = y(),
    te = ee?.listKey === ue ? ee.listed : min,
    Se =
      retry.size > 0
        ? isMidTurn
          ? `   Esc will tell Claude about ${retry.size} blocked ${plural(retry.size, "call")} at your next prompt`
          : `   Esc will retry ${retry.size} blocked ${plural(retry.size, "call")}`
        : approved.size > 0
          ? `   Esc will approve ${approved.size} blocked ${plural(approved.size, "call")}`
          : "",
    de = Q(
      () => ({ denials: denials, focusedIdx: focusedIndex, listed: te, listKey: ue }),
      [denials, focusedIndex, te, ue],
    ),
    X = FittedOfferBody(K?.text ?? "", { isActive: K !== void 0, isCut: !0, contentKey: de, maxRows: Kd }),
    Ve = X.hiddenRows > 0 || X.hiddenAbove > 0,
    Le = K !== void 0 && X.isBodyOnScreen === !1,
    vt = K !== void 0 && X.isBodyOnScreen !== !0,
    $e = K?.refusal ?? (Le ? bn("this terminal is too short to show it") : void 0),
    trimmed = `${Y ? "Marks cleared: terminal shrank. " : ""}${Le ? $e : ""}`.trim(),
    [, Ge] = y(0);
  zt(() => {
    Ge((W) => W + 1);
  }, [de]);
  let ot = ee?.listKey === ue && ee.isSettled,
    at = ee?.listKey === ue ? ee.wasShort : 0,
    Ze = ee?.wasFocused;
  zt(() => {
    if (X.shortRows === 0 || ot) return;
    if (te > 1)
      ce({ listKey: ue, listed: te - 1, isSettled: !1, wasShort: X.shortRows, wasFocused: focusedIndex });
    else if (denials.length === 2 && Ze === focusedIndex && X.shortRows >= at)
      ce({ listKey: ue, listed: 2, isSettled: !0, wasShort: at, wasFocused: Ze });
  }, [X.shortRows, ot, at, Ze, focusedIndex, te, ue, denials.length]);
  let je = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    [bt, Te] = y(),
    et = Q(
      () => new Set(serialized.flatMap((W, N) => (W.withheld || J[N]?.refusal !== void 0 ? [N] : []))),
      [serialized, J],
    ),
    rt = Q(() => (vt ? new Set(et).add(focusedIndex) : et), [vt, et, focusedIndex]),
    dt = isScreenReader ? et.size < denials.length : !et.has(focusedIndex) && !Le;
  (zt(() => {
    if (Le) (setApproved((W) => ts(W, focusedIndex)), setRetry((W) => ts(W, focusedIndex)));
  }, [Le, focusedIndex]),
    zt(() => {
      onStateChange({ approved: approved, retry: retry, denials: denials, canMark: dt });
    }, [approved, retry, denials, dt, onStateChange]));
  let [Qe, no] = y(),
    Ht = (W) => {
      let N = Number(W);
      if (isScreenReader) no(N);
      if (!isScreenReader && N !== focusedIndex) {
        (setFocusedIndex(N), Te(W));
        return;
      }
      if (rt.has(N)) return;
      (se(!1),
        setApproved((ae) => {
          let ge = new Set(ae);
          if (ge.has(N)) ge.delete(N);
          else ge.add(N);
          return ge;
        }),
        setRetry((ae) => ts(ae, N)));
    },
    ko = (W) => {
      if (Number(W) !== focusedIndex) setFocusedIndex(Number(W));
      if (isScreenReader) no(Number(W));
      Te(void 0);
    };
  function fr(W) {
    if (headerFocused) return;
    if (W.ctrl || W.meta || W.shift) return;
    if (W.key !== "r") return;
    W.preventDefault();
    let N = isScreenReader ? Qe : focusedIndex;
    if (N === void 0 || rt.has(N)) return;
    (se(!1),
      setRetry((ae) => {
        let ge = new Set(ae);
        if (ge.has(N)) ge.delete(N);
        else ge.add(N);
        return ge;
      }),
      setApproved((ae) => {
        if (ae.has(N)) return ae;
        let ge = new Set(ae);
        return (ge.add(N), ge);
      }));
  }
  let Do = Q(
      () =>
        denials.map((W) => {
          let N = W.reason
            ? replaceLineBreaks(displayField(W.reason).text).replace(/\s+/g, " ").trim()
            : void 0;
          return N && !isScreenReader ? truncateToWidth(N, zd) : N;
        }),
      [denials, isScreenReader],
    ),
    mapped = denials.map((W, N) => {
      let ae = approved.has(N),
        ge = retry.has(N)
          ? " (retry)"
          : !isScreenReader
            ? ""
            : ae
              ? " (approved)"
              : J[N]?.refusal !== void 0
                ? " (can't be approved)"
                : "",
        ke = Do[N];
      return {
        label: r(Text, {
          children: [
            e(StatusIcon, { status: ae ? "success" : "error", withSpace: !0 }),
            le[N],
            e(Text, { dimColor: !0, children: ge }),
          ],
        }),
        value: String(N),
        ...(ke && { description: `${AUTO_MODE_PREFIX}${ke}`, dimDescription: !0 }),
      };
    });
  return e(useDialogKeybindings, {
    bindings: [
      {
        action: "app:toggleTranscript",
        run: () => {
          if (Ve) X.showNextRows();
        },
      },
    ],
    active: K !== void 0 && !headerFocused,
    flexDirection: "column",
    children: r(Box, {
      flexDirection: "column",
      flexShrink: 0,
      onKeyDown: fr,
      children: [
        trimmed !== "" && e(Text, { wrap: "truncate-end", children: trimmed }),
        e(Text, { children: "Commands auto mode recently blocked. Approving adds no rule." }),
        isScreenReader &&
          denials.map((W, N) => {
            let ae = J[N];
            return (
              ae !== void 0 &&
              r(
                Box,
                {
                  flexDirection: "column",
                  children: [
                    r(Text, {
                      children: [
                        RecentDenialRow(W, v).isUnreadable || W.command === void 0
                          ? "Input for row"
                          : "Command for row",
                        " ",
                        N + 1,
                        ":",
                      ],
                    }),
                    e(Blockquote, { multiline: !0, children: e(Text, { children: ae.text }) }),
                    ae.refusal !== void 0 && e(Text, { children: ae.refusal }),
                  ],
                },
                N,
              )
            );
          }),
        e(Box, {
          marginTop: trimmed === "" ? 1 : 0,
          children: e(ModelSelector, {
            options: mapped,
            onChange: Ht,
            onFocus: ko,
            defaultFocusValue: bt,
            selectedValue: NO_COMMITTED_ROW,
            visibleOptionCount: te,
            hiddenBelowUnit: "blocked command",
            isDisabled: headerFocused,
            onUpFromFirstItem: focusHeader,
          }),
        }),
        Se !== "" && e(Text, { dimColor: !0, wrap: "truncate-end", children: Se }),
        K !== void 0 &&
          e(Box, {
            marginTop: Se === "" ? 1 : 0,
            flexDirection: "column",
            children: r(DiffFrame, {
              children: [
                r(Box, {
                  ref: X.box,
                  flexDirection: "column",
                  children: [
                    e(Blockquote, {
                      multiline: K.needsGutter,
                      children: e(Box, {
                        ref: X.textBox,
                        flexDirection: "column",
                        flexGrow: 1,
                        children: e(Text, { children: X.text }),
                      }),
                    }),
                    Ve &&
                      e(Text, {
                        dimColor: !0,
                        wrap: "truncate-end",
                        children: formatHiddenRowsHint({
                          hiddenRows: X.hiddenRows,
                          hiddenAbove: X.hiddenAbove,
                          hint: headerFocused
                            ? ""
                            : formatShortcutHint({
                                chord: je,
                                action: X.hiddenRows > 0 ? "see more" : "see the first lines",
                                parens: !0,
                                format: { keyCase: "lower" },
                              }),
                          columns: X.columns,
                        }),
                      }),
                  ],
                }),
                $e !== void 0 && e(Text, { dimColor: !0, wrap: "truncate-end", children: $e }),
              ],
            }),
          }),
      ],
    }),
  });
}

export { Cn, RecentDenialsTab };
