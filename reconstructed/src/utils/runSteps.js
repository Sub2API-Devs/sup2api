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
import { init_react_production, P, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { env } from "./env.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { AppRoot } from "../components/AppRoot.js";

//@ chunk-d6c8e5w8.js:375-379 placement
init_react_production();
//@ chunk-d6c8e5w8.js:379-397 placement
var weakMap = new WeakMap();
//@ chunk-d6c8e5w8.js:397-528 placement
function getRunStepsState(r) {
  let n = weakMap.get(r);
  if (!n) {
    n = {
      root: r,
      screen: null,
      rendered: false,
      run: 0,
      keys: 0,
      jobWrites: Promise.resolve(),
    };
    weakMap.set(r, n);
  }
  return n;
}
//@ chunk-d6c8e5w8.js:528-1806 placement
/**
 * 依次显示一组对话步骤（用 Ink 渲染）。
 */
function runSteps(r, n, t = {}) {
  let runStepsState = getRunStepsState(r);
  let d = ++runStepsState.run;
  let f = t.marksJobBlocked === true && !!env.CLAUDE_JOB_DIR;
  return new Promise((resolve, reject) => {
    let S = false;
    function k(error) {
      if (S || runStepsState.run !== d) return;
      S = true;
      reject(error);
    }
    function m(s) {
      let p = runStepsState.jobWrites.then(s).catch(() => {
        return;
      });
      runStepsState.jobWrites = p;
      return p;
    }
    function A(s) {
      for (let p = s; p < n.length; p++) {
        let y = false;
        let J = true;
        let N = false;
        let v;
        let V = false;
        let M = () => {
          if (f && !v && !y && !V)
            v = m(() => import("./chunk-bc1hsbps.js").then((c) => c.markStartupDialogBlocked()));
        };
        let D = () => {
          let c = v;
          v = undefined;
          V = true;
          if (c)
            m(async () => {
              let z = await c;
              if (z) {
                let F = await import("./chunk-bc1hsbps.js");
                await F.clearStartupDialogBlocked(z);
              }
            });
        };
        let _ = (c) => {
          if (y || S || runStepsState.run !== d) return;
          y = true;
          N = c === "stop";
          D();
          if (!J) R(N ? "done" : A(p + 1));
        };
        let u;
        try {
          u = n[p](_);
        } catch (error) {
          k(error);
          return "failed";
        } finally {
          J = false;
        }
        if (y) {
          if (N) return "done";
          continue;
        }
        if (u instanceof Promise) {
          u = u.catch((error) => {
            k(error);
            return new Promise(() => {});
          });
          u.then((c) => {
            if (c !== null && c !== undefined) M();
          });
        } else if (u === null || u === undefined) {
          y = true;
          continue;
        } else M();
        return {
          key: ++runStepsState.keys,
          dialog: u,
          pass: () => _(),
          tornDown: D,
          replaced: D,
          options: t,
        };
      }
      return "done";
    }
    function R(s) {
      if (s === "failed" || runStepsState.run !== d) return;
      if (s === "done") {
        renderStep(runStepsState, null);
        resolve();
        return;
      }
      if (!runStepsState.rendered && s.dialog instanceof Promise) {
        runStepsState.screen = s;
        s.dialog.then((p) => {
          if (runStepsState.screen !== s || runStepsState.run !== d) return;
          if (p === null || p === undefined) s.pass();
          else
            R({
              ...s,
              dialog: p,
            });
        });
        return;
      }
      renderStep(runStepsState, s);
    }
    R(A(0));
  });
}
//@ chunk-d6c8e5w8.js:1806-2048 placement
function showScreen(r, dialog, options = {}) {
  let runStepsState = getRunStepsState(r);
  runStepsState.run++;
  let replaced = () => {};
  let replaced_2 = new Promise((resolve) => {
    replaced = resolve;
  });
  let l = {
    key: ++runStepsState.keys,
    dialog,
    pass: () => {},
    tornDown: () => {},
    replaced,
    options,
  };
  renderStep(runStepsState, l);
  return {
    update: (dialog) => {
      if (runStepsState.screen?.key === l.key)
        renderStep(runStepsState, {
          ...l,
          dialog,
        });
    },
    replaced: replaced_2,
  };
}
//@ chunk-d6c8e5w8.js:2048-2214 placement
/**
 * 渲染当前步骤
 */
function renderStep(runStepsState, n) {
  if (runStepsState.screen && runStepsState.screen.key !== n?.key) runStepsState.screen.replaced();
  runStepsState.screen = n;
  if (!runStepsState.rendered && n === null) return;
  runStepsState.rendered = true;
  runStepsState.root.render(
    jsxProd_default(StepTree, {
      tree: runStepsState,
      screen: n,
    }),
  );
}
//@ chunk-d6c8e5w8.js:2214-2581 placement
/**
 * 步骤树组件
 */
function StepTree(props) {
  let o = w(8);
  let { tree, screen } = props;
  let d;
  let f;
  if (o[0] !== tree) {
    d = () => () => {
      tree.rendered = false;
      tree.screen?.tornDown();
    };
    f = [tree];
    o[0] = tree;
    o[1] = d;
    o[2] = f;
  } else {
    d = o[1];
    f = o[2];
  }
  P(d, f);
  if (screen === null) {
    return null;
  }
  let children;
  if (o[3] !== screen) {
    children = jsxProd_default(StepScreen, {
      screen,
    });
    o[3] = screen;
    o[4] = children;
  } else children = o[4];
  let a;
  if (o[5] !== screen.key || o[6] !== children) {
    a = jsxProd_default(
      fo,
      {
        fallback: null,
        children,
      },
      screen.key,
    );
    o[5] = screen.key;
    o[6] = children;
    o[7] = a;
  } else a = o[7];
  return a;
}
//@ chunk-d6c8e5w8.js:2581-3147 placement
/**
 * 步骤屏幕渲染
 */
function StepScreen(props) {
  let d = w(12);
  let { screen } = props;
  let t = screen.dialog instanceof Promise ? Qr(screen.dialog) : screen.dialog;
  let o = t !== null && t !== undefined;
  let f;
  let l;
  if (d[0] !== screen || d[1] !== o) {
    f = () => {
      if (!o) screen.pass();
    };
    l = [screen, o];
    d[0] = screen;
    d[1] = o;
    d[2] = f;
    d[3] = l;
  } else {
    f = d[2];
    l = d[3];
  }
  P(f, l);
  if (!o) {
    return null;
  }
  let { session, onChangeAppState, storageV5 } = screen.options;
  if (!session) {
    return t;
  }
  let onChangeAppState_2;
  if (d[4] !== onChangeAppState || d[5] !== session) {
    onChangeAppState_2 = onChangeAppState && ((A) => onChangeAppState(A, session));
    d[4] = onChangeAppState;
    d[5] = session;
    d[6] = onChangeAppState_2;
  } else onChangeAppState_2 = d[6];
  let R;
  if (d[7] !== t || d[8] !== session || d[9] !== storageV5 || d[10] !== onChangeAppState_2) {
    R = jsxProd_default(AppRoot, {
      session,
      storageV5,
      onChangeAppState: onChangeAppState_2,
      children: t,
    });
    d[7] = t;
    d[8] = session;
    d[9] = storageV5;
    d[10] = onChangeAppState_2;
    d[11] = R;
  } else R = d[11];
  return R;
}
export { showScreen, runSteps };
