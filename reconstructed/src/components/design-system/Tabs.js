/**
 * components/design-system/Tabs.tsx
 *
 * 标签页组件：Tabs/Tab，tabs:next/previous 切换、标题聚焦管理（useTabHeaderFocus）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Tabs.tsx
 * pieces: chunk-1dkfja46.js (14)
 * attribution: placement 2, callgraph-fingerprint 1, layout 6, fingerprint 4, file-local 1
 */
import { j, qt, y, Se, R, zt, Uy } from "../../../vendor/react/cjs/react.production.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { $E, fTe, Xmt, useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useFocus, useHasFocus } from "../../ink/components/Input.js";
import { isDescendantOf } from "../../ink/focus.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { Box, Text } from "../../ink/components/Text.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LI } from "../../ink/components/ScrollBox.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import { sequential } from "../../utils/sequential.js";
import { TagTabs } from "../TagTabs.js";

//@ chunk-1dkfja46.js:743-747 placement
j();
//@ chunk-1dkfja46.js:747-814 callgraph-fingerprint = _temp (1)
function ko(child) {
  return [child.props.id ?? child.props.title, child.props.title];
}
//@ chunk-1dkfja46.js:814-842 layout
function xo(Qo) {
  return Qo + 1;
}
//@ chunk-1dkfja46.js:842-899 layout
function To(Xo, d) {
  let [, xn] = d;
  return Xo + (xn ? bunStringWidth(xn) : 0) + 2 + 1;
}
//@ chunk-1dkfja46.js:899-925 layout
function Fo(x) {
  return x + 1;
}
//@ chunk-1dkfja46.js:925-951 layout
function Co(C) {
  return C - 1;
}
//@ chunk-1dkfja46.js:951-1109 fingerprint = TabsContext (0.9)
var TabsContext = qt({
  selectedTab: void 0,
  width: void 0,
  headerFocused: !1,
  focusHeader: () => {},
  blurHeader: () => {},
  registerOptIn: () => () => {},
  registerNavigationOwner: () => () => {},
});
/**
 * 标签页：标题行（可聚焦）+ 当前标签内容，左右/tab 切换，down 把焦点移入内容；Tab 子组件声明标题。
 */
