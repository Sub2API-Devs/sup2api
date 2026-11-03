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
import { isDeepStrictEqual } from "util";
import { modulesHookingEvent, hookMembersFor, hookOriginFromStack, matcherAdmits } from "../hookDispatch.js";
import { RENDER_EVENT, RENDER_SITES } from "./renderSites.js";
import { matchesField, isPlainDataObject } from "../../../utils/hooks/functionHookMatchers.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import { LINE_SCRUB, collectStrings } from "./textScrub.js";
import { toldRefusals, tellOnce } from "./renderNotices.js";
import { hasUiLogSink, originChainText } from "../hooksWorkerClient.js";
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
import { throttledRunTelemetry, engineCreateErrors } from "../telemetry/runTelemetry.js";
import { logFeatureBad, logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { MAX_DEPTH, valueKind } from "../sites/plainData.js";
import { denseListCopy, ENGINE_ELEMENT } from "../sites/promptContextSites.js";
import { loadedModuleArgs, hasModuleHookingSite } from "../../hooksModules/loadedModuleFilters.js";
import { classifyPluginOrigin } from "../panes.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { ENGINE, createStepRecorder, hasCurrentDispatch, reportChainFailure } from "../dispatch/chain.js";
import { errorMessage } from "../../../utils/errors.js";
import { BORDER_STYLES } from "./styleProps.js";
import { createDrawingScope, newScope, dispatchScopeStorage } from "../dispatch/dispatchScope.js";
import { renderInstanceKey, recordStateReads, subscribeStale } from "../api/state.js";
import {
  renderPluginsForInstance,
  renderVersions,
  withPluginVersions,
  renderVersionKey,
  renderPaceOf,
  throttleLive,
  throttleSteady,
  subscribeRenderVersions,
} from "./renderInstances.js";
import { ONE_ENGINE_NODE_COMPONENT, surfaceRowLedger, clientMountKey } from "./treeConstants.js";
import {
  releaseAllPresses,
  releaseDroppedPresses,
  hostDrawnPresses,
  handleUiPress,
  dispatchInputQueued,
  dispatchSelectQueued,
} from "./interactions.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import {
  drawnClientLedger,
  surfaceBundleHashes,
  surfaceBundleCache,
  dispatchDesktopClient,
  postDesktopClientMessage,
  createDesktopFaultHandler,
} from "./desktopSurface.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import {
  setRenderSites,
  getActiveModNames,
} from "../../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { installRenderBridge, engineElement } from "./renderBridge.js";
import { findEngineRef } from "./index.js";
import { collectClientElements } from "./elements.js";

//@ chunk-s61vbvea.js:633150-633238 placement
var chainModules = (e, n) =>
  modulesHookingEvent(RENDER_EVENT, n, {
    e,
  }).filter((r) => matchesField(r.matcherFor(RENDER_EVENT), "component", e.component));
