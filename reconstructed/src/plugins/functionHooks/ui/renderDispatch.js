/**
 * plugins/functionHooks/ui/renderDispatch.ts
 *
 * ui.render 站点分发（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (63)
 * attribution: placement 63
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
} from "util";
import { modulesHookingEvent, hookMembersFor, hookOriginFromStack, matcherAdmits } from "../hookDispatch.js";
import { RENDER_EVENT, RENDER_SITES } from "./renderSites.js";
import { hxt, isPlainDataObject } from "../../../utils/hooks/functionHookMatchers.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import { LINE_SCRUB, collectStrings } from "./textScrub.js";
import { toldRefusals, tellOnce } from "./renderNotices.js";
import { hasUiLogSink, MFi } from "../hooksWorkerClient.js";
import { logForDebugging } from "../../../utils/debug.js";
import { MESSAGE_COMPONENT_NAMES } from "../sites/uiSites.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import {
  plainCodeFinding,
  plainCodeNote,
  plainLinkFinding,
  plainLinkNote,
  SHOWN_TEXT_MAX,
  textRoom,
  shownKey,
  wellFormed,
  validateTree,
  withKnownBorders,
  withUsableBoxKeys,
  withRemoteProps,
  withPlainLinks,
  withPlainCode,
  withShownText,
} from "./validateTree.js";
import { throttledRunTelemetry, dc } from "../telemetry/runTelemetry.js";
import { logFeatureBad, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { MAX_DEPTH, valueKind } from "../sites/plainData.js";
import { Xv, Lae } from "../sites/promptContextSites.js";
import { IT, hasModuleHookingSite } from "../../hooksModules/loadedModuleFilters.js";
import { classifyPluginOrigin } from "../panes.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { ENGINE, createStepRecorder, jme, reportChainFailure } from "../dispatch/chain.js";
import { errorMessage } from "../../../utils/errors.js";
import { BORDER_STYLES } from "./styleProps.js";
import { createDrawingScope, Qu, Ho } from "../dispatch/dispatchScope.js";
import { renderInstanceKey, recordStateReads, US } from "../api/state.js";
import {
  renderPluginsForInstance,
  JB,
  rD,
  renderVersionKey,
  renderPaceOf,
  NM,
  FM,
  subscribeRenderVersions,
} from "./renderInstances.js";
import { ONE_ENGINE_NODE_COMPONENT, zte, clientMountKey } from "./treeConstants.js";
import {
  releaseAllPresses,
  releaseDroppedPresses,
  hostDrawnPresses,
  handleUiPress,
  Cer,
  xer,
} from "./interactions.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";
import {
  _r,
  surfaceBundleHashes,
  Fp,
  dispatchDesktopClient,
  postDesktopClientMessage,
  createDesktopFaultHandler,
} from "./desktopSurface.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import {
  setRenderSites,
  getActiveModNames,
} from "../../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { dx, Uc } from "./renderBridge.js";
import { findEngineRef } from "./index.js";
import { collectClientElements } from "./elements.js";

//@ chunk-s61vbvea.js:633150-633238 placement
var chainModules = (e, n) =>
  modulesHookingEvent(RENDER_EVENT, n, { e }).filter((r) =>
    hxt(r.matcherFor(RENDER_EVENT), "component", e.component),
  );
//@ chunk-s61vbvea.js:633238-633254 placement
var UNATTRIBUTED_LEAD = "hooks";
//@ chunk-s61vbvea.js:633254-633322 placement
function leadOf(e) {
  let [n, ...r] = e;
  return n !== void 0 && r.length === 0 ? n : UNATTRIBUTED_LEAD;
}
//@ chunk-s61vbvea.js:633322-633385 placement
var loadOf = (e) => e.map((n) => `${n.name}#${n.environmentId}`).join();
//@ chunk-s61vbvea.js:633385-633443 placement
var tellerOf = (e) => ({ load: loadOf(e), lead: leadOf(e.map((n) => n.name)) });
//@ chunk-s61vbvea.js:633443-633472 placement
var chainTeller = (e, n) => tellerOf(chainModules(e, n));
//@ chunk-s61vbvea.js:633472-633590 placement
var coreHandler = (e, n) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: (r) => Promise.resolve({ type: "engine", ref: e.keep(n(r), void 0) }),
});
//@ chunk-s61vbvea.js:633590-633614 placement
var RENDER_SITE = UI_ENV_SITE_RULES["ui.render"];
//@ chunk-s61vbvea.js:633614-633697 placement
function ledgersByTree() {
  let weakMap = new WeakMap();
  return {
    get: (n) => weakMap.get(n),
    set: (n, r) => {
      weakMap.set(n, r);
    },
  };
}
//@ chunk-s61vbvea.js:633697-633711 placement
var heldByTree = ledgersByTree();
//@ chunk-s61vbvea.js:633711-633751 placement
var heldRenderInput = (e, n) => heldByTree.get(e)?.of(n)?.input;
//@ chunk-s61vbvea.js:633751-633782 placement
var logLine = (e) => e.replace(LINE_SCRUB, "?");
//@ chunk-s61vbvea.js:633782-633837 placement
var isPlainCodeSaid = (e) => toldRefusals.has(`noted ${e}`) && (toldRefusals.has(e) || !hasUiLogSink());
//@ chunk-s61vbvea.js:633837-633877 placement
var plainCodeText = (e, n) => `ui.render (${e}): ${n}`;
//@ chunk-s61vbvea.js:633877-634013 placement
function sayPlainCode({ key: key, lead: lead, text: text }) {
  let s = `noted ${key}`;
  if (!toldRefusals.has(s)) (toldRefusals.add(s), logForDebugging(`${lead}: ${text}`, { level: "warn" }));
  tellOnce({ key: key, lead: lead, text: text });
}
//@ chunk-s61vbvea.js:634013-634191 placement
function plainKey(e, n) {
  let r = MESSAGE_COMPONENT_NAMES.has(e.component);
  return [
    getPluginRegistry()
      .loadedModules.map((loadedModule) => `${loadedModule.name}#${loadedModule.environmentId}`)
      .join(),
    r ? e.component : `${e.component} ${e.requestId}`,
    n,
  ].join(" ");
}
//@ chunk-s61vbvea.js:634191-634335 placement
function tellPlainCode({ input: input, drawnPlain: drawnPlain, origin: origin }) {
  let s = plainKey(input, plainCodeFinding(drawnPlain));
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainCodeNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634335-634497 placement
function tellPlainLink({ input: input, drawnPlain: drawnPlain, origin: origin }) {
  let s = plainKey(input, `${input.surface} ${plainLinkFinding(drawnPlain)}`);
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainLinkNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634497-634581 placement
var NOTHING_LEFT = Object.freeze({ AbovePrompt: "nothing was drawn", Pane: "the pane was closed" });
//@ chunk-s61vbvea.js:634581-634799 placement
function countRefused(e, n) {
  let r = NOTHING_LEFT[e] !== void 0,
    s = r ? "tree_refused_left_empty" : "tree_refused",
    h = throttledRunTelemetry({ subject: e, event: RENDER_EVENT, reason: s }, n);
  if (h === void 0) return;
  r ? logFeatureBad("plugin_function_hooks_draw", s, h) : logFeatureSad("plugin_function_hooks_draw", s, h);
}
//@ chunk-s61vbvea.js:634799-634953 placement
function countLeftEmpty(e, n) {
  let { component: component } = e,
    s = RENDER_SITE.refusedSubject?.(e) ?? component,
    h = dc.get(s);
  if ((dc.delete(s), h !== void 0 && NOTHING_LEFT[component] !== void 0 && n.type === "engine"))
    countRefused(component, () => h);
}
//@ chunk-s61vbvea.js:634953-635084 placement
function refusedText(e, n) {
  let s = NOTHING_LEFT[e] !== void 0 ? "nothing was drawn" : "the engine drew its own";
  return `ui.render (${e}) refused: ${n}; ${s}`;
}
//@ chunk-s61vbvea.js:635084-635241 placement
function tellRefused({ input: input, problem: problem, origin: origin }) {
  if (!hasUiLogSink()) return;
  let { load: load, lead: lead } = chainTeller(input, origin);
  tellOnce({
    key: [load, input.component, problem].join(" "),
    lead: lead,
    text: refusedText(input.component, problem),
  });
}
//@ chunk-s61vbvea.js:635241-635359 placement
function sayOnce({ input: input, origin: origin }, r, s) {
  let { load: load, lead: lead } = chainTeller(input, origin);
  sayPlainCode({ key: [load, input.component, r].join(" "), lead: lead, text: s });
}
//@ chunk-s61vbvea.js:635359-635467 placement
var shownTextLine = (e, { written: written, drawn: drawn }) =>
  `ui.render (${e}): ${written} characters of text are drawn up to the first ${drawn}`;
//@ chunk-s61vbvea.js:635467-635693 placement
var tellOwnProps = (e) =>
  sayOnce(
    e,
    "own props",
    `ui.render (${e.input.component}): props.${e.names.join(", props.")} rewritten with more than ${SHOWN_TEXT_MAX} characters of keys and short strings, or nested past ${MAX_DEPTH} deep; the engine's own is drawn`,
  );
//@ chunk-s61vbvea.js:635693-635757 placement
var tellShownText = (e) => sayOnce(e, "text cut", shownTextLine(e.input.component, e.clipped));
//@ chunk-s61vbvea.js:635757-635769 placement
var NAME_CHARS = 256;
//@ chunk-s61vbvea.js:635769-636004 placement
function namesLength(e, n) {
  if (typeof e === "string") return e.length <= NAME_CHARS ? e.length : 0;
  let isArray = Array.isArray(e);
  if (!isArray && !isPlainDataObject(e)) return 0;
  return n > MAX_DEPTH
    ? 1 / 0
    : isArray
      ? Xv(e).reduce((h, y) => h + namesLength(y, n + 1), 0)
      : Object.entries(e).reduce((h, [y, S]) => h + y.length + namesLength(S, n + 1), 0);
}
//@ chunk-s61vbvea.js:636004-636313 placement
function cutValue(e, n) {
  if (typeof e === "string") return e.length <= NAME_CHARS ? e : n.shown(e, " ");
  if (Array.isArray(e)) {
    let y = Xv(e),
      mapped = y.map((R) => cutValue(R, n));
    return mapped.every((R, x) => R === y[x]) ? e : mapped;
  }
  if (!isPlainDataObject(e)) return e;
  let entries = Object.entries(e),
    mapped = entries.map(([y, S]) => [y, cutValue(S, n)]);
  return mapped.every(([, y], S) => y === entries[S]?.[1]) ? e : Object.fromEntries(mapped);
}
//@ chunk-s61vbvea.js:636313-636361 placement
var textLength = (e) => collectStrings(e).reduce((n, r) => n + r.length, 0);
//@ chunk-s61vbvea.js:636361-636783 placement
function withShownProps(e, n, r) {
  let props = n.props,
    h = textRoom(),
    flattened = Object.entries(e.props).flatMap(([R, x]) => {
      if (x === props[R] || textLength(x) <= textLength(props[R])) return [];
      let j = namesLength(x, 0) > SHOWN_TEXT_MAX,
        G = j ? props[R] : cutValue(x, h);
      return G === x ? [] : [{ key: R, drawn: G, isOwn: j }];
    }),
    mapped = flattened.filter((R) => R.isOwn).map((R) => R.key);
  if (h.isCut()) r.cut({ written: h.written(), drawn: SHOWN_TEXT_MAX });
  if (mapped.length > 0) r.own(mapped);
  return flattened.length === 0
    ? e
    : { ...e, props: { ...e.props, ...Object.fromEntries(flattened.map((R) => [R.key, R.drawn])) } };
}
//@ chunk-s61vbvea.js:636783-636807 placement
var linksByLedger = () => new WeakMap();
//@ chunk-s61vbvea.js:636807-636821 placement
var heldLinks = linksByLedger();
//@ chunk-s61vbvea.js:636821-636994 placement
function drawersOf(e, n) {
  let r = n && heldByTree.get(n),
    s = (r && heldLinks.get(r))?.flatMap((y) => (e.some((S) => S.name === y) ? [y] : y.split("+"))),
    filtered = e.filter((y) => s?.includes(y.name));
  return filtered.length === 0 ? e : filtered;
}
//@ chunk-s61vbvea.js:636994-637050 placement
var thrownKey = (e, n) => [n.load, e, "threw while drawn"].join(" ");
//@ chunk-s61vbvea.js:637050-637509 placement
function firstThrowReport(e, n, r) {
  let s = `reported ${r} ${thrownKey(e, n)}`;
  if (toldRefusals.has(s)) return null;
  toldRefusals.add(s);
  let h = IT(n.lead),
    y = h && classifyPluginOrigin(h),
    S = { ...y, component: fromEnum(e) },
    w = r === "Client";
  return (
    !w && NOTHING_LEFT[e] !== void 0
      ? logFeatureBad("plugin_function_hooks_draw", "threw_while_drawn", S)
      : logFeatureSad("plugin_function_hooks_draw", w ? "client_threw_while_drawn" : "threw_while_drawn", S),
    `ui.render (${e}): a plugin's ${r} threw while drawn (plugin ${y?.plugin_name_redacted ?? "unattributed"}, ${y?.provenance ?? "unattributed"})`
  );
}
//@ chunk-s61vbvea.js:637551-637731 placement
var standingLinks = (e) =>
  e
    .filter((n, r) => {
      let s = e[r + 1],
        h =
          s !== void 0 &&
          isDeepStrictEqual_4(n.received, s.received) &&
          isDeepStrictEqual_4(n.returned, s.returned);
      return n.plugin !== ENGINE && n.outcome !== "skipped" && !h;
    })
    .map((n) => n.plugin);
//@ chunk-s61vbvea.js:637731-637827 placement
var thrownText = (e, n) =>
  `ui.render (${e}) threw while drawn: ${n}; ` + (NOTHING_LEFT[e] ?? "the engine drew its own");
//@ chunk-s61vbvea.js:637827-637959 placement
function tellThrown({ component: component, teller: teller, error: error }) {
  let s = thrownKey(component, teller);
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: teller.lead,
    text: thrownText(component, logLine(String(errorMessage(error)))),
  });
}
//@ chunk-s61vbvea.js:637959-637988 placement
var thrownTeller = (e, n) => tellerOf(drawersOf(e, n));
//@ chunk-s61vbvea.js:637988-638191 placement
function unknownBorderNote(e) {
  return `Box borderStyle ${typeof e === "string" ? `"${shownKey(e)}" is not a border style` : `is ${valueKind(e)}, not a style name`} (the styles are ${[...BORDER_STYLES].join(", ")}); the Box is drawn with no border`;
}
//@ chunk-s61vbvea.js:638191-638337 placement
function tellUnknownBorder({ input: input, style: style, origin: origin }) {
  let s = plainKey(input, "borderStyle");
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, unknownBorderNote(style)),
  });
}
//@ chunk-s61vbvea.js:638337-639581 placement
async function dispatchRenderSite({ input: input, signal: signal, origin: origin }) {
  let s = createStepRecorder(),
    h = (re) => tellShownText({ input: input, clipped: re, origin: origin }),
    y = coreHandler(s, (re) =>
      withShownProps(re, input, {
        cut: h,
        own: (he) => tellOwnProps({ input: input, names: he, origin: origin }),
      }),
    ),
    S = jme() ? [] : [y],
    w = createDrawingScope(renderInstanceKey(input), input, () => renderPluginsForInstance(input)),
    R = Qu({ drawing: w }),
    x = [],
    P = await Ho.run(R, () =>
      reportChainFailure({
        e: input,
        handlers: [...hookMembersFor(RENDER_EVENT, origin, { e: input }), ...S],
        site: RENDER_SITE,
        signal: signal,
        ...(input.surface === "vscode" && { isUnfolded: !0 }),
        origin: hookOriginFromStack(origin),
        trace: (re) => {
          x = re;
        },
      }),
    ).finally(() => {
      ((w.isInFlight = !1), (R.isEnded = !0), (R.values = void 0));
    });
  if (input.requestId !== "" && !signal.aborted) recordStateReads(w);
  let G = wellFormed(P),
    L = input.component === ONE_ENGINE_NODE_COMPONENT,
    q = 0,
    Q = validateTree(G, input.component, {
      surface: input.surface,
      note: (re) => logForDebugging(`ui.render (${input.component}): ${logLine(re)}`),
      ...(L && {
        clientRows: (re) => {
          let clientRows = zte.clientRows(clientMountKey(input, re));
          return ((q += clientRows), clientRows);
        },
        measured: (re) => zte.recordOwn(input, re - q),
      }),
    });
  if ((countLeftEmpty(input, G), Q !== void 0))
    return (
      logForDebugging(
        `ui.render (${input.component}): the chain settled on a tree that does not validate (${logLine(Q)}); drawing the engine's own`,
        { level: "warn" },
      ),
      tellRefused({ input: input, problem: Q, origin: origin }),
      releaseAllPresses(G, input),
      countRefused(input.component, () => chainTeller(input, origin).lead),
      Lae
    );
  let Z = withKnownBorders(withUsableBoxKeys(G), (re) =>
      tellUnknownBorder({ input: input, style: re, origin: origin }),
    ),
    ee = withRemoteProps(Z, input.surface),
    ae = withPlainLinks(ee, input.surface, (re) =>
      tellPlainLink({ input: input, drawnPlain: re, origin: origin }),
    ),
    se = withPlainCode(withShownText(ae, h), (re) =>
      tellPlainCode({ input: input, drawnPlain: re, origin: origin }),
    );
  return (releaseDroppedPresses(G, se, input), heldByTree.set(se, s), heldLinks.set(s, standingLinks(x)), se);
}
//@ chunk-s61vbvea.js:639581-639701 placement
function memoizedStableKey() {
  let weakMap = new WeakMap();
  return (n) => {
    let r = weakMap.get(n);
    if (r !== void 0) return r;
    let s = computeContentHash(Rs(n));
    return (weakMap.set(n, s), s);
  };
}
//@ chunk-s61vbvea.js:639701-639715 placement
var propsKey = memoizedStableKey();
//@ chunk-s61vbvea.js:639715-639809 placement
var valueKeyOf = (e) =>
  [e.viewport?.columns ?? "", e.viewport?.isFullscreen ?? "", propsKey(e.props)].join("\x00");
//@ chunk-s61vbvea.js:639809-639895 placement
var answers = (e, n, r) => e.settled !== void 0 && e.propsKey === n && e.versions === JB() && e.version === r;
//@ chunk-s61vbvea.js:639895-639941 placement
var siteVersionOf = (e, n) =>
  rD(renderVersionKey(e, renderPluginsForInstance(n), renderPaceOf(n)), e, renderInstanceKey(n));
//@ chunk-s61vbvea.js:639941-639977 placement
var currentVersion = (e) => siteVersionOf(JB().getState(), e);
//@ chunk-s61vbvea.js:639977-640133 placement
var heldFor = (e, n) =>
  n.then((r) => {
    let s = hostDrawnPresses(r, { component: e.component, requestId: e.requestId, surface: e.surface }),
      h = heldByTree.get(r);
    if (h !== void 0) heldByTree.set(s, h);
    return s;
  });
//@ chunk-s61vbvea.js:640133-640145 placement
var MAX_SHARED_DRAWS = 500;
//@ chunk-s61vbvea.js:640145-640450 placement
function onScreenOf(e) {
  let n = Object.hasOwn(e.props, "onScreen") ? e.props.onScreen : void 0,
    r = typeof n === "object" ? n : void 0,
    s = r && "first" in r ? r.first : null,
    h = r && "last" in r ? r.last : null,
    y = r && "of" in r ? r.of : null;
  return typeof s === "number" && typeof h === "number" && typeof y === "number"
    ? { first: s, last: h, of: y }
    : n === null
      ? null
      : void 0;
}
//@ chunk-s61vbvea.js:640450-640580 placement
function sharedDrawOf(e, n) {
  let r = JB();
  return {
    ...e,
    versions: r,
    engineVersion: r.getState().get(RENDER_EVENT) ?? 0,
    heldRows: void 0,
    drawn: n,
    settled: void 0,
  };
}
//@ chunk-s61vbvea.js:640580-640911 placement
function sharedDrawStore() {
  let e = new Map(),
    n,
    r = 0,
    s = 0;
  return {
    get: (h) => e.get(h),
    set: (h, y) => {
      if (y.versions !== n || y.engineVersion !== r) (e.clear(), (n = y.versions), (r = y.engineVersion));
      (e.delete(h), e.set(h, y));
      for (let w of e.keys()) {
        if (e.size <= MAX_SHARED_DRAWS) break;
        e.delete(w);
      }
    },
    drop: (h, y) => {
      if (e.get(h) === y) e.delete(h);
    },
    size: () => e.size,
    reused: () => s,
    countReuse: () => {
      s += 1;
    },
  };
}
//@ chunk-s61vbvea.js:640911-640951 placement
var sharedPropsKey = (e, n) => `${MFi(n)}\x00${valueKeyOf(e)}`;
//@ chunk-s61vbvea.js:640951-642484 placement
function createRenderDraws() {
  let e = sharedDrawStore();
  async function n(h, { signal: signal, origin: origin }) {
    if (jme()) return heldFor(h, dispatchRenderSite({ input: h, signal: signal, origin: origin }));
    let w = renderInstanceKey(h),
      R = sharedPropsKey(h, origin),
      x = currentVersion(h),
      P = h.requestId === "" ? void 0 : e.get(w);
    if (P && answers(P, R, x))
      return (
        e.countReuse(),
        logForDebugging(
          `ui.render (${h.component} ${h.requestId}): ${h.surface} reuses its settled evaluation (one dispatch per draw)`,
        ),
        heldFor(h, P.drawn)
      );
    let now = Date.now(),
      L = renderPaceOf(h) === "live" ? renderPluginsForInstance(h) : [],
      q = P === void 0,
      Q = dispatchRenderSite({ input: h, signal: signal, origin: origin });
    if (h.requestId !== "") {
      let Z = sharedDrawOf({ propsKey: R, version: x, onScreen: onScreenOf(h) }, Q);
      (e.set(w, Z),
        Q.then(
          (ee) => {
            if (((Z.settled = ee), !q)) NM(L, Date.now() - now);
          },
          (ee) =>
            logForDebugging(
              `ui.render (${h.component} ${h.requestId}): evaluation failed: ${errorMessage(ee)}`,
              { level: "error" },
            ),
        ),
        signal.addEventListener(
          "abort",
          () => {
            if (!Z.settled) (e.drop(w, Z), FM(L, Date.now() - now));
          },
          { once: !0 },
        ));
    }
    return heldFor(h, Q);
  }
  function r(h, y) {
    let S = e.get(renderInstanceKey(h));
    return h.requestId !== "" &&
      S !== void 0 &&
      answers(S, S.propsKey, currentVersion(h)) &&
      S.propsKey === sharedPropsKey({ viewport: h.viewport, props: { ...h.props, onScreen: S.onScreen } }, y)
      ? S
      : void 0;
  }
  function s(h, y) {
    if (h.requestId === "") return;
    let S = e.get(renderInstanceKey(h));
    return S !== void 0 && answers(S, sharedPropsKey(h, y), currentVersion(h)) ? S.settled : void 0;
  }
  return {
    uiRender: n,
    settled: s,
    held: (h) => e.get(renderInstanceKey(h))?.settled,
    askedOnScreen: (h, y) => r(h, y)?.onScreen,
    heldRowsOf: (h, y) => r(h, y)?.heldRows,
    noteHeldRows: (h, y) => {
      let S = e.get(renderInstanceKey(h));
      if (S?.onScreen === null) S.heldRows = y;
    },
    noteThrown: (h, y) => {
      let S = e.get(renderInstanceKey(h));
      if (S !== void 0 && (S.settled === void 0 || heldByTree.get(S.settled) !== heldByTree.get(y))) return;
      if (S !== void 0) ((S.settled = Lae), (S.drawn = Promise.resolve(Lae)));
      hostDrawnPresses(Lae, h);
    },
    reuseCount: e.reused,
    sharedCount: e.size,
  };
}
//@ chunk-s61vbvea.js:663451-663537 placement
function desktopTicketOf(e) {
  return e.surface === "desktop" ? _r.begin(e.component, e.requestId) : void 0;
}
//@ chunk-s61vbvea.js:663537-663589 placement
var hasRenderHooks = (e) => hasModuleHookingSite(RENDER_EVENT, e === void 0 ? void 0 : { component: e });
//@ chunk-s61vbvea.js:663589-663711 placement
var hasRenderHooksFor = (e) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      hxt(loadedModule.matcherFor(RENDER_EVENT), "component", e.component) &&
      matcherAdmits(loadedModule, RENDER_EVENT, e),
  );
//@ chunk-s61vbvea.js:663711-663725 placement
var renderDraws = createRenderDraws();
//@ chunk-s61vbvea.js:663725-663797 placement
setRenderSites(
  Object.keys(RENDER_SITES).map((e) => ({ event: RENDER_EVENT, component: e, drawnBy: RENDER_SITES[e] })),
);
//@ chunk-s61vbvea.js:663797-664592 placement
dx({
  async run(e) {
    let props = e.props,
      r = desktopTicketOf(e);
    if (!hasRenderHooksFor(e)) {
      if (r !== void 0) _r.record(r, []);
      return Uc(props);
    }
    let uiRender = await renderDraws.uiRender(e, { signal: new AbortController().signal }),
      h = findEngineRef(uiRender),
      y = h === void 0 ? void 0 : heldRenderInput(uiRender, h),
      w = y !== void 0 && y.component === e.component ? y.props : props,
      R = collectClientElements(uiRender);
    if (r !== void 0) _r.record(r, R);
    return {
      props: w,
      rewritten: w !== props,
      tree: uiRender,
      clientModules: surfaceBundleHashes(R),
      drawnBy: getActiveModNames(drawersOf(chainModules(e), uiRender)),
    };
  },
  hooked: hasRenderHooks,
  onInvalidate: (e) => {
    let n = subscribeRenderVersions(() => e()),
      r = US((s) => {
        let filtered = s.filter((y) => y.surface !== "terminal");
        if (filtered.length > 0) e(filtered);
      });
    return () => {
      (n(), r());
    };
  },
  press: ({ surface: surface = "desktop", ...n }) => handleUiPress({ ...n, surface: surface }),
  input: ({ surface: surface = "desktop", ...n }) => Cer({ ...n, surface: surface }),
  select: ({ surface: surface = "desktop", ...n }) => xer({ ...n, surface: surface }),
  clientModule: (e) => Fp.moduleFor(e),
  clientPress: (e) => dispatchDesktopClient(e),
  clientMessage: (e) => postDesktopClientMessage(e),
  clientFault: createDesktopFaultHandler(),
});

export {
  thrownTeller,
  renderDraws,
  firstThrowReport,
  tellThrown,
  heldRenderInput,
  hasRenderHooks,
  sayPlainCode,
  logLine,
  loadOf,
  leadOf,
  siteVersionOf,
  tellerOf,
  chainModules,
  valueKeyOf,
  hasRenderHooksFor,
  onScreenOf,
  currentVersion,
  unknownBorderNote,
  MAX_SHARED_DRAWS,
  NAME_CHARS,
  NOTHING_LEFT,
  RENDER_SITE,
  UNATTRIBUTED_LEAD,
  answers,
  chainTeller,
  coreHandler,
  countLeftEmpty,
  countRefused,
  createRenderDraws,
  cutValue,
  desktopTicketOf,
  dispatchRenderSite,
  drawersOf,
  heldByTree,
  heldFor,
  heldLinks,
  isPlainCodeSaid,
  ledgersByTree,
  linksByLedger,
  memoizedStableKey,
  namesLength,
  plainCodeText,
  plainKey,
  propsKey,
  refusedText,
  sayOnce,
  sharedDrawOf,
  sharedDrawStore,
  sharedPropsKey,
  shownTextLine,
  standingLinks,
  tellOwnProps,
  tellPlainCode,
  tellPlainLink,
  tellRefused,
  tellShownText,
  tellUnknownBorder,
  textLength,
  thrownKey,
  thrownText,
  withShownProps,
};