//@ chunk-1dkfja46.js:1109-5871 fingerprint = Tabs (0.674)
function Tabs(t0) {
  let $ = w(52),
    {
      title: title,
      color: color,
      defaultTab: defaultTab,
      children: children,
      hidden: hidden,
      useFullWidth: useFullWidth,
      selectedTab: controlledSelectedTab,
      onTabChange: onTabChange,
      banner: banner,
      disableNavigation: disableNavigation,
      initialHeaderFocused: t1,
      contentHeight: contentHeight,
      stableHeight: stableHeight,
      navFromContent: t2,
    } = t0,
    K = t1 === void 0 ? !0 : t1,
    p = stableHeight === void 0 ? !1 : stableHeight,
    jt = t2 === void 0 ? !1 : t2,
    { columns: terminalWidth } = useTerminalSize(),
    tabs = children.map(ko),
    ve = defaultTab ? tabs.findIndex((tab) => defaultTab === tab[0]) : 0,
    Ue = controlledSelectedTab !== void 0,
    [Ho, Ro] = y(ve !== -1 ? ve : 0),
    Gt = Ue ? tabs.findIndex((tab_0) => tab_0[0] === controlledSelectedTab) : -1,
    D = Ue ? (Gt !== -1 ? Gt : 0) : Ho,
    we = Se($E),
    modalScrollRef = fTe(),
    O = Xmt(),
    Ye = R(null),
    [ke, So] = y(0),
    re = R(null),
    [xe, Io] = y(1),
    Ut;
  if ($[0] !== ke || $[1] !== xe)
    ((Ut = () => {
      let Yt = Ye.current ? measureElement(Ye.current).height : 0;
      if (Yt !== ke) So(Yt);
      let _t = re.current ? Math.max(1, measureElement(re.current).height) : 1;
      if (_t !== xe) Io(_t);
    }),
      ($[0] = ke),
      ($[1] = xe),
      ($[2] = Ut));
  else Ut = $[2];
  zt(Ut);
  let ae = (hidden ? 0 : xe + 1) + ke,
    Jt,
    Qt;
  if ($[3] !== O || $[4] !== ae)
    ((Jt = () => {
      if (!O) {
        return;
      }
      return (O(ae), () => O(null));
    }),
      (Qt = [O, ae]),
      ($[3] = O),
      ($[4] = ae),
      ($[5] = Jt),
      ($[6] = Qt));
  else ((Jt = $[5]), (Qt = $[6]));
  zt(Jt, Qt);
  let Xt;
  if ($[7] === MEMO_CACHE_SENTINEL) ((Xt = { rows: 0, columns: 0 }), ($[7] = Xt));
  else Xt = $[7];
  let { rows: rows } = useScrollViewportSize(Xt),
    M = O !== null && modalScrollRef !== null,
    _e = modalScrollRef?.attach,
    Te = M ? rows - ae : void 0,
    Zt;
  if ($[8] !== we || $[9] !== M)
    ((Zt = we && M ? { ...we, claimScrollBox: null } : null), ($[8] = we), ($[9] = M), ($[10] = Zt));
  else Zt = $[10];
  let qe = Zt,
    wr = !0,
    le = R(null),
    ze = R(null),
    { focus: focus, activeElement: activeElement, focusDirection: focusDirection, blur: blur } = useFocus(),
    [G, de] = y(K),
    $t;
  if ($[11] !== activeElement || $[12] !== focus)
    (($t = () => {
      if (!0 && re.current) focus(re.current);
      else if (!1 && le.current) {
        if (activeElement && activeElement !== le.current && isDescendantOf(activeElement, le.current))
          ze.current = activeElement;
        focus(le.current);
      }
      de(!0);
    }),
      ($[11] = activeElement),
      ($[12] = focus),
      ($[13] = $t));
  else $t = $[13];
  let en = $t,
    tn;
  if ($[14] !== blur || $[15] !== focus)
    ((tn = (nn) => {
      if (!0 && nn) focus(nn);
      else blur();
      ((ze.current = null), de(!1));
    }),
      ($[14] = blur),
      ($[15] = focus),
      ($[16] = tn));
  else tn = $[16];
  let No = tn,
    [B, Oo] = useNavigationHold(),
    [Mo, Wo] = useNavigationHold(),
    E = disableNavigation || Mo,
    on = G || !B,
    Xe = R(null),
    Bo = useHasFocus(Xe),
    Eo = !0 && !B ? !Bo : on,
    [rn, Ao] = Uy(xo, 0),
    an = R(null),
    ln;
  if ($[17] === MEMO_CACHE_SENTINEL)
    ((ln = () => {
      ze.current = null;
    }),
      ($[17] = ln));
  else ln = $[17];
  zt(ln, [D]);
  let cn = (Ze, dn) => {
      let Po = dn === void 0 ? !1 : dn;
      ((an.current = { epoch: rn, index: Ze }), Ao());
      let newTabId = tabs[Ze]?.[0];
      if (Ue && onTabChange && newTabId) onTabChange(newTabId);
      else Ro(Ze);
      if (Po) {
        return;
      }
      en();
    },
    Fe = (Vo, hn) => {
      let Ko = hn === void 0 ? !1 : hn;
      let fn = an.current;
      let Lo = fn?.epoch === rn ? fn.index : D;
      cn((Lo + tabs.length + Vo) % tabs.length, Ko);
    };
  const $e = !hidden && !E && on;
  let bn;
  if ($[18] !== $e) ((bn = { context: "Tabs", isActive: $e }), ($[18] = $e), ($[19] = bn));
  else bn = $[19];
  MessageActionsKeybindings({ "tabs:next": () => Fe(1), "tabs:previous": () => Fe(-1) }, bn);
  let pn;
  if ($[20] !== E || $[21] !== focusDirection || $[22] !== G || $[23] !== hidden || $[24] !== B)
    ((pn = (f) => {
      if (hidden || E) {
        return;
      }
      if (!G) {
        if (
          f.key === "left" ||
          f.key === "right" ||
          f.key === "tab" ||
          (B && (f.key === "up" || f.key === "down"))
        )
          f.preventDefault();
        return;
      }
      if (f.key === "left" || f.key === "right" || f.key === "tab") f.preventDefault();
      else if (f.key === "down" && B) (f.preventDefault(), focusDirection("down"), de(!1));
    }),
      ($[20] = E),
      ($[21] = focusDirection),
      ($[22] = G),
      ($[23] = hidden),
      ($[24] = B),
      ($[25] = pn));
  else pn = $[25];
  let mn = pn;
  const et = jt && !G && B && !hidden && !E;
  let gn;
  if ($[26] !== et) ((gn = { context: "Tabs", isActive: et }), ($[26] = et), ($[27] = gn));
  else gn = $[27];
  MessageActionsKeybindings({ "tabs:next": () => Fe(1, !0), "tabs:previous": () => Fe(-1, !0) }, gn);
  let jo = title ? bunStringWidth(title) + 1 : 0,
    tabsWidth = tabs.reduce(To, 0),
    Uo = jo + tabsWidth,
    vn = useFullWidth ? Math.max(0, terminalWidth - Uo) : 0,
    se = useFullWidth ? terminalWidth : void 0;
  const Yo = {
      selectedTab: tabs[D][0],
      width: se,
      headerFocused: G,
      focusHeader: en,
      blurHeader: No,
      registerOptIn: Oo,
      registerNavigationOwner: Wo,
    },
    tt = Box,
    nt = !0 ? void 0 : le,
    t11 = "column",
    ot = !0 ? void 0 : 0,
    rt = !0 ? void 0 : K,
    it = !0 ? void 0 : mn,
    at = modalScrollRef ? 0 : void 0,
    lt =
      !hidden &&
      r(Box, {
        ref: re,
        tabIndex: !0 ? 0 : void 0,
        autoFocus: !0 ? K : void 0,
        onFocus: !0 ? () => de(!0) : void 0,
        onBlur: !0 ? () => de(!1) : void 0,
        onKeyDown: !0 ? mn : void 0,
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 1,
        flexShrink: modalScrollRef ? 0 : void 0,
        alignSelf: !0 && !useFullWidth ? "flex-start" : void 0,
        children: [
          title !== null &&
            e(Box, { flexShrink: 0, children: e(Text, { bold: !0, color: color, children: title }) }),
          tabs.map((t16, wn) => {
            let [zo, Jo] = t16;
            return e(
              TabHeader,
              {
                title: Jo,
                isCurrent: D === wn,
                headerFocused: Eo && !E,
                color: color ?? (!0 ? "suggestion" : void 0),
                onClick: E ? void 0 : () => cn(wn),
              },
              zo,
            );
          }),
          vn > 0 && e(Text, { children: " ".repeat(vn) }),
        ],
      });
  let Ce;
  if ($[28] !== banner)
    ((Ce = banner != null && e(Box, { ref: Ye, flexDirection: "column", flexShrink: 0, children: banner })),
      ($[28] = banner),
      ($[29] = Ce));
  else Ce = $[29];
  let He;
  if (
    $[30] !== _e ||
    $[31] !== qe ||
    $[32] !== children ||
    $[33] !== contentHeight ||
    $[34] !== se ||
    $[35] !== hidden ||
    $[36] !== modalScrollRef ||
    $[37] !== M ||
    $[38] !== Te ||
    $[39] !== D ||
    $[40] !== p
  )
    ((He = M
      ? e(Box, {
          ref: Xe,
          width: se,
          marginTop: hidden ? 0 : 1,
          flexShrink: 0,
          children: e(
            LI,
            {
              ref: _e,
              flexDirection: "column",
              flexShrink: 0,
              height: p ? Te : void 0,
              maxHeight: p ? void 0 : Te,
              stickyScroll: !1,
              children: e($E, { value: qe, children: children }),
            },
            D,
          ),
        })
      : e(Box, {
          ref: Xe,
          width: se,
          marginTop: hidden ? 0 : 1,
          height: p ? void 0 : contentHeight,
          minHeight: p ? contentHeight : void 0,
          overflowY: contentHeight !== void 0 && !p ? "hidden" : void 0,
          flexShrink: modalScrollRef ? 0 : void 0,
          children: children,
        })),
      ($[30] = _e),
      ($[31] = qe),
      ($[32] = children),
      ($[33] = contentHeight),
      ($[34] = se),
      ($[35] = hidden),
      ($[36] = modalScrollRef),
      ($[37] = M),
      ($[38] = Te),
      ($[39] = D),
      ($[40] = p),
      ($[41] = He));
  else He = $[41];
  let kn;
  if (
    $[42] !== tt ||
    $[43] !== nt ||
    $[44] !== ot ||
    $[45] !== rt ||
    $[46] !== it ||
    $[47] !== at ||
    $[48] !== lt ||
    $[49] !== Ce ||
    $[50] !== He
  )
    ((kn = r(tt, {
      ref: nt,
      flexDirection: t11,
      tabIndex: ot,
      autoFocus: rt,
      onKeyDown: it,
      flexShrink: at,
      children: [lt, Ce, He],
    })),
      ($[42] = tt),
      ($[43] = nt),
      ($[44] = ot),
      ($[45] = rt),
      ($[46] = it),
      ($[47] = at),
      ($[48] = lt),
      ($[49] = Ce),
      ($[50] = He),
      ($[51] = kn));
  else kn = $[51];
  return e(TabsContext.Provider, { value: Yo, children: kn });
}
/**
 * 单个标签页标题：当前页反色加粗，标题聚焦且有颜色时用彩色标签样式；支持点击（防误触）与悬停下划线，并声明光标位置。
 */
