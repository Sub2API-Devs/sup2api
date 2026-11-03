/**
 * components/design-system/FuzzyPicker.tsx
 *
 * 模糊搜索选择器：搜索框 + 结果列表（可反向从底部排列），无结果提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/FuzzyPicker.tsx
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: sole-consumer 4, affinity 1, fingerprint 2, file-local 1
 */
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { clamp } from "../../ink/screen.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { SearchBox } from "../SearchBox.js";
import { KeyboardShortcutHint } from "./KeyboardShortcutHint.js";
import { Byline } from "./Byline.js";
import { Pane } from "./Pane.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { HintText } from "./HintText.js";
import { ListItem } from "./ListItem.js";

//@ chunk-18hwfzwa.js:654611-654615 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:654615-654619 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:654619-654643 sole-consumer
function returnFalse_4() {
  return false;
}
//@ chunk-18hwfzwa.js:654643-654659 sole-consumer
function noop_3() {}
//@ chunk-18hwfzwa.js:654659-654682 affinity
var DEFAULT_VISIBLE_COUNT = 8;
var PICKER_CHROME_ROWS = 10;
var MIN_VISIBLE_COUNT = 2;
//@ chunk-18hwfzwa.js:654682-661223 fingerprint = FuzzyPicker (0.812)
/**
 * 模糊搜索选择器：顶部（或底部）搜索框，按查询过滤并高亮，上下选择，回车确认，Esc 取消，无结果显示 "No results"。
 */
