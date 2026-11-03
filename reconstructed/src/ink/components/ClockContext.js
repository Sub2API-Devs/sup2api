/**
 * ink/components/ClockContext.tsx
 *
 * 并入时钟上下文 useClock 与 StyledText
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/ClockContext.tsx
 * pieces: chunk-cg10fy59.js (5), chunk-x6v6jz2y.js (4)
 * attribution: placement 8, fingerprint 1
 */
import { Xh } from "../scrollConstants.js";
import { qt, y, P, j, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalFocus } from "../hooks/use-terminal-focus.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText } from "./Text.js";

//@ chunk-cg10fy59.js:902-928 placement
function R() {
  return ClockProvider_2(Xh);
}
//@ chunk-cg10fy59.js:928-1020 placement
var $L = (c, r) => {
    let t = setTimeout(c, r);
    return () => clearTimeout(t);
  },
  bTe = () => () => {},
  exr = () => null;
//@ chunk-cg10fy59.js:1020-1614 placement
function ClockProvider_2(t0) {
  let r = new Map(),
    t = null,
    n = t0,
    startTime = performance.now(),
    i = 0;
  function s() {
    i = performance.now() - startTime;
    for (let o of r.keys()) o();
  }
  function a() {
    if ([...r.values()].some(Boolean)) {
      if (t !== null) clearInterval(t);
      else i = performance.now() - startTime;
      t = setInterval(s, n);
    } else if (t !== null) (clearInterval(t), (t = null));
  }
  function f(o, m) {
    return (
      r.set(o, m),
      a(),
      () => {
        (r.delete(o), a());
      }
    );
  }
  return {
    subscribeKeepAlive(o) {
      return f(o, !0);
    },
    subscribeFollower(o) {
      return f(o, !1);
    },
    now() {
      if (t !== null) return i;
      return performance.now() - startTime;
    },
    setTickInterval(o) {
      if (o === n) return;
      ((n = o), a());
    },
    setTimeout(o, m) {
      let b = setTimeout(o, m);
      return () => clearTimeout(b);
    },
  };
}
//@ chunk-cg10fy59.js:1614-1637 placement
var _T = qt(null),
  T = Xh * 2;
/**
 * 动画时钟 Provider：终端有焦点时按正常帧间隔滴答，失焦时放慢，供 useAnimationFrame 等订阅。
 */
//@ chunk-cg10fy59.js:1637-1925 fingerprint = createClock (0.744)
function ClockProvider(props) {
  let l = w(7),
    { children: children } = props,
    [clock] = y(R),
    isFocused = useTerminalFocus(),
    i,
    s;
  if (l[0] !== clock || l[1] !== isFocused)
    ((i = () => {
      clock.setTickInterval(isFocused ? Xh : T);
    }),
      (s = [clock, isFocused]),
      (l[0] = clock),
      (l[1] = isFocused),
      (l[2] = i),
      (l[3] = s));
  else ((i = l[2]), (s = l[3]));
  P(i, s);
  let a;
  if (l[4] !== children || l[5] !== clock)
    ((a = e(_T.Provider, { value: clock, children: children })),
      (l[4] = children),
      (l[5] = clock),
      (l[6] = a));
  else a = l[6];
  return a;
}
/**
 * <Ansi> 渲染每个样式段用的小组件：粗体与暗不能同时生效时优先暗，否则粗体，再否则普通 <Text>。
 */
//@ chunk-x6v6jz2y.js:16990-17463 placement = StyledText (1)
function StyledText(t0) {
  let r = w(14),
    l,
    u,
    d,
    p;
  if (r[0] !== t0)
    (({ bold: l, dim: d, children: u, ...p } = t0),
      (r[0] = t0),
      (r[1] = l),
      (r[2] = u),
      (r[3] = d),
      (r[4] = p));
  else ((l = r[1]), (u = r[2]), (d = r[3]), (p = r[4]));
  if (d) {
    let m;
    if (r[5] !== u || r[6] !== p)
      ((m = e(BaseText, { ...p, dim: !0, children: u })), (r[5] = u), (r[6] = p), (r[7] = m));
    else m = r[7];
    return m;
  }
  if (l) {
    let m;
    if (r[8] !== u || r[9] !== p)
      ((m = e(BaseText, { ...p, bold: !0, children: u })), (r[8] = u), (r[9] = p), (r[10] = m));
    else m = r[10];
    return m;
  }
  let m;
  if (r[11] !== u || r[12] !== p)
    ((m = e(BaseText, { ...p, children: u })), (r[11] = u), (r[12] = p), (r[13] = m));
  else m = r[13];
  return m;
}
//@ chunk-x6v6jz2y.js:17463-17467 placement
j();
//@ chunk-x6v6jz2y.js:17467-17471 placement
j();
//@ chunk-x6v6jz2y.js:17471-17573 placement
function useClock() {
  let o = Se(_T);
  if (!o) throw Error("useClock must be used within a ClockProvider");
  return o;
}

export { useClock, _T, $L, ClockProvider, bTe, StyledText, exr };