//@ chunk-1dkfja46.js:5871-6745 layout
function TabHeader(props) {
  let $ = w(18),
    {
      title: title,
      isCurrent: isCurrent,
      headerFocused: headerFocused,
      color: color,
      onClick: onClick,
    } = props,
    [b, x] = y(!1),
    C = useStrayClickGuard(),
    v = onClick !== void 0;
  const me = isCurrent && headerFocused;
  let I;
  if ($[0] !== me) ((I = { line: 0, column: 1, active: me }), ($[0] = me), ($[1] = I));
  else I = $[1];
  let ne = useDeclaredCursor(I),
    Ge = sequential.level === 0,
    K = color && isCurrent && headerFocused && !Ge,
    p;
  if ($[2] !== onClick || $[3] !== C)
    ((p =
      onClick === void 0
        ? void 0
        : (jt) => {
            if (C(jt)) {
              return;
            }
            onClick();
          }),
      ($[2] = onClick),
      ($[3] = C),
      ($[4] = p));
  else p = $[4];
  let ge, g;
  if ($[5] === MEMO_CACHE_SENTINEL) ((ge = () => x(!0)), (g = () => x(!1)), ($[5] = ge), ($[6] = g));
  else ((ge = $[5]), (g = $[6]));
  let oe;
  if ($[7] !== v || $[8] !== color || $[9] !== K || $[10] !== b || $[11] !== isCurrent || $[12] !== title)
    ((oe = K
      ? e(TagTabs, { color: color, bold: !0, padded: !0, children: title })
      : r(Text, { inverse: isCurrent, bold: isCurrent, underline: b && v, children: [" ", title, " "] })),
      ($[7] = v),
      ($[8] = color),
      ($[9] = K),
      ($[10] = b),
      ($[11] = isCurrent),
      ($[12] = title),
      ($[13] = oe));
  else oe = $[13];
  let ve;
  if ($[14] !== ne || $[15] !== p || $[16] !== oe)
    ((ve = e(Box, { ref: ne, flexShrink: 0, onClick: p, onMouseEnter: ge, onMouseLeave: g, children: oe })),
      ($[14] = ne),
      ($[15] = p),
      ($[16] = oe),
      ($[17] = ve));
  else ve = $[17];
  return ve;
}
//@ chunk-1dkfja46.js:6745-7010 fingerprint = Tab (1)
function Tab(t0) {
  let $ = w(4),
    { title: title, id: id, children: children } = t0,
    { selectedTab: selectedTab, width: width } = Se(TabsContext),
    insideModal = Tl();
  if (selectedTab !== (id ?? title)) {
    return null;
  }
  const t1 = insideModal ? 0 : void 0;
  let t2;
  if ($[0] !== children || $[1] !== t1 || $[2] !== width)
    ((t2 = e(Box, { width: width, flexShrink: t1, children: children })),
      ($[0] = children),
      ($[1] = t1),
      ($[2] = width),
      ($[3] = t2));
  else t2 = $[3];
  return t2;
}
//@ chunk-1dkfja46.js:7010-7053 file-local
function useTabsWidth() {
  let { width: width } = Se(TabsContext);
  return width;
}
//@ chunk-1dkfja46.js:7053-7333 fingerprint = useTabHeaderFocus (1)
function useTabHeaderFocus() {
  let $ = w(6),
    {
      headerFocused: headerFocused,
      focusHeader: focusHeader,
      blurHeader: blurHeader,
      registerOptIn: registerOptIn,
    } = Se(TabsContext),
    t;
  if ($[0] !== registerOptIn) ((t = [registerOptIn]), ($[0] = registerOptIn), ($[1] = t));
  else t = $[1];
  zt(registerOptIn, t);
  let b;
  if ($[2] !== blurHeader || $[3] !== focusHeader || $[4] !== headerFocused)
    ((b = { headerFocused: headerFocused, focusHeader: focusHeader, blurHeader: blurHeader }),
      ($[2] = blurHeader),
      ($[3] = focusHeader),
      ($[4] = headerFocused),
      ($[5] = b));
  else b = $[5];
  return b;
}
//@ chunk-1dkfja46.js:7333-7507 layout
function useNavigationHold() {
  let $ = w(3),
    [d, l] = y(0),
    c;
  if ($[0] === MEMO_CACHE_SENTINEL) ((c = () => (l(Fo), () => l(Co))), ($[0] = c));
  else c = $[0];
  let u = c;
  const t = d > 0;
  let b;
  if ($[1] !== t) ((b = [t, u]), ($[1] = t), ($[2] = b));
  else b = $[2];
  return b;
}
//@ chunk-1dkfja46.js:7507-7621 placement
function useRegisterTabsNavigationOwner() {
  let l = w(2),
    { registerNavigationOwner: registerNavigationOwner } = Se(TabsContext),
    a;
  if (l[0] !== registerNavigationOwner)
    ((a = [registerNavigationOwner]), (l[0] = registerNavigationOwner), (l[1] = a));
  else a = l[1];
  zt(registerNavigationOwner, a);
}

export { useTabsWidth, useTabHeaderFocus, Tab, Tabs, useRegisterTabsNavigationOwner };
