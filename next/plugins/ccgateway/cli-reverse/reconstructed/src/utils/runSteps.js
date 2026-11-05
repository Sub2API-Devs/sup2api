/**
 * utils/runSteps.tsx
 *
 * 2.1.316 新增。依次显示一组对话步骤（用 Ink 渲染）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t0a3c9vf.js (8)
 * attribution: placement 8
 */
import {
  init_react_production,
  useEffect,
  suspenseTypeExport,
  use,
} from "../../vendor/react/cjs/react.production.js";
import { env } from "./env.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { AppRoot } from "../components/AppRoot.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-t0a3c9vf.js:375-379 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t0a3c9vf.js:375", () => {
  init_react_production();
});
//@ chunk-t0a3c9vf.js:379-397 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t0a3c9vf.js:379", () => {
  weakMap = new WeakMap();
});
//@ chunk-t0a3c9vf.js:397-528 placement
function getRunStepsState(root) {
  let state = weakMap.get(root);
  if (!state) {
    state = {
      root,
      screen: null,
      rendered: false,
      run: 0,
      keys: 0,
      jobWrites: Promise.resolve(),
    };
    weakMap.set(root, state);
  }
  return state;
}
//@ chunk-t0a3c9vf.js:528-1806 placement
/**
 * 依次显示一组对话步骤（用 Ink 渲染）。
 */
function runSteps(root, steps, options = {}) {
  let runStepsState = getRunStepsState(root);
  let runId = ++runStepsState.run;
  let marksJobBlocked = options.marksJobBlocked === true && !!env.CLAUDE_JOB_DIR;
  return new Promise((resolve, reject) => {
    let settled = false;
    function fail(error) {
      if (settled || runStepsState.run !== runId) return;
      settled = true;
      reject(error);
    }
    function enqueueWrite(write) {
      let queued = runStepsState.jobWrites.then(write).catch(() => {
        return;
      });
      runStepsState.jobWrites = queued;
      return queued;
    }
    function advanceFrom(startIndex) {
      for (let index = startIndex; index < steps.length; index++) {
        let passed = false;
        let callReturned = true;
        let stopped = false;
        let blockedWrite;
        let tearingDown = false;
        let markBlocked = () => {
          if (marksJobBlocked && !blockedWrite && !passed && !tearingDown)
            blockedWrite = enqueueWrite(() =>
              import("../services/daemon/rendezvous.js").then((jobModule) =>
                jobModule.markStartupDialogBlocked(),
              ),
            );
        };
        let tearDown = () => {
          let pendingWrite = blockedWrite;
          blockedWrite = undefined;
          tearingDown = true;
          if (pendingWrite)
            enqueueWrite(async () => {
              let token = await pendingWrite;
              if (token) {
                let jobModule = await import("../services/daemon/rendezvous.js");
                await jobModule.clearStartupDialogBlocked(token);
              }
            });
        };
        let onStepDone = (stop) => {
          if (passed || settled || runStepsState.run !== runId) return;
          passed = true;
          stopped = stop === "stop";
          tearDown();
          if (!callReturned) settle(stopped ? "done" : advanceFrom(index + 1));
        };
        let stepResult;
        try {
          stepResult = steps[index](onStepDone);
        } catch (error) {
          fail(error);
          return "failed";
        } finally {
          callReturned = false;
        }
        if (passed) {
          if (stopped) return "done";
          continue;
        }
        if (stepResult instanceof Promise) {
          stepResult = stepResult.catch((error) => {
            fail(error);
            return new Promise(() => {});
          });
          stepResult.then((dialog) => {
            if (dialog !== null && dialog !== undefined) markBlocked();
          });
        } else if (stepResult === null || stepResult === undefined) {
          passed = true;
          continue;
        } else markBlocked();
        return {
          key: ++runStepsState.keys,
          dialog: stepResult,
          pass: () => onStepDone(),
          tornDown: tearDown,
          replaced: tearDown,
          options,
        };
      }
      return "done";
    }
    function settle(outcome) {
      if (outcome === "failed" || runStepsState.run !== runId) return;
      if (outcome === "done") {
        renderStep(runStepsState, null);
        resolve();
        return;
      }
      if (!runStepsState.rendered && outcome.dialog instanceof Promise) {
        runStepsState.screen = outcome;
        outcome.dialog.then((dialog) => {
          if (runStepsState.screen !== outcome || runStepsState.run !== runId) return;
          if (dialog === null || dialog === undefined) outcome.pass();
          else
            settle({
              ...outcome,
              dialog,
            });
        });
        return;
      }
      renderStep(runStepsState, outcome);
    }
    settle(advanceFrom(0));
  });
}
//@ chunk-t0a3c9vf.js:1806-2048 placement
function showScreen(root, dialog, options = {}) {
  let runStepsState = getRunStepsState(root);
  runStepsState.run++;
  let replaced = () => {};
  let replaced_2 = new Promise((resolve) => {
    replaced = resolve;
  });
  let screen = {
    key: ++runStepsState.keys,
    dialog,
    pass: () => {},
    tornDown: () => {},
    replaced,
    options,
  };
  renderStep(runStepsState, screen);
  return {
    update: (dialog) => {
      if (runStepsState.screen?.key === screen.key)
        renderStep(runStepsState, {
          ...screen,
          dialog,
        });
    },
    replaced: replaced_2,
  };
}
//@ chunk-t0a3c9vf.js:2048-2214 placement
/**
 * 渲染当前步骤
 */
