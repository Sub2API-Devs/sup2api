/**
 * components/pluginUi/promptChangeHook.ts
 *
 * 2.1.316 新增。prompt.change 插件钩子桥接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "../../plugins/functionHooks/eventCatalog.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { tellOnce } from "../../plugins/functionHooks/ui/renderNotices.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-18hwfzwa.js:1807723-1807785 placement
function hasPromptChangeHookingSite() {
  try {
    return hasModuleHookingSite("prompt.change");
  } catch {
    return false;
  }
}
//@ chunk-18hwfzwa.js:1807785-1807823 placement
var jRt = Object.freeze({
  kind: "clear",
});
//@ chunk-18hwfzwa.js:1807823-1807862 placement
var qRt = Object.freeze({
  kind: "engine",
});
//@ chunk-18hwfzwa.js:1807862-1807995 placement
function promptChangeOrigin(h, x) {
  let D = h.after === "" ? jRt : qRt;
  let origin = h.origin;
  if (origin === undefined || origin.kind === "composer") return D;
  return origin.kind === "landing" ? (x ?? D) : origin;
}
//@ chunk-18hwfzwa.js:1807995-1808005 placement
var MAX_STALLED_PLUGINS = 8;
//@ chunk-18hwfzwa.js:1808005-1808064 placement
function raiseCorePromptChange(h, signal) {
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.change", {
    signal,
  })(h);
}
//@ chunk-18hwfzwa.js:1808064-1808313 placement
function warnPromptChangeStalled(h) {
  let joined = uniq(h).toSorted().join(", ");
  let D = `prompt.change: ${h.length} dispatches in a row for fills by ${joined}; not raised again until the box changes another way`;
  logForDebugging(D, {
    level: "warn",
  });
  tellOnce({
    key: `prompt.change stalled ${joined}`,
    lead: "hooks",
    text: D,
  });
}
//@ chunk-18hwfzwa.js:1808313-1809318 placement
function raisePromptChange(h, x = {}) {
  let raise = x.raise ?? raiseCorePromptChange;
  let later = x.later ?? queueMicrotask;
  let isHooked = x.isHooked ?? hasPromptChangeHookingSite;
  let ke = x.report ?? ((Dt) => logForDebugging(Dt));
  let stall = x.stall ?? warnPromptChangeStalled;
  let abortController = new AbortController();
  let He;
  let We;
  let ze;
  let Xe;
  let rt = [];
  let kt = false;
  let At = false;
  let It = false;
  function Ot(Dt) {
    if (Dt.kind !== "plugin") return false;
    let Lt = rt.length >= MAX_STALLED_PLUGINS;
    if (Lt && !kt) {
      kt = true;
      stall(rt);
    }
    rt = Lt ? rt : [...rt, Dt.name];
    return Lt;
  }
  function Et() {
    It = false;
    let Dt = ze;
    if (At || abortController.signal.aborted || He === undefined || Dt === undefined) return;
    let oo = h();
    let Xt = We !== undefined && oo.text !== We;
    let io = oo.text !== He || Xt;
    He = undefined;
    We = undefined;
    ze = undefined;
    if (!io || !isHooked() || Ot(Dt)) return;
    At = true;
    new Promise((resolve) =>
      resolve(
        raise(
          {
            ...oo,
            origin: Dt,
          },
          abortController.signal,
        ),
      ),
    )
      .catch((error) => {
        ke(`prompt.change: ${errorMessage(error)}`);
      })
      .finally(() => {
        At = false;
      })
      .then(Et);
  }
  return {
    changed: (Dt) => {
      let Lt = Dt.origin?.kind === "composer";
      if (abortController.signal.aborted) return;
      Xe = Lt ? undefined : promptChangeOrigin(Dt, Xe);
      if (Xe?.kind !== "plugin") {
        rt = [];
        kt = false;
      }
      if (Xe === undefined) {
        We = He === undefined ? undefined : Dt.after;
        return;
      }
      if (!isHooked()) {
        He = undefined;
        We = undefined;
        ze = undefined;
        return;
      }
      He ??= Dt.before;
      ze = Xe;
      if (!It && !At) {
        It = true;
        later(Et);
      }
    },
    dispose: () => {
      He = undefined;
      We = undefined;
      ze = undefined;
      abortController.abort();
    },
  };
}
export { raisePromptChange };