//@ chunk-s61vbvea.js:633238-633254 placement
var UNATTRIBUTED_LEAD = "hooks";
//@ chunk-s61vbvea.js:633254-633322 placement
function leadOf(e) {
  let [n, ...r] = e;
  return n !== undefined && r.length === 0 ? n : UNATTRIBUTED_LEAD;
}
//@ chunk-s61vbvea.js:633322-633385 placement
var loadOf = (e) => e.map((n) => `${n.name}#${n.environmentId}`).join();
//@ chunk-s61vbvea.js:633385-633443 placement
var tellerOf = (e) => ({
  load: loadOf(e),
  lead: leadOf(e.map((n) => n.name)),
});
//@ chunk-s61vbvea.js:633443-633472 placement
var chainTeller = (e, origin) => tellerOf(chainModules(e, origin));
//@ chunk-s61vbvea.js:633472-633590 placement
var coreHandler = (stepRecorder, n) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: (r) =>
    Promise.resolve({
      type: "engine",
      ref: stepRecorder.keep(n(r), undefined),
    }),
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
var heldRenderInput = (e, engineRef) => heldByTree.get(e)?.of(engineRef)?.input;
//@ chunk-s61vbvea.js:633751-633782 placement
var logLine = (e) => e.replace(LINE_SCRUB, "?");
//@ chunk-s61vbvea.js:633782-633837 placement
var isPlainCodeSaid = (e) => toldRefusals.has(`noted ${e}`) && (toldRefusals.has(e) || !hasUiLogSink());
//@ chunk-s61vbvea.js:633837-633877 placement
var plainCodeText = (component, n) => `ui.render (${component}): ${n}`;
//@ chunk-s61vbvea.js:633877-634013 placement
function sayPlainCode({ key, lead, text }) {
  let s = `noted ${key}`;
  if (!toldRefusals.has(s)) {
    toldRefusals.add(s);
    logForDebugging(`${lead}: ${text}`, {
      level: "warn",
    });
  }
  tellOnce({
    key,
    lead,
    text,
  });
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
function tellPlainCode({ input, drawnPlain, origin }) {
  let s = plainKey(input, plainCodeFinding(drawnPlain));
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainCodeNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634335-634497 placement
function tellPlainLink({ input, drawnPlain, origin }) {
  let s = plainKey(input, `${input.surface} ${plainLinkFinding(drawnPlain)}`);
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainLinkNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634497-634581 placement
var NOTHING_LEFT = Object.freeze({
  AbovePrompt: "nothing was drawn",
  Pane: "the pane was closed",
});
//@ chunk-s61vbvea.js:634581-634799 placement
function countRefused(component, n) {
  let r = NOTHING_LEFT[component] !== undefined;
  let s = r ? "tree_refused_left_empty" : "tree_refused";
  let h = throttledRunTelemetry(
    {
      subject: component,
      event: RENDER_EVENT,
      reason: s,
    },
    n,
  );
  if (h === undefined) return;
  if (r) logFeatureBad("plugin_function_hooks_draw", s, h);
  else logFeatureSad("plugin_function_hooks_draw", s, h);
}
//@ chunk-s61vbvea.js:634799-634953 placement
function countLeftEmpty(e, n) {
  let { component } = e;
  let s = RENDER_SITE.refusedSubject?.(e) ?? component;
  let h = engineCreateErrors.get(s);
  engineCreateErrors.delete(s);
  if (h !== undefined && NOTHING_LEFT[component] !== undefined && n.type === "engine")
    countRefused(component, () => h);
}
//@ chunk-s61vbvea.js:634953-635084 placement
function refusedText(component, problem) {
  let s = NOTHING_LEFT[component] !== undefined ? "nothing was drawn" : "the engine drew its own";
  return `ui.render (${component}) refused: ${problem}; ${s}`;
}
//@ chunk-s61vbvea.js:635084-635241 placement
function tellRefused({ input, problem, origin }) {
  if (!hasUiLogSink()) return;
  let { load, lead } = chainTeller(input, origin);
  tellOnce({
    key: [load, input.component, problem].join(" "),
    lead,
    text: refusedText(input.component, problem),
  });
}
//@ chunk-s61vbvea.js:635241-635359 placement
function sayOnce({ input, origin }, r, text) {
  let { load, lead } = chainTeller(input, origin);
  sayPlainCode({
    key: [load, input.component, r].join(" "),
    lead,
    text,
  });
}
//@ chunk-s61vbvea.js:635359-635467 placement
var shownTextLine = (component, { written, drawn }) =>
  `ui.render (${component}): ${written} characters of text are drawn up to the first ${drawn}`;
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
  let r = Array.isArray(e);
  if (!r && !isPlainDataObject(e)) return 0;
  return n > MAX_DEPTH
    ? 1 / 0
    : r
      ? denseListCopy(e).reduce((acc, y) => acc + namesLength(y, n + 1), 0)
      : Object.entries(e).reduce((acc, [y, S]) => acc + y.length + namesLength(S, n + 1), 0);
}
//@ chunk-s61vbvea.js:636004-636313 placement
function cutValue(e, n) {
  if (typeof e === "string") return e.length <= NAME_CHARS ? e : n.shown(e, " ");
  if (Array.isArray(e)) {
    let y = denseListCopy(e);
    let mapped = y.map((R) => cutValue(R, n));
    return mapped.every((R, x) => R === y[x]) ? e : mapped;
  }
  if (!isPlainDataObject(e)) return e;
  let entries = Object.entries(e);
  let mapped = entries.map(([y, S]) => [y, cutValue(S, n)]);
  return mapped.every(([, y], S) => y === entries[S]?.[1]) ? e : Object.fromEntries(mapped);
}
//@ chunk-s61vbvea.js:636313-636361 placement
var textLength = (e) => collectStrings(e).reduce((acc, r) => acc + r.length, 0);
//@ chunk-s61vbvea.js:636361-636783 placement
function withShownProps(e, n, r) {
  let props = n.props;
  let h = textRoom();
  let flattened = Object.entries(e.props).flatMap(([key, value]) => {
    if (value === props[key] || textLength(value) <= textLength(props[key])) return [];
    let j = namesLength(value, 0) > SHOWN_TEXT_MAX;
    let G = j ? props[key] : cutValue(value, h);
    return G === value
      ? []
      : [
          {
            key,
            drawn: G,
            isOwn: j,
          },
        ];
  });
  let mapped = flattened.filter((R) => R.isOwn).map((R) => R.key);
  if (h.isCut())
    r.cut({
      written: h.written(),
      drawn: SHOWN_TEXT_MAX,
    });
  if (mapped.length > 0) r.own(mapped);
  return flattened.length === 0
    ? e
    : {
        ...e,
        props: {
          ...e.props,
          ...Object.fromEntries(flattened.map((R) => [R.key, R.drawn])),
        },
      };
}
//@ chunk-s61vbvea.js:636783-636807 placement
var linksByLedger = () => new WeakMap();
//@ chunk-s61vbvea.js:636807-636821 placement
var heldLinks = linksByLedger();
//@ chunk-s61vbvea.js:636821-636994 placement
function drawersOf(e, n) {
  let r = n && heldByTree.get(n);
  let flattened = (r && heldLinks.get(r))?.flatMap((y) => (e.some((S) => S.name === y) ? [y] : y.split("+")));
  let filtered = e.filter((y) => flattened?.includes(y.name));
  return filtered.length === 0 ? e : filtered;
}
//@ chunk-s61vbvea.js:636994-637050 placement
var thrownKey = (e, n) => [n.load, e, "threw while drawn"].join(" ");
//@ chunk-s61vbvea.js:637050-637509 placement
function firstThrowReport(component, n, r) {
  let s = `reported ${r} ${thrownKey(component, n)}`;
  if (toldRefusals.has(s)) return null;
  toldRefusals.add(s);
  let h = loadedModuleArgs(n.lead);
  let y = h && classifyPluginOrigin(h);
  let S = {
    ...y,
    component: fromEnum(component),
  };
  let w = r === "Client";
  if (!w && NOTHING_LEFT[component] !== undefined)
    logFeatureBad("plugin_function_hooks_draw", "threw_while_drawn", S);
  else logFeatureSad("plugin_function_hooks_draw", w ? "client_threw_while_drawn" : "threw_while_drawn", S);
  return `ui.render (${component}): a plugin's ${r} threw while drawn (plugin ${y?.plugin_name_redacted ?? "unattributed"}, ${y?.provenance ?? "unattributed"})`;
}
//@ chunk-s61vbvea.js:637551-637731 placement
var standingLinks = (e) =>
  e
    .filter((n, r) => {
      let s = e[r + 1];
      let h =
        s !== undefined &&
        isDeepStrictEqual(n.received, s.received) &&
        isDeepStrictEqual(n.returned, s.returned);
      return n.plugin !== ENGINE && n.outcome !== "skipped" && !h;
    })
    .map((n) => n.plugin);
//@ chunk-s61vbvea.js:637731-637827 placement
var thrownText = (component, n) =>
  `ui.render (${component}) threw while drawn: ${n}; ` +
  (NOTHING_LEFT[component] ?? "the engine drew its own");
//@ chunk-s61vbvea.js:637827-637959 placement
function tellThrown({ component, teller, error }) {
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
function tellUnknownBorder({ input, style, origin }) {
  let s = plainKey(input, "borderStyle");
  if (isPlainCodeSaid(s)) return;
  sayPlainCode({
    key: s,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, unknownBorderNote(style)),
  });
}
//@ chunk-s61vbvea.js:638337-639581 placement
async function dispatchRenderSite({ input, signal, origin }) {
  let stepRecorder = createStepRecorder();
  let h = (clipped) =>
    tellShownText({
      input,
      clipped,
      origin,
    });
  let y = coreHandler(stepRecorder, (re) =>
    withShownProps(re, input, {
      cut: h,
      own: (names) =>
        tellOwnProps({
          input,
          names,
          origin,
        }),
    }),
  );
  let S = hasCurrentDispatch() ? [] : [y];
  let drawingScope = createDrawingScope(renderInstanceKey(input), input, () =>
    renderPluginsForInstance(input),
  );
  let scope = newScope({
    drawing: drawingScope,
  });
  let x = [];
  let P = await dispatchScopeStorage
    .run(scope, () =>
      reportChainFailure({
        e: input,
        handlers: [
          ...hookMembersFor(RENDER_EVENT, origin, {
            e: input,
          }),
          ...S,
        ],
        site: RENDER_SITE,
        signal,
        ...(input.surface === "vscode" && {
          isUnfolded: true,
        }),
        origin: hookOriginFromStack(origin),
        trace: (re) => {
          x = re;
        },
      }),
    )
    .finally(() => {
      drawingScope.isInFlight = false;
      scope.isEnded = true;
      scope.values = undefined;
    });
  if (input.requestId !== "" && !signal.aborted) recordStateReads(drawingScope);
  let G = wellFormed(P);
  let L = input.component === ONE_ENGINE_NODE_COMPONENT;
  let q = 0;
  let Q = validateTree(G, input.component, {
    surface: input.surface,
    note: (re) => logForDebugging(`ui.render (${input.component}): ${logLine(re)}`),
    ...(L && {
      clientRows: (re) => {
        let he = surfaceRowLedger.clientRows(clientMountKey(input, re));
        q += he;
        return he;
      },
      measured: (re) => surfaceRowLedger.recordOwn(input, re - q),
    }),
  });
  countLeftEmpty(input, G);
  if (Q !== undefined) {
    logForDebugging(
      `ui.render (${input.component}): the chain settled on a tree that does not validate (${logLine(Q)}); drawing the engine's own`,
      {
        level: "warn",
      },
    );
    tellRefused({
      input,
      problem: Q,
      origin,
    });
    releaseAllPresses(G, input);
    countRefused(input.component, () => chainTeller(input, origin).lead);
    return ENGINE_ELEMENT;
  }
  let Z = withKnownBorders(withUsableBoxKeys(G), (style) =>
    tellUnknownBorder({
      input,
      style,
      origin,
    }),
  );
  let ee = withRemoteProps(Z, input.surface);
  let ae = withPlainLinks(ee, input.surface, (drawnPlain) =>
    tellPlainLink({
      input,
      drawnPlain,
      origin,
    }),
  );
  let se = withPlainCode(withShownText(ae, h), (drawnPlain) =>
    tellPlainCode({
      input,
      drawnPlain,
      origin,
    }),
  );
  releaseDroppedPresses(G, se, input);
  heldByTree.set(se, stepRecorder);
  heldLinks.set(stepRecorder, standingLinks(x));
  return se;
}
//@ chunk-s61vbvea.js:639581-639701 placement
function memoizedStableKey() {
  let weakMap = new WeakMap();
  return (n) => {
    let r = weakMap.get(n);
    if (r !== undefined) return r;
    let contentHash = computeContentHash(stableStringifySafe(n));
    weakMap.set(n, contentHash);
    return contentHash;
  };
}
//@ chunk-s61vbvea.js:639701-639715 placement
var propsKey = memoizedStableKey();
//@ chunk-s61vbvea.js:639715-639809 placement
var valueKeyOf = (e) =>
  [e.viewport?.columns ?? "", e.viewport?.isFullscreen ?? "", propsKey(e.props)].join("\x00");
//@ chunk-s61vbvea.js:639809-639895 placement
var answers = (e, n, r) =>
  e.settled !== undefined && e.propsKey === n && e.versions === renderVersions() && e.version === r;
//@ chunk-s61vbvea.js:639895-639941 placement
var siteVersionOf = (state, n) =>
  withPluginVersions(
    renderVersionKey(state, renderPluginsForInstance(n), renderPaceOf(n)),
    state,
    renderInstanceKey(n),
  );
//@ chunk-s61vbvea.js:639941-639977 placement
var currentVersion = (e) => siteVersionOf(renderVersions().getState(), e);
//@ chunk-s61vbvea.js:639977-640133 placement
var heldFor = (e, n) =>
  n.then((r) => {
    let s = hostDrawnPresses(r, {
      component: e.component,
      requestId: e.requestId,
      surface: e.surface,
    });
    let h = heldByTree.get(r);
    if (h !== undefined) heldByTree.set(s, h);
    return s;
  });
//@ chunk-s61vbvea.js:640133-640145 placement
var MAX_SHARED_DRAWS = 500;
//@ chunk-s61vbvea.js:640145-640450 placement
function onScreenOf(e) {
  let onScreen = Object.hasOwn(e.props, "onScreen") ? e.props.onScreen : undefined;
  let r = typeof onScreen === "object" ? onScreen : undefined;
  let first = r && "first" in r ? r.first : null;
  let last = r && "last" in r ? r.last : null;
  let of = r && "of" in r ? r.of : null;
  return typeof first === "number" && typeof last === "number" && typeof of === "number"
    ? {
        first,
        last,
        of,
      }
    : onScreen === null
      ? null
      : undefined;
}
//@ chunk-s61vbvea.js:640450-640580 placement
function sharedDrawOf(e, drawn) {
  let r = renderVersions();
  return {
    ...e,
    versions: r,
    engineVersion: r.getState().get(RENDER_EVENT) ?? 0,
    heldRows: undefined,
    drawn,
    settled: undefined,
  };
}
//@ chunk-s61vbvea.js:640580-640911 placement
function sharedDrawStore() {
  let e = new Map();
  let n;
  let r = 0;
  let s = 0;
  return {
    get: (h) => e.get(h),
    set: (h, y) => {
      if (y.versions !== n || y.engineVersion !== r) {
        e.clear();
        n = y.versions;
        r = y.engineVersion;
      }
      e.delete(h);
      e.set(h, y);
      for (let key of e.keys()) {
        if (e.size <= MAX_SHARED_DRAWS) break;
        e.delete(key);
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
var sharedPropsKey = (e, n) => `${originChainText(n)}\x00${valueKeyOf(e)}`;
//@ chunk-s61vbvea.js:640951-642484 placement
function createRenderDraws() {
  let e = sharedDrawStore();
  async function n(h, { signal, origin }) {
    if (hasCurrentDispatch())
      return heldFor(
        h,
        dispatchRenderSite({
          input: h,
          signal,
          origin,
        }),
      );
    let w = renderInstanceKey(h);
    let R = sharedPropsKey(h, origin);
    let x = currentVersion(h);
    let P = h.requestId === "" ? undefined : e.get(w);
    if (P && answers(P, R, x)) {
      e.countReuse();
      logForDebugging(
        `ui.render (${h.component} ${h.requestId}): ${h.surface} reuses its settled evaluation (one dispatch per draw)`,
      );
      return heldFor(h, P.drawn);
    }
    let now = Date.now();
    let L = renderPaceOf(h) === "live" ? renderPluginsForInstance(h) : [];
    let q = P === undefined;
    let drawn = dispatchRenderSite({
      input: h,
      signal,
      origin,
    });
    if (h.requestId !== "") {
      let Z = sharedDrawOf(
        {
          propsKey: R,
          version: x,
          onScreen: onScreenOf(h),
        },
        drawn,
      );
      e.set(w, Z);
      drawn.then(
        (settled) => {
          Z.settled = settled;
          if (!q) throttleLive(L, Date.now() - now);
        },
        (error) =>
          logForDebugging(
            `ui.render (${h.component} ${h.requestId}): evaluation failed: ${errorMessage(error)}`,
            {
              level: "error",
            },
          ),
      );
      signal.addEventListener(
        "abort",
        () => {
          if (!Z.settled) {
            e.drop(w, Z);
            throttleSteady(L, Date.now() - now);
          }
        },
        {
          once: true,
        },
      );
    }
    return heldFor(h, drawn);
  }
  function r(h, y) {
    let S = e.get(renderInstanceKey(h));
    return h.requestId !== "" &&
      S !== undefined &&
      answers(S, S.propsKey, currentVersion(h)) &&
      S.propsKey ===
        sharedPropsKey(
          {
            viewport: h.viewport,
            props: {
              ...h.props,
              onScreen: S.onScreen,
            },
          },
          y,
        )
      ? S
      : undefined;
  }
  function s(h, y) {
    if (h.requestId === "") return;
    let S = e.get(renderInstanceKey(h));
    return S !== undefined && answers(S, sharedPropsKey(h, y), currentVersion(h)) ? S.settled : undefined;
  }
  return {
    uiRender: n,
    settled: s,
    held: (h) => e.get(renderInstanceKey(h))?.settled,
    askedOnScreen: (h, y) => r(h, y)?.onScreen,
    heldRowsOf: (h, y) => r(h, y)?.heldRows,
    noteHeldRows: (h, heldRows) => {
      let S = e.get(renderInstanceKey(h));
      if (S?.onScreen === null) S.heldRows = heldRows;
    },
    noteThrown: (h, y) => {
      let S = e.get(renderInstanceKey(h));
      if (S !== undefined && (S.settled === undefined || heldByTree.get(S.settled) !== heldByTree.get(y)))
        return;
      if (S !== undefined) {
        S.settled = ENGINE_ELEMENT;
        S.drawn = Promise.resolve(ENGINE_ELEMENT);
      }
      hostDrawnPresses(ENGINE_ELEMENT, h);
    },
    reuseCount: e.reused,
    sharedCount: e.size,
  };
}
//@ chunk-s61vbvea.js:663451-663537 placement
function desktopTicketOf(e) {
  return e.surface === "desktop" ? drawnClientLedger.begin(e.component, e.requestId) : undefined;
}
//@ chunk-s61vbvea.js:663537-663589 placement
var hasRenderHooks = (e) =>
  hasModuleHookingSite(
    RENDER_EVENT,
    e === undefined
      ? undefined
      : {
          component: e,
        },
  );
//@ chunk-s61vbvea.js:663589-663711 placement
var hasRenderHooksFor = (e) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      matchesField(loadedModule.matcherFor(RENDER_EVENT), "component", e.component) &&
      matcherAdmits(loadedModule, RENDER_EVENT, e),
  );
//@ chunk-s61vbvea.js:663711-663725 placement
var renderDraws = createRenderDraws();
//@ chunk-s61vbvea.js:663725-663797 placement
setRenderSites(
  Object.keys(RENDER_SITES).map((key) => ({
    event: RENDER_EVENT,
    component: key,
    drawnBy: RENDER_SITES[key],
  })),
);
//@ chunk-s61vbvea.js:663797-664592 placement
installRenderBridge({
  async run(e) {
    let props = e.props;
    let r = desktopTicketOf(e);
    if (!hasRenderHooksFor(e)) {
      if (r !== undefined) drawnClientLedger.record(r, []);
      return engineElement(props);
    }
    let s = await renderDraws.uiRender(e, {
      signal: new AbortController().signal,
    });
    let engineRef = findEngineRef(s);
    let y = engineRef === undefined ? undefined : heldRenderInput(s, engineRef);
    let w = y !== undefined && y.component === e.component ? y.props : props;
    let clientElements = collectClientElements(s);
    if (r !== undefined) drawnClientLedger.record(r, clientElements);
    return {
      props: w,
      rewritten: w !== props,
      tree: s,
      clientModules: surfaceBundleHashes(clientElements),
      drawnBy: getActiveModNames(drawersOf(chainModules(e), s)),
    };
  },
  hooked: hasRenderHooks,
  onInvalidate: (e) => {
    let n = subscribeRenderVersions(() => e());
    let r = subscribeStale((s) => {
      let filtered = s.filter((y) => y.surface !== "terminal");
      if (filtered.length > 0) e(filtered);
    });
    return () => {
      n();
      r();
    };
  },
  press: ({ surface = "desktop", ...n }) =>
    handleUiPress({
      ...n,
      surface,
    }),
  input: ({ surface = "desktop", ...n }) =>
    dispatchInputQueued({
      ...n,
      surface,
    }),
  select: ({ surface = "desktop", ...n }) =>
    dispatchSelectQueued({
      ...n,
      surface,
    }),
  clientModule: (e) => surfaceBundleCache.moduleFor(e),
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
