/**
 * utils/runSteps.tsx
 *
 * 2.1.316 新增。依次显示一组对话步骤（用 Ink 渲染）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d6c8e5w8.js (8)
 * attribution: placement 8
 */
import { j, P, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { env } from "./env.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { AppRoot } from "../components/AppRoot.js";

//@ chunk-d6c8e5w8.js:375-379 placement
j();
//@ chunk-d6c8e5w8.js:379-397 placement
var weakMap = new WeakMap();
//@ chunk-d6c8e5w8.js:397-528 placement
function getRunStepsState(r) {
  let n = weakMap.get(r);
  if (!n)
    ((n = { root: r, screen: null, rendered: !1, run: 0, keys: 0, jobWrites: Promise.resolve() }),
      weakMap.set(r, n));
  return n;
}
/**
 * 依次显示一组对话步骤（用 Ink 渲染）。
 */
//@ chunk-d6c8e5w8.js:528-1806 placement
function runSteps(r, n, t = {}) {
  let o = getRunStepsState(r),
    d = ++o.run,
    f = t.marksJobBlocked === !0 && !!env.CLAUDE_JOB_DIR;
  return new Promise((l, a) => {
    let S = !1;
    function k(s) {
      if (S || o.run !== d) return;
      ((S = !0), a(s));
    }
    function m(s) {
      let p = o.jobWrites.then(s).catch(() => {
        return;
      });
      return ((o.jobWrites = p), p);
    }
    function A(s) {
      for (let p = s; p < n.length; p++) {
        let y = !1,
          J = !0,
          N = !1,
          v,
          V = !1,
          M = () => {
            if (f && !v && !y && !V)
              v = m(() => import("./chunk-bc1hsbps.js").then((c) => c.markStartupDialogBlocked()));
          },
          D = () => {
            let c = v;
            if (((v = void 0), (V = !0), c))
              m(async () => {
                let z = await c;
                if (z) {
                  let F = await import("./chunk-bc1hsbps.js");
                  await F.clearStartupDialogBlocked(z);
                }
              });
          },
          _ = (c) => {
            if (y || S || o.run !== d) return;
            if (((y = !0), (N = c === "stop"), D(), !J)) R(N ? "done" : A(p + 1));
          },
          u;
        try {
          u = n[p](_);
        } catch (error) {
          return (k(error), "failed");
        } finally {
          J = !1;
        }
        if (y) {
          if (N) return "done";
          continue;
        }
        if (u instanceof Promise)
          ((u = u.catch((c) => (k(c), new Promise(() => {})))),
            u.then((c) => {
              if (c !== null && c !== void 0) M();
            }));
        else if (u === null || u === void 0) {
          y = !0;
          continue;
        } else M();
        return { key: ++o.keys, dialog: u, pass: () => _(), tornDown: D, replaced: D, options: t };
      }
      return "done";
    }
    function R(s) {
      if (s === "failed" || o.run !== d) return;
      if (s === "done") {
        (renderStep(o, null), l());
        return;
      }
      if (!o.rendered && s.dialog instanceof Promise) {
        ((o.screen = s),
          s.dialog.then((p) => {
            if (o.screen !== s || o.run !== d) return;
            if (p === null || p === void 0) s.pass();
            else R({ ...s, dialog: p });
          }));
        return;
      }
      renderStep(o, s);
    }
    R(A(0));
  });
}
//@ chunk-d6c8e5w8.js:1806-2048 placement
function showScreen(r, n, t = {}) {
  let o = getRunStepsState(r);
  o.run++;
  let d = () => {},
    promise = new Promise((a) => {
      d = a;
    }),
    l = { key: ++o.keys, dialog: n, pass: () => {}, tornDown: () => {}, replaced: d, options: t };
  return (
    renderStep(o, l),
    {
      update: (a) => {
        if (o.screen?.key === l.key) renderStep(o, { ...l, dialog: a });
      },
      replaced: promise,
    }
  );
}
/**
 * 渲染当前步骤
 */
//@ chunk-d6c8e5w8.js:2048-2214 placement
function renderStep(r, n) {
  if (r.screen && r.screen.key !== n?.key) r.screen.replaced();
  if (((r.screen = n), !r.rendered && n === null)) return;
  ((r.rendered = !0), r.root.render(e(StepTree, { tree: r, screen: n })));
}
/**
 * 步骤树组件
 */
//@ chunk-d6c8e5w8.js:2214-2581 placement
function StepTree(r) {
  let o = w(8),
    { tree: tree, screen: screen } = r,
    d,
    f;
  if (o[0] !== tree)
    ((d = () => () => {
      ((tree.rendered = !1), tree.screen?.tornDown());
    }),
      (f = [tree]),
      (o[0] = tree),
      (o[1] = d),
      (o[2] = f));
  else ((d = o[1]), (f = o[2]));
  if ((P(d, f), screen === null)) {
    return null;
  }
  let l;
  if (o[3] !== screen) ((l = e(StepScreen, { screen: screen })), (o[3] = screen), (o[4] = l));
  else l = o[4];
  let a;
  if (o[5] !== screen.key || o[6] !== l)
    ((a = e(fo, { fallback: null, children: l }, screen.key)), (o[5] = screen.key), (o[6] = l), (o[7] = a));
  else a = o[7];
  return a;
}
/**
 * 步骤屏幕渲染
 */
//@ chunk-d6c8e5w8.js:2581-3147 placement
function StepScreen(r) {
  let d = w(12),
    { screen: screen } = r,
    t = screen.dialog instanceof Promise ? Qr(screen.dialog) : screen.dialog,
    o = t !== null && t !== void 0,
    f,
    l;
  if (d[0] !== screen || d[1] !== o)
    ((f = () => {
      if (!o) screen.pass();
    }),
      (l = [screen, o]),
      (d[0] = screen),
      (d[1] = o),
      (d[2] = f),
      (d[3] = l));
  else ((f = d[2]), (l = d[3]));
  if ((P(f, l), !o)) {
    return null;
  }
  let { session: session, onChangeAppState: onChangeAppState, storageV5: storageV5 } = screen.options;
  if (!session) {
    return t;
  }
  let m;
  if (d[4] !== onChangeAppState || d[5] !== session)
    ((m = onChangeAppState && ((A) => onChangeAppState(A, session))),
      (d[4] = onChangeAppState),
      (d[5] = session),
      (d[6] = m));
  else m = d[6];
  let R;
  if (d[7] !== t || d[8] !== session || d[9] !== storageV5 || d[10] !== m)
    ((R = e(AppRoot, { session: session, storageV5: storageV5, onChangeAppState: m, children: t })),
      (d[7] = t),
      (d[8] = session),
      (d[9] = storageV5),
      (d[10] = m),
      (d[11] = R));
  else R = d[11];
  return R;
}

export { showScreen, runSteps };
