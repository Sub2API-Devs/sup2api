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
function WRt() {
  try {
    return hasModuleHookingSite("prompt.change");
  } catch {
    return !1;
  }
}
//@ chunk-18hwfzwa.js:1807785-1807823 placement
var freeze_5 = Object.freeze({ kind: "clear" });
//@ chunk-18hwfzwa.js:1807823-1807862 placement
var freeze_6 = Object.freeze({ kind: "engine" });
//@ chunk-18hwfzwa.js:1807862-1807995 placement
function promptChangeOrigin(h, x) {
  let D = h.after === "" ? freeze_5 : freeze_6,
    origin = h.origin;
  if (origin === void 0 || origin.kind === "composer") return D;
  return origin.kind === "landing" ? (x ?? D) : origin;
}
//@ chunk-18hwfzwa.js:1807995-1808005 placement
var KRt = 8;
//@ chunk-18hwfzwa.js:1808005-1808064 placement
function GRt(h, x) {
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.change", { signal: x })(h);
}
//@ chunk-18hwfzwa.js:1808064-1808313 placement
function warnPromptChangeStalled(h) {
  let joined = uniq(h).toSorted().join(", "),
    D = `prompt.change: ${h.length} dispatches in a row for fills by ${joined}; not raised again until the box changes another way`;
  (logForDebugging(D, { level: "warn" }),
    tellOnce({ key: `prompt.change stalled ${joined}`, lead: "hooks", text: D }));
}
//@ chunk-18hwfzwa.js:1808313-1809318 placement
function raisePromptChange(h, x = {}) {
  let D = x.raise ?? GRt,
    L = x.later ?? queueMicrotask,
    ee = x.isHooked ?? WRt,
    ke = x.report ?? ((Dt) => logForDebugging(Dt)),
    Re = x.stall ?? warnPromptChangeStalled,
    abortController = new AbortController(),
    He,
    We,
    ze,
    Xe,
    rt = [],
    kt = !1,
    At = !1,
    It = !1;
  function Ot(Dt) {
    if (Dt.kind !== "plugin") return !1;
    let Lt = rt.length >= KRt;
    if (Lt && !kt) ((kt = !0), Re(rt));
    return ((rt = Lt ? rt : [...rt, Dt.name]), Lt);
  }
  function Et() {
    It = !1;
    let Dt = ze;
    if (At || abortController.signal.aborted || He === void 0 || Dt === void 0) return;
    let oo = h(),
      Xt = We !== void 0 && oo.text !== We,
      io = oo.text !== He || Xt;
    if (((He = void 0), (We = void 0), (ze = void 0), !io || !ee() || Ot(Dt))) return;
    ((At = !0),
      new Promise((so) => so(D({ ...oo, origin: Dt }, abortController.signal)))
        .catch((so) => {
          ke(`prompt.change: ${errorMessage(so)}`);
        })
        .finally(() => {
          At = !1;
        })
        .then(Et));
  }
  return {
    changed: (Dt) => {
      let Lt = Dt.origin?.kind === "composer";
      if (abortController.signal.aborted) return;
      if (((Xe = Lt ? void 0 : promptChangeOrigin(Dt, Xe)), Xe?.kind !== "plugin")) ((rt = []), (kt = !1));
      if (Xe === void 0) {
        We = He === void 0 ? void 0 : Dt.after;
        return;
      }
      if (!ee()) {
        ((He = void 0), (We = void 0), (ze = void 0));
        return;
      }
      if (((He ??= Dt.before), (ze = Xe), !It && !At)) ((It = !0), L(Et));
    },
    dispose: () => {
      ((He = void 0), (We = void 0), (ze = void 0), abortController.abort());
    },
  };
}

export { raisePromptChange };