function FuzzyPicker(props) {
  let $ = w(115);
  let {
    title,
    placeholder,
    initialQuery,
    items,
    getKey,
    renderItem,
    renderPreview,
    previewPosition,
    visibleCount,
    direction,
    onQueryChange,
    onSelect,
    onTab,
    onFocus,
    onCancel,
    resetKey,
    emptyMessage,
    matchLabel,
    selectAction,
    cancelAction,
    extraHints,
  } = props;
  let placeholder_2 = placeholder === undefined ? "Type to search\u2026" : placeholder;
  let so = previewPosition === undefined ? "bottom" : previewPosition;
  let po = visibleCount === undefined ? DEFAULT_VISIBLE_COUNT : visibleCount;
  let ao = direction === undefined ? "down" : direction;
  let co = emptyMessage === undefined ? "No results" : emptyMessage;
  let bo = selectAction === undefined ? "select" : selectAction;
  let action = cancelAction === undefined ? "cancel" : cancelAction;
  let isTerminalFocused = useTerminalFocus();
  let { rows, columns } = useTerminalSize();
  let Wo;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Wo = {
      focus: 0,
      window: 0,
    };
    $[0] = Wo;
  } else Wo = $[0];
  let [mn, Cn] = y(Wo);
  let { focus, window: vo } = mn;
  let [Yo, kn] = y(undefined);
  let Fn = Boolean(matchLabel);
  let visibleCount_2 = Math.max(MIN_VISIBLE_COUNT, Math.min(po, rows - PICKER_CHROME_ROWS - (Fn ? 1 : 0)));
  let Go = columns < 120;
  let [hn] = y(returnFalse_4);
  let Mn;
  if ($[1] !== hn) {
    Mn = stableEmptyObject(hn);
    $[1] = hn;
    $[2] = Mn;
  } else Mn = $[2];
  let Xo = Mn;
  let max = Math.max(0, items.length - visibleCount_2);
  let $n;
  if ($[3] !== items.length || $[4] !== visibleCount_2) {
    $n = (on) => {
      kn(undefined);
      Cn((_o) => {
        let { focus, window: Dn } = _o;
        let wn = clamp(focus + on, 0, items.length - 1);
        return {
          focus: wn,
          window: wn < Dn ? wn : wn >= Dn + visibleCount_2 ? wn - visibleCount_2 + 1 : Dn,
        };
      });
    };
    $[3] = items.length;
    $[4] = visibleCount_2;
    $[5] = $n;
  } else $n = $[5];
  let mr = $n;
  let _o;
  if ($[6] !== max) {
    _o = (Kn) => {
      Cn((delta) => ({
        ...delta,
        window: clamp(delta.window + Kn, 0, max),
      }));
    };
    $[6] = max;
    $[7] = _o;
  } else _o = $[7];
  let Fr = _o;
  let Zn;
  if ($[8] !== ao || $[9] !== Fr) {
    Zn = (event) => {
      if (event.deltaY === 0) {
        return;
      }
      let dr = event.deltaY > 0;
      if (ao === "up") Fr(dr ? -1 : 1);
      else Fr(dr ? 1 : -1);
      event.stopImmediatePropagation();
    };
    $[8] = ao;
    $[9] = Fr;
    $[10] = Zn;
  } else Zn = $[10];
  let onWheel = Zn;
  let pr;
  if ($[11] !== initialQuery || $[12] !== onCancel) {
    pr = {
      isActive: true,
      onExit: noop_3,
      onCancel,
      initialQuery,
      backspaceExitsOnEmpty: false,
    };
    $[11] = initialQuery;
    $[12] = onCancel;
    $[13] = pr;
  } else pr = $[13];
  let { query, cursorOffset, handleKeyDown, handlePaste } = useSearchInput(pr);
  let ts;
  if (
    $[14] !== ao ||
    $[15] !== focus ||
    $[16] !== items ||
    $[17] !== onSelect ||
    $[18] !== onTab ||
    $[19] !== handleKeyDown ||
    $[20] !== mr ||
    $[21] !== visibleCount_2
  ) {
    ts = (e) => {
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        mr(ao === "up" ? 1 : -1);
        return;
      }
      if (e.key === "down" || (e.ctrl && e.key === "n")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        mr(ao === "up" ? -1 : 1);
        return;
      }
      if (e.key === "pageup" || e.key === "pagedown") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let Ur = e.key === "pagedown" ? 1 : -1;
        mr((ao === "up" ? -Ur : Ur) * visibleCount_2);
        return;
      }
      if (e.key === "return") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let selected = items[focus];
        if (selected) onSelect(selected);
        return;
      }
      if (e.key === "tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        let selected = items[focus];
        if (onTab) onTab.handler(selected);
        else if (selected) onSelect(selected);
        return;
      }
      handleKeyDown(e);
    };
    $[14] = ao;
    $[15] = focus;
    $[16] = items;
    $[17] = onSelect;
    $[18] = onTab;
    $[19] = handleKeyDown;
    $[20] = mr;
    $[21] = visibleCount_2;
    $[22] = ts;
  } else ts = $[22];
  let onKeyDown = ts;
  let _r;
  if ($[23] !== onQueryChange || $[24] !== query) {
    _r = () => {
      onQueryChange(query);
      Cn({
        focus: 0,
        window: 0,
      });
      kn(undefined);
    };
    $[23] = onQueryChange;
    $[24] = query;
    $[25] = _r;
  } else _r = $[25];
  let fr;
  if ($[26] !== query) {
    fr = [query];
    $[26] = query;
    $[27] = fr;
  } else fr = $[27];
  P(_r, fr);
  let $r;
  let Yr;
  if ($[28] !== items.length || $[29] !== max) {
    $r = () => {
      Cn((Er) => ({
        focus: clamp(Er.focus, 0, items.length - 1),
        window: clamp(Er.window, 0, max),
      }));
      kn(undefined);
    };
    Yr = [items.length, max, Cn];
    $[28] = items.length;
    $[29] = max;
    $[30] = $r;
    $[31] = Yr;
  } else {
    $r = $[30];
    Yr = $[31];
  }
  P($r, Yr);
  let Vr;
  let ms;
  if ($[32] !== resetKey) {
    Vr = () => {
      if (resetKey === undefined) {
        return;
      }
      Cn({
        focus: 0,
        window: 0,
      });
      kn(undefined);
    };
    ms = [resetKey, Cn];
    $[32] = resetKey;
    $[33] = Vr;
    $[34] = ms;
  } else {
    Vr = $[33];
    ms = $[34];
  }
  P(Vr, ms);
  let Xs = items[focus];
  let Ls = Yo ?? Xs;
  let is;
  if ($[35] !== onFocus || $[36] !== Ls) {
    is = () => {
      onFocus?.(Ls);
    };
    $[35] = onFocus;
    $[36] = Ls;
    $[37] = is;
  } else is = $[37];
  let ws;
  if ($[38] !== Ls) {
    ws = [Ls];
    $[38] = Ls;
    $[39] = ws;
  } else ws = $[39];
  P(is, ws);
  let Ci;
  if ($[40] !== items || $[41] !== visibleCount_2 || $[42] !== vo) {
    Ci = items.slice(vo, vo + visibleCount_2);
    $[40] = items;
    $[41] = visibleCount_2;
    $[42] = vo;
    $[43] = Ci;
  } else Ci = $[43];
  let visible = Ci;
  let Oi;
  if ($[44] !== co || $[45] !== query) {
    Oi = typeof co === "function" ? co(query) : co;
    $[44] = co;
    $[45] = query;
    $[46] = Oi;
  } else Oi = $[46];
  let emptyText = Oi;
  let Zi;
  if ($[47] !== Fn || $[48] !== matchLabel) {
    Zi = Fn
      ? jsxProd_default(Text, {
          dimColor: true,
          children: matchLabel,
        })
      : null;
    $[47] = Fn;
    $[48] = matchLabel;
    $[49] = Zi;
  } else Zi = $[49];
  let da = Zi;
  let qn;
  if (
    $[50] !== cursorOffset ||
    $[51] !== onKeyDown ||
    $[52] !== handlePaste ||
    $[53] !== isTerminalFocused ||
    $[54] !== placeholder_2 ||
    $[55] !== query
  ) {
    qn = jsxProd_default(SearchBox, {
      query,
      cursorOffset,
      placeholder: placeholder_2,
      isFocused: true,
      autoFocus: true,
      onKeyDown,
      onPaste: handlePaste,
      isTerminalFocused,
    });
    $[50] = cursorOffset;
    $[51] = onKeyDown;
    $[52] = handlePaste;
    $[53] = isTerminalFocused;
    $[54] = placeholder_2;
    $[55] = query;
    $[56] = qn;
  } else qn = $[56];
  let ps = qn;
  let xs;
  if (
    $[57] !== ao ||
    $[58] !== emptyText ||
    $[59] !== focus ||
    $[60] !== getKey ||
    $[61] !== items.length ||
    $[62] !== onSelect ||
    $[63] !== renderItem ||
    $[64] !== visible ||
    $[65] !== visibleCount_2 ||
    $[66] !== vo
  ) {
    xs = jsxProd_default(List, {
      visible,
      windowStart: vo,
      visibleCount: visibleCount_2,
      total: items.length,
      focusedIndex: focus,
      direction: ao,
      getKey,
      renderItem,
      emptyText,
      onItemClick: onSelect,
      onItemHover: kn,
    });
    $[57] = ao;
    $[58] = emptyText;
    $[59] = focus;
    $[60] = getKey;
    $[61] = items.length;
    $[62] = onSelect;
    $[63] = renderItem;
    $[64] = visible;
    $[65] = visibleCount_2;
    $[66] = vo;
    $[67] = xs;
  } else xs = $[67];
  let kr = xs;
  let ls;
  if ($[68] !== Ls || $[69] !== renderPreview) {
    ls =
      renderPreview && Ls
        ? jsxProd_default(Box, {
            flexDirection: "column",
            flexGrow: 1,
            children: renderPreview(Ls),
          })
        : null;
    $[68] = Ls;
    $[69] = renderPreview;
    $[70] = ls;
  } else ls = $[70];
  let Ms = ls;
  let qs;
  if (
    $[71] !== kr ||
    $[72] !== Ms ||
    $[73] !== so ||
    $[74] !== renderPreview ||
    $[75] !== da ||
    $[76] !== visibleCount_2
  ) {
    qs =
      renderPreview && so === "right"
        ? jsxProd_default_2(Box, {
            flexDirection: "row",
            gap: 2,
            height: visibleCount_2 + (da ? 1 : 0),
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                flexShrink: 0,
                children: [kr, da],
              }),
              Ms ??
                jsxProd_default(Box, {
                  flexGrow: 1,
                }),
            ],
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [kr, da, Ms],
          });
    $[71] = kr;
    $[72] = Ms;
    $[73] = so;
    $[74] = renderPreview;
    $[75] = da;
    $[76] = visibleCount_2;
    $[77] = qs;
  } else qs = $[77];
  let gs = qs;
  let es = ao !== "up";
  let ds;
  if ($[78] !== title) {
    ds = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: title,
    });
    $[78] = title;
    $[79] = ds;
  } else ds = $[79];
  const Hs = es && ps;
  const _s = !es && ps;
  let chord;
  if ($[80] === MEMO_CACHE_SENTINEL) {
    chord = ["up", "down"];
    $[80] = chord;
  } else chord = $[80];
  const action_2 = Go ? "nav" : "navigate";
  let ua;
  if ($[81] !== Xo || $[82] !== action_2) {
    ua = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: action_2,
      ...Xo,
    });
    $[81] = Xo;
    $[82] = action_2;
    $[83] = ua;
  } else ua = $[83];
  let action_3;
  if ($[84] !== Go || $[85] !== bo) {
    action_3 = Go ? firstWord(bo) : bo;
    $[84] = Go;
    $[85] = bo;
    $[86] = action_3;
  } else action_3 = $[86];
  let Xa;
  if ($[87] !== Xo || $[88] !== action_3) {
    Xa = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: action_3,
      ...Xo,
    });
    $[87] = Xo;
    $[88] = action_3;
    $[89] = Xa;
  } else Xa = $[89];
  let dl;
  if ($[90] !== Xo || $[91] !== onTab) {
    dl =
      onTab &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: onTab.action,
        ...Xo,
      });
    $[90] = Xo;
    $[91] = onTab;
    $[92] = dl;
  } else dl = $[92];
  let Vl;
  if ($[93] !== action || $[94] !== Xo) {
    Vl = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action,
      ...Xo,
    });
    $[93] = action;
    $[94] = Xo;
    $[95] = Vl;
  } else Vl = $[95];
  let Hd;
  if ($[96] !== extraHints || $[97] !== Xo) {
    Hd = extraHints?.(Xo);
    $[96] = extraHints;
    $[97] = Xo;
    $[98] = Hd;
  } else Hd = $[98];
  let children;
  if ($[99] !== ua || $[100] !== Xa || $[101] !== dl || $[102] !== Vl || $[103] !== Hd) {
    children = jsxProd_default_2(Byline, {
      children: [ua, Xa, dl, Vl, Hd],
    });
    $[99] = ua;
    $[100] = Xa;
    $[101] = dl;
    $[102] = Vl;
    $[103] = Hd;
    $[104] = children;
  } else children = $[104];
  let yi;
  if ($[105] !== hn || $[106] !== children) {
    yi = jsxProd_default(Text, {
      dimColor: true,
      italic: hn,
      children,
    });
    $[105] = hn;
    $[106] = children;
    $[107] = yi;
  } else yi = $[107];
  let Ws;
  if (
    $[108] !== onWheel ||
    $[109] !== gs ||
    $[110] !== ds ||
    $[111] !== Hs ||
    $[112] !== _s ||
    $[113] !== yi
  ) {
    Ws = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        tabIndex: -1,
        onWheel,
        children: [ds, Hs, gs, _s, yi],
      }),
    });
    $[108] = onWheel;
    $[109] = gs;
    $[110] = ds;
    $[111] = Hs;
    $[112] = _s;
    $[113] = yi;
    $[114] = Ws;
  } else Ws = $[114];
  return Ws;
}
//@ chunk-18hwfzwa.js:661223-662906 fingerprint = List (0.841)
function List(props) {
  let $ = w(38);
  let {
    visible,
    windowStart,
    visibleCount,
    total,
    focusedIndex,
    direction,
    getKey,
    renderItem,
    emptyText,
    onItemClick,
    onItemHover,
  } = props;
  let strayClickGuard = useStrayClickGuard();
  let declareCursor = useIsScreenReaderEnabled();
  if (visible.length === 0) {
    let children;
    if ($[0] !== emptyText) {
      children = jsxProd_default(HintText, {
        children: emptyText,
      });
      $[0] = emptyText;
      $[1] = children;
    } else children = $[1];
    let t2;
    if ($[2] !== children || $[3] !== visibleCount) {
      t2 = jsxProd_default(Box, {
        height: visibleCount,
        flexShrink: 0,
        children,
      });
      $[2] = children;
      $[3] = visibleCount;
      $[4] = t2;
    } else t2 = $[4];
    return t2;
  }
  let t1;
  if (
    $[5] !== direction ||
    $[6] !== focusedIndex ||
    $[7] !== getKey ||
    $[8] !== declareCursor ||
    $[9] !== onItemClick ||
    $[10] !== onItemHover ||
    $[11] !== renderItem ||
    $[12] !== strayClickGuard ||
    $[13] !== total ||
    $[14] !== visible ||
    $[15] !== visibleCount ||
    $[16] !== windowStart
  ) {
    let Ot;
    if (
      $[18] !== direction ||
      $[19] !== focusedIndex ||
      $[20] !== getKey ||
      $[21] !== declareCursor ||
      $[22] !== onItemClick ||
      $[23] !== onItemHover ||
      $[24] !== renderItem ||
      $[25] !== strayClickGuard ||
      $[26] !== total ||
      $[27] !== visible.length ||
      $[28] !== visibleCount ||
      $[29] !== windowStart
    ) {
      Ot = (item, i) => {
        let key = getKey(item);
        let isFocused = windowStart + i === focusedIndex;
        let atLowEdge = i === 0 && windowStart > 0;
        let atHighEdge = i === visible.length - 1 && windowStart + visibleCount < total;
        return jsxProd_default(
          ListItem,
          {
            isFocused,
            declareCursor,
            showScrollUp: direction === "up" ? atHighEdge : atLowEdge,
            showScrollDown: direction === "up" ? atLowEdge : atHighEdge,
            styled: false,
            onClick: (so) => {
              if (strayClickGuard(so)) {
                return;
              }
              onItemClick(item);
            },
            onHoverChange: (po) => po && onItemHover(item),
            children: renderItem(item, isFocused),
          },
          key,
        );
      };
      $[18] = direction;
      $[19] = focusedIndex;
      $[20] = getKey;
      $[21] = declareCursor;
      $[22] = onItemClick;
      $[23] = onItemHover;
      $[24] = renderItem;
      $[25] = strayClickGuard;
      $[26] = total;
      $[27] = visible.length;
      $[28] = visibleCount;
      $[29] = windowStart;
      $[30] = Ot;
    } else Ot = $[30];
    t1 = visible.map(Ot);
    $[5] = direction;
    $[6] = focusedIndex;
    $[7] = getKey;
    $[8] = declareCursor;
    $[9] = onItemClick;
    $[10] = onItemHover;
    $[11] = renderItem;
    $[12] = strayClickGuard;
    $[13] = total;
    $[14] = visible;
    $[15] = visibleCount;
    $[16] = windowStart;
    $[17] = t1;
  } else t1 = $[17];
  let rows = t1;
  const flexDirection = direction === "up" ? "column-reverse" : "column";
  let onMouseLeave;
  if ($[31] !== onItemHover) {
    onMouseLeave = () => onItemHover(undefined);
    $[31] = onItemHover;
    $[32] = onMouseLeave;
  } else onMouseLeave = $[32];
  let bo;
  if ($[33] !== rows || $[34] !== flexDirection || $[35] !== onMouseLeave || $[36] !== visibleCount) {
    bo = jsxProd_default(Box, {
      height: visibleCount,
      flexShrink: 0,
      flexDirection,
      onMouseLeave,
      children: rows,
    });
    $[33] = rows;
    $[34] = flexDirection;
    $[35] = onMouseLeave;
    $[36] = visibleCount;
    $[37] = bo;
  } else bo = $[37];
  return bo;
}
//@ chunk-18hwfzwa.js:662906-662972 file-local
function firstWord(s) {
  let i = s.indexOf(" ");
  return i === -1 ? s : s.slice(0, i);
}
export { FuzzyPicker };
