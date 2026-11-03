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
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { clamp } from "../../ink/screen.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
j();
//@ chunk-18hwfzwa.js:654615-654619 sole-consumer
j();
//@ chunk-18hwfzwa.js:654619-654643 sole-consumer
function b2t() {
  return !1;
}
//@ chunk-18hwfzwa.js:654643-654659 sole-consumer
function noop_3() {}
//@ chunk-18hwfzwa.js:654659-654682 affinity
var YKe = 8,
  JKe = 10,
  XKe = 2;
/**
 * 模糊搜索选择器：顶部（或底部）搜索框，按查询过滤并高亮，上下选择，回车确认，Esc 取消，无结果显示 "No results"。
 */
//@ chunk-18hwfzwa.js:654682-661223 fingerprint = FuzzyPicker (0.812)
function FuzzyPicker(h) {
  let $ = w(115),
    {
      title: title,
      placeholder: placeholder,
      initialQuery: initialQuery,
      items: items,
      getKey: getKey,
      renderItem: renderItem,
      renderPreview: renderPreview,
      previewPosition: previewPosition,
      visibleCount: visibleCount,
      direction: direction,
      onQueryChange: onQueryChange,
      onSelect: onSelect,
      onTab: onTab,
      onFocus: onFocus,
      onCancel: onCancel,
      resetKey: resetKey,
      emptyMessage: emptyMessage,
      matchLabel: matchLabel,
      selectAction: selectAction,
      cancelAction: cancelAction,
      extraHints: extraHints,
    } = h,
    io = placeholder === void 0 ? "Type to search\u2026" : placeholder,
    so = previewPosition === void 0 ? "bottom" : previewPosition,
    po = visibleCount === void 0 ? YKe : visibleCount,
    ao = direction === void 0 ? "down" : direction,
    co = emptyMessage === void 0 ? "No results" : emptyMessage,
    bo = selectAction === void 0 ? "select" : selectAction,
    Ao = cancelAction === void 0 ? "cancel" : cancelAction,
    isTerminalFocused = useTerminalFocus(),
    { rows: rows, columns: columns } = useTerminalSize(),
    Wo;
  if ($[0] === MEMO_CACHE_SENTINEL) ((Wo = { focus: 0, window: 0 }), ($[0] = Wo));
  else Wo = $[0];
  let [mn, Cn] = y(Wo),
    { focus: focus, window: vo } = mn,
    [Yo, kn] = y(void 0),
    Fn = Boolean(matchLabel),
    visibleCount_2 = Math.max(XKe, Math.min(po, rows - JKe - (Fn ? 1 : 0))),
    Go = columns < 120,
    [hn] = y(b2t),
    Mn;
  if ($[1] !== hn) ((Mn = nd(hn)), ($[1] = hn), ($[2] = Mn));
  else Mn = $[2];
  let Xo = Mn,
    max = Math.max(0, items.length - visibleCount_2),
    $n;
  if ($[3] !== items.length || $[4] !== visibleCount_2)
    (($n = (on) => {
      (kn(void 0),
        Cn((_o) => {
          let { focus: focus, window: Dn } = _o;
          let wn = clamp(focus + on, 0, items.length - 1);
          return {
            focus: wn,
            window: wn < Dn ? wn : wn >= Dn + visibleCount_2 ? wn - visibleCount_2 + 1 : Dn,
          };
        }));
    }),
      ($[3] = items.length),
      ($[4] = visibleCount_2),
      ($[5] = $n));
  else $n = $[5];
  let mr = $n,
    _o;
  if ($[6] !== max)
    ((_o = (Kn) => {
      Cn((delta) => ({ ...delta, window: clamp(delta.window + Kn, 0, max) }));
    }),
      ($[6] = max),
      ($[7] = _o));
  else _o = $[7];
  let Fr = _o,
    Zn;
  if ($[8] !== ao || $[9] !== Fr)
    ((Zn = (Un) => {
      if (Un.deltaY === 0) {
        return;
      }
      let dr = Un.deltaY > 0;
      if (ao === "up") Fr(dr ? -1 : 1);
      else Fr(dr ? 1 : -1);
      Un.stopImmediatePropagation();
    }),
      ($[8] = ao),
      ($[9] = Fr),
      ($[10] = Zn));
  else Zn = $[10];
  let or = Zn,
    pr;
  if ($[11] !== initialQuery || $[12] !== onCancel)
    ((pr = {
      isActive: !0,
      onExit: noop_3,
      onCancel: onCancel,
      initialQuery: initialQuery,
      backspaceExitsOnEmpty: !1,
    }),
      ($[11] = initialQuery),
      ($[12] = onCancel),
      ($[13] = pr));
  else pr = $[13];
  let {
      query: query,
      cursorOffset: cursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput(pr),
    ts;
  if (
    $[14] !== ao ||
    $[15] !== focus ||
    $[16] !== items ||
    $[17] !== onSelect ||
    $[18] !== onTab ||
    $[19] !== handleKeyDown ||
    $[20] !== mr ||
    $[21] !== visibleCount_2
  )
    ((ts = (Gn) => {
      if (Gn.key === "up" || (Gn.ctrl && Gn.key === "p")) {
        (Gn.preventDefault(), Gn.stopImmediatePropagation(), mr(ao === "up" ? 1 : -1));
        return;
      }
      if (Gn.key === "down" || (Gn.ctrl && Gn.key === "n")) {
        (Gn.preventDefault(), Gn.stopImmediatePropagation(), mr(ao === "up" ? -1 : 1));
        return;
      }
      if (Gn.key === "pageup" || Gn.key === "pagedown") {
        (Gn.preventDefault(), Gn.stopImmediatePropagation());
        let Ur = Gn.key === "pagedown" ? 1 : -1;
        mr((ao === "up" ? -Ur : Ur) * visibleCount_2);
        return;
      }
      if (Gn.key === "return") {
        (Gn.preventDefault(), Gn.stopImmediatePropagation());
        let Zr = items[focus];
        if (Zr) onSelect(Zr);
        return;
      }
      if (Gn.key === "tab") {
        (Gn.preventDefault(), Gn.stopImmediatePropagation());
        let wr = items[focus];
        if (onTab) onTab.handler(wr);
        else if (wr) onSelect(wr);
        return;
      }
      handleKeyDown(Gn);
    }),
      ($[14] = ao),
      ($[15] = focus),
      ($[16] = items),
      ($[17] = onSelect),
      ($[18] = onTab),
      ($[19] = handleKeyDown),
      ($[20] = mr),
      ($[21] = visibleCount_2),
      ($[22] = ts));
  else ts = $[22];
  let zr = ts,
    _r;
  if ($[23] !== onQueryChange || $[24] !== query)
    ((_r = () => {
      (onQueryChange(query), Cn({ focus: 0, window: 0 }), kn(void 0));
    }),
      ($[23] = onQueryChange),
      ($[24] = query),
      ($[25] = _r));
  else _r = $[25];
  let fr;
  if ($[26] !== query) ((fr = [query]), ($[26] = query), ($[27] = fr));
  else fr = $[27];
  P(_r, fr);
  let $r, Yr;
  if ($[28] !== items.length || $[29] !== max)
    (($r = () => {
      (Cn((Er) => ({ focus: clamp(Er.focus, 0, items.length - 1), window: clamp(Er.window, 0, max) })),
        kn(void 0));
    }),
      (Yr = [items.length, max, Cn]),
      ($[28] = items.length),
      ($[29] = max),
      ($[30] = $r),
      ($[31] = Yr));
  else (($r = $[30]), (Yr = $[31]));
  P($r, Yr);
  let Vr, ms;
  if ($[32] !== resetKey)
    ((Vr = () => {
      if (resetKey === void 0) {
        return;
      }
      (Cn({ focus: 0, window: 0 }), kn(void 0));
    }),
      (ms = [resetKey, Cn]),
      ($[32] = resetKey),
      ($[33] = Vr),
      ($[34] = ms));
  else ((Vr = $[33]), (ms = $[34]));
  P(Vr, ms);
  let Xs = items[focus],
    Ls = Yo ?? Xs,
    is;
  if ($[35] !== onFocus || $[36] !== Ls)
    ((is = () => {
      onFocus?.(Ls);
    }),
      ($[35] = onFocus),
      ($[36] = Ls),
      ($[37] = is));
  else is = $[37];
  let ws;
  if ($[38] !== Ls) ((ws = [Ls]), ($[38] = Ls), ($[39] = ws));
  else ws = $[39];
  P(is, ws);
  let Ci;
  if ($[40] !== items || $[41] !== visibleCount_2 || $[42] !== vo)
    ((Ci = items.slice(vo, vo + visibleCount_2)),
      ($[40] = items),
      ($[41] = visibleCount_2),
      ($[42] = vo),
      ($[43] = Ci));
  else Ci = $[43];
  let oi = Ci,
    Oi;
  if ($[44] !== co || $[45] !== query)
    ((Oi = typeof co === "function" ? co(query) : co), ($[44] = co), ($[45] = query), ($[46] = Oi));
  else Oi = $[46];
  let Hi = Oi,
    Zi;
  if ($[47] !== Fn || $[48] !== matchLabel)
    ((Zi = Fn ? e(Text, { dimColor: !0, children: matchLabel }) : null),
      ($[47] = Fn),
      ($[48] = matchLabel),
      ($[49] = Zi));
  else Zi = $[49];
  let da = Zi,
    qn;
  if (
    $[50] !== cursorOffset ||
    $[51] !== zr ||
    $[52] !== handlePaste ||
    $[53] !== isTerminalFocused ||
    $[54] !== io ||
    $[55] !== query
  )
    ((qn = e(SearchBox, {
      query: query,
      cursorOffset: cursorOffset,
      placeholder: io,
      isFocused: !0,
      autoFocus: !0,
      onKeyDown: zr,
      onPaste: handlePaste,
      isTerminalFocused: isTerminalFocused,
    })),
      ($[50] = cursorOffset),
      ($[51] = zr),
      ($[52] = handlePaste),
      ($[53] = isTerminalFocused),
      ($[54] = io),
      ($[55] = query),
      ($[56] = qn));
  else qn = $[56];
  let ps = qn,
    xs;
  if (
    $[57] !== ao ||
    $[58] !== Hi ||
    $[59] !== focus ||
    $[60] !== getKey ||
    $[61] !== items.length ||
    $[62] !== onSelect ||
    $[63] !== renderItem ||
    $[64] !== oi ||
    $[65] !== visibleCount_2 ||
    $[66] !== vo
  )
    ((xs = e(List, {
      visible: oi,
      windowStart: vo,
      visibleCount: visibleCount_2,
      total: items.length,
      focusedIndex: focus,
      direction: ao,
      getKey: getKey,
      renderItem: renderItem,
      emptyText: Hi,
      onItemClick: onSelect,
      onItemHover: kn,
    })),
      ($[57] = ao),
      ($[58] = Hi),
      ($[59] = focus),
      ($[60] = getKey),
      ($[61] = items.length),
      ($[62] = onSelect),
      ($[63] = renderItem),
      ($[64] = oi),
      ($[65] = visibleCount_2),
      ($[66] = vo),
      ($[67] = xs));
  else xs = $[67];
  let kr = xs,
    ls;
  if ($[68] !== Ls || $[69] !== renderPreview)
    ((ls =
      renderPreview && Ls
        ? e(Box, { flexDirection: "column", flexGrow: 1, children: renderPreview(Ls) })
        : null),
      ($[68] = Ls),
      ($[69] = renderPreview),
      ($[70] = ls));
  else ls = $[70];
  let Ms = ls,
    qs;
  if (
    $[71] !== kr ||
    $[72] !== Ms ||
    $[73] !== so ||
    $[74] !== renderPreview ||
    $[75] !== da ||
    $[76] !== visibleCount_2
  )
    ((qs =
      renderPreview && so === "right"
        ? r(Box, {
            flexDirection: "row",
            gap: 2,
            height: visibleCount_2 + (da ? 1 : 0),
            children: [
              r(Box, { flexDirection: "column", flexShrink: 0, children: [kr, da] }),
              Ms ?? e(Box, { flexGrow: 1 }),
            ],
          })
        : r(Box, { flexDirection: "column", children: [kr, da, Ms] })),
      ($[71] = kr),
      ($[72] = Ms),
      ($[73] = so),
      ($[74] = renderPreview),
      ($[75] = da),
      ($[76] = visibleCount_2),
      ($[77] = qs));
  else qs = $[77];
  let gs = qs,
    es = ao !== "up",
    ds;
  if ($[78] !== title)
    ((ds = e(Text, { bold: !0, color: "permission", children: title })), ($[78] = title), ($[79] = ds));
  else ds = $[79];
  const Hs = es && ps,
    _s = !es && ps;
  let fs;
  if ($[80] === MEMO_CACHE_SENTINEL) ((fs = ["up", "down"]), ($[80] = fs));
  else fs = $[80];
  const ii = Go ? "nav" : "navigate";
  let ua;
  if ($[81] !== Xo || $[82] !== ii)
    ((ua = e(KeyboardShortcutHint, { chord: fs, action: ii, ...Xo })),
      ($[81] = Xo),
      ($[82] = ii),
      ($[83] = ua));
  else ua = $[83];
  let La;
  if ($[84] !== Go || $[85] !== bo)
    ((La = Go ? firstWord(bo) : bo), ($[84] = Go), ($[85] = bo), ($[86] = La));
  else La = $[86];
  let Xa;
  if ($[87] !== Xo || $[88] !== La)
    ((Xa = e(KeyboardShortcutHint, { chord: "enter", action: La, ...Xo })),
      ($[87] = Xo),
      ($[88] = La),
      ($[89] = Xa));
  else Xa = $[89];
  let dl;
  if ($[90] !== Xo || $[91] !== onTab)
    ((dl = onTab && e(KeyboardShortcutHint, { chord: "tab", action: onTab.action, ...Xo })),
      ($[90] = Xo),
      ($[91] = onTab),
      ($[92] = dl));
  else dl = $[92];
  let Vl;
  if ($[93] !== Ao || $[94] !== Xo)
    ((Vl = e(KeyboardShortcutHint, { chord: "escape", action: Ao, ...Xo })),
      ($[93] = Ao),
      ($[94] = Xo),
      ($[95] = Vl));
  else Vl = $[95];
  let Hd;
  if ($[96] !== extraHints || $[97] !== Xo)
    ((Hd = extraHints?.(Xo)), ($[96] = extraHints), ($[97] = Xo), ($[98] = Hd));
  else Hd = $[98];
  let Ss;
  if ($[99] !== ua || $[100] !== Xa || $[101] !== dl || $[102] !== Vl || $[103] !== Hd)
    ((Ss = r(Byline, { children: [ua, Xa, dl, Vl, Hd] })),
      ($[99] = ua),
      ($[100] = Xa),
      ($[101] = dl),
      ($[102] = Vl),
      ($[103] = Hd),
      ($[104] = Ss));
  else Ss = $[104];
  let yi;
  if ($[105] !== hn || $[106] !== Ss)
    ((yi = e(Text, { dimColor: !0, italic: hn, children: Ss })), ($[105] = hn), ($[106] = Ss), ($[107] = yi));
  else yi = $[107];
  let Ws;
  if ($[108] !== or || $[109] !== gs || $[110] !== ds || $[111] !== Hs || $[112] !== _s || $[113] !== yi)
    ((Ws = e(Pane, {
      color: "permission",
      children: r(Box, {
        flexDirection: "column",
        tabIndex: -1,
        onWheel: or,
        children: [ds, Hs, gs, _s, yi],
      }),
    })),
      ($[108] = or),
      ($[109] = gs),
      ($[110] = ds),
      ($[111] = Hs),
      ($[112] = _s),
      ($[113] = yi),
      ($[114] = Ws));
  else Ws = $[114];
  return Ws;
}
//@ chunk-18hwfzwa.js:661223-662906 fingerprint = List (0.841)
function List(t0) {
  let $ = w(38),
    {
      visible: visible,
      windowStart: windowStart,
      visibleCount: visibleCount,
      total: total,
      focusedIndex: focusedIndex,
      direction: direction,
      getKey: getKey,
      renderItem: renderItem,
      emptyText: emptyText,
      onItemClick: onItemClick,
      onItemHover: onItemHover,
    } = t0,
    rt = useStrayClickGuard(),
    kt = useIsScreenReaderEnabled();
  if (visible.length === 0) {
    let It;
    if ($[0] !== emptyText) ((It = e(HintText, { children: emptyText })), ($[0] = emptyText), ($[1] = It));
    else It = $[1];
    let Ot;
    if ($[2] !== It || $[3] !== visibleCount)
      ((Ot = e(Box, { height: visibleCount, flexShrink: 0, children: It })),
        ($[2] = It),
        ($[3] = visibleCount),
        ($[4] = Ot));
    else Ot = $[4];
    return Ot;
  }
  let It;
  if (
    $[5] !== direction ||
    $[6] !== focusedIndex ||
    $[7] !== getKey ||
    $[8] !== kt ||
    $[9] !== onItemClick ||
    $[10] !== onItemHover ||
    $[11] !== renderItem ||
    $[12] !== rt ||
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
      $[21] !== kt ||
      $[22] !== onItemClick ||
      $[23] !== onItemHover ||
      $[24] !== renderItem ||
      $[25] !== rt ||
      $[26] !== total ||
      $[27] !== visible.length ||
      $[28] !== visibleCount ||
      $[29] !== windowStart
    )
      ((Ot = (item, Dt) => {
        let Lt = getKey(item);
        let oo = windowStart + Dt === focusedIndex;
        let Xt = Dt === 0 && windowStart > 0;
        let io = Dt === visible.length - 1 && windowStart + visibleCount < total;
        return e(
          ListItem,
          {
            isFocused: oo,
            declareCursor: kt,
            showScrollUp: direction === "up" ? io : Xt,
            showScrollDown: direction === "up" ? Xt : io,
            styled: !1,
            onClick: (so) => {
              if (rt(so)) {
                return;
              }
              onItemClick(item);
            },
            onHoverChange: (po) => po && onItemHover(item),
            children: renderItem(item, oo),
          },
          Lt,
        );
      }),
        ($[18] = direction),
        ($[19] = focusedIndex),
        ($[20] = getKey),
        ($[21] = kt),
        ($[22] = onItemClick),
        ($[23] = onItemHover),
        ($[24] = renderItem),
        ($[25] = rt),
        ($[26] = total),
        ($[27] = visible.length),
        ($[28] = visibleCount),
        ($[29] = windowStart),
        ($[30] = Ot));
    else Ot = $[30];
    It = visible.map(Ot);
    (($[5] = direction),
      ($[6] = focusedIndex),
      ($[7] = getKey),
      ($[8] = kt),
      ($[9] = onItemClick),
      ($[10] = onItemHover),
      ($[11] = renderItem),
      ($[12] = rt),
      ($[13] = total),
      ($[14] = visible),
      ($[15] = visibleCount),
      ($[16] = windowStart),
      ($[17] = It));
  } else It = $[17];
  let rows = It;
  const t2 = direction === "up" ? "column-reverse" : "column";
  let co;
  if ($[31] !== onItemHover) ((co = () => onItemHover(void 0)), ($[31] = onItemHover), ($[32] = co));
  else co = $[32];
  let bo;
  if ($[33] !== rows || $[34] !== t2 || $[35] !== co || $[36] !== visibleCount)
    ((bo = e(Box, {
      height: visibleCount,
      flexShrink: 0,
      flexDirection: t2,
      onMouseLeave: co,
      children: rows,
    })),
      ($[33] = rows),
      ($[34] = t2),
      ($[35] = co),
      ($[36] = visibleCount),
      ($[37] = bo));
  else bo = $[37];
  return bo;
}
//@ chunk-18hwfzwa.js:662906-662972 file-local
function firstWord(s) {
  let index = s.indexOf(" ");
  return index === -1 ? s : s.slice(0, index);
}

export { FuzzyPicker };