function renderStep(runStepsState, screen) {
  if (runStepsState.screen && runStepsState.screen.key !== screen?.key) runStepsState.screen.replaced();
  runStepsState.screen = screen;
  if (!runStepsState.rendered && screen === null) return;
  runStepsState.rendered = true;
  runStepsState.root.render(
    jsxProd_default(StepTree, {
      tree: runStepsState,
      screen,
    }),
  );
}
//@ chunk-t0a3c9vf.js:2214-2581 placement
/**
 * 步骤树组件
 */
function StepTree(props) {
  let $ = useMemoCache(8);
  let { tree, screen } = props;
  let cleanup;
  let deps;
  if ($[0] !== tree) {
    cleanup = () => () => {
      tree.rendered = false;
      tree.screen?.tornDown();
    };
    deps = [tree];
    $[0] = tree;
    $[1] = cleanup;
    $[2] = deps;
  } else {
    cleanup = $[1];
    deps = $[2];
  }
  useEffect(cleanup, deps);
  if (screen === null) {
    return null;
  }
  let children;
  if ($[3] !== screen) {
    children = jsxProd_default(StepScreen, {
      screen,
    });
    $[3] = screen;
    $[4] = children;
  } else children = $[4];
  let element;
  if ($[5] !== screen.key || $[6] !== children) {
    element = jsxProd_default(
      suspenseTypeExport,
      {
        fallback: null,
        children,
      },
      screen.key,
    );
    $[5] = screen.key;
    $[6] = children;
    $[7] = element;
  } else element = $[7];
  return element;
}
//@ chunk-t0a3c9vf.js:2581-3147 placement
/**
 * 步骤屏幕渲染
 */
function StepScreen(props) {
  let $ = useMemoCache(12);
  let { screen } = props;
  let dialog = screen.dialog instanceof Promise ? use(screen.dialog) : screen.dialog;
  let hasDialog = dialog !== null && dialog !== undefined;
  let effect;
  let deps;
  if ($[0] !== screen || $[1] !== hasDialog) {
    effect = () => {
      if (!hasDialog) screen.pass();
    };
    deps = [screen, hasDialog];
    $[0] = screen;
    $[1] = hasDialog;
    $[2] = effect;
    $[3] = deps;
  } else {
    effect = $[2];
    deps = $[3];
  }
  useEffect(effect, deps);
  if (!hasDialog) {
    return null;
  }
  let { session, onChangeAppState, storageV5 } = screen.options;
  if (!session) {
    return dialog;
  }
  let onChangeAppState_2;
  if ($[4] !== onChangeAppState || $[5] !== session) {
    onChangeAppState_2 = onChangeAppState && ((newAppState) => onChangeAppState(newAppState, session));
    $[4] = onChangeAppState;
    $[5] = session;
    $[6] = onChangeAppState_2;
  } else onChangeAppState_2 = $[6];
  let element;
  if ($[7] !== dialog || $[8] !== session || $[9] !== storageV5 || $[10] !== onChangeAppState_2) {
    element = jsxProd_default(AppRoot, {
      session,
      storageV5,
      onChangeAppState: onChangeAppState_2,
      children: dialog,
    });
    $[7] = dialog;
    $[8] = session;
    $[9] = storageV5;
    $[10] = onChangeAppState_2;
    $[11] = element;
  } else element = $[11];
  return element;
}
export { showScreen, runSteps };
