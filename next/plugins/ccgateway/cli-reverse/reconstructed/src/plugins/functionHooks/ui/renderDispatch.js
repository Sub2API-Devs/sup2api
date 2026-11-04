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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:633150-633238 placement
var chainModules = (input, origin) =>
  modulesHookingEvent(RENDER_EVENT, origin, {
    e: input,
  }).filter((mod) => matchesField(mod.matcherFor(RENDER_EVENT), "component", input.component));
//@ chunk-s61vbvea.js:633238-633254 placement
var UNATTRIBUTED_LEAD = "hooks";
//@ chunk-s61vbvea.js:633254-633322 placement
function leadOf(names) {
  let [first, ...rest] = names;
  return first !== undefined && rest.length === 0 ? first : UNATTRIBUTED_LEAD;
}
//@ chunk-s61vbvea.js:633322-633385 placement
var loadOf = (modules) => modules.map((mod) => `${mod.name}#${mod.environmentId}`).join();
//@ chunk-s61vbvea.js:633385-633443 placement
var tellerOf = (modules) => ({
  load: loadOf(modules),
  lead: leadOf(modules.map((mod) => mod.name)),
});
//@ chunk-s61vbvea.js:633443-633472 placement
var chainTeller = (input, origin) => tellerOf(chainModules(input, origin));
//@ chunk-s61vbvea.js:633472-633590 placement
var coreHandler = (stepRecorder, draw) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: (request) =>
    Promise.resolve({
      type: "engine",
      ref: stepRecorder.keep(draw(request), undefined),
    }),
});
//@ chunk-s61vbvea.js:633590-633614 placement
var RENDER_SITE; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:633590", () => {
  RENDER_SITE = UI_ENV_SITE_RULES["ui.render"];
});
//@ chunk-s61vbvea.js:633614-633697 placement
function ledgersByTree() {
  let weakMap = new WeakMap();
  return {
    get: (tree) => weakMap.get(tree),
    set: (tree, ledger) => {
      weakMap.set(tree, ledger);
    },
  };
}
//@ chunk-s61vbvea.js:633697-633711 placement
var heldByTree; // deferred: uses ledgersByTree of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:633697", () => {
  heldByTree = ledgersByTree();
});
//@ chunk-s61vbvea.js:633711-633751 placement
var heldRenderInput = (tree, engineRef) => heldByTree.get(tree)?.of(engineRef)?.input;
//@ chunk-s61vbvea.js:633751-633782 placement
var logLine = (line) => line.replace(LINE_SCRUB, "?");
//@ chunk-s61vbvea.js:633782-633837 placement
var isPlainCodeSaid = (key) => toldRefusals.has(`noted ${key}`) && (toldRefusals.has(key) || !hasUiLogSink());
//@ chunk-s61vbvea.js:633837-633877 placement
var plainCodeText = (component, note) => `ui.render (${component}): ${note}`;
//@ chunk-s61vbvea.js:633877-634013 placement
function sayPlainCode({ key, lead, text }) {
  let notedKey = `noted ${key}`;
  if (!toldRefusals.has(notedKey)) {
    toldRefusals.add(notedKey);
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
function plainKey(input, finding) {
  let isMessageComponent = MESSAGE_COMPONENT_NAMES.has(input.component);
  return [
    getPluginRegistry()
      .loadedModules.map((loadedModule) => `${loadedModule.name}#${loadedModule.environmentId}`)
      .join(),
    isMessageComponent ? input.component : `${input.component} ${input.requestId}`,
    finding,
  ].join(" ");
}
//@ chunk-s61vbvea.js:634191-634335 placement
function tellPlainCode({ input, drawnPlain, origin }) {
  let key = plainKey(input, plainCodeFinding(drawnPlain));
  if (isPlainCodeSaid(key)) return;
  sayPlainCode({
    key,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainCodeNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634335-634497 placement
function tellPlainLink({ input, drawnPlain, origin }) {
  let key = plainKey(input, `${input.surface} ${plainLinkFinding(drawnPlain)}`);
  if (isPlainCodeSaid(key)) return;
  sayPlainCode({
    key,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainLinkNote(drawnPlain)),
  });
}
//@ chunk-s61vbvea.js:634497-634581 placement
var NOTHING_LEFT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:634497", () => {
  NOTHING_LEFT = Object.freeze({
    AbovePrompt: "nothing was drawn",
    Pane: "the pane was closed",
  });
});
//@ chunk-s61vbvea.js:634581-634799 placement
function countRefused(component, origin) {
  let isLeftEmpty = NOTHING_LEFT[component] !== undefined;
  let reason = isLeftEmpty ? "tree_refused_left_empty" : "tree_refused";
  let fields = throttledRunTelemetry(
    {
      subject: component,
      event: RENDER_EVENT,
      reason,
    },
    origin,
  );
  if (fields === undefined) return;
  if (isLeftEmpty) logFeatureBad("plugin_function_hooks_draw", reason, fields);
  else logFeatureSad("plugin_function_hooks_draw", reason, fields);
}
//@ chunk-s61vbvea.js:634799-634953 placement
function countLeftEmpty(input, drawn) {
  let { component } = input;
  let subject = RENDER_SITE.refusedSubject?.(input) ?? component;
  let error = engineCreateErrors.get(subject);
  engineCreateErrors.delete(subject);
  if (error !== undefined && NOTHING_LEFT[component] !== undefined && drawn.type === "engine")
    countRefused(component, () => error);
}
//@ chunk-s61vbvea.js:634953-635084 placement
function refusedText(component, problem) {
  let tail = NOTHING_LEFT[component] !== undefined ? "nothing was drawn" : "the engine drew its own";
  return `ui.render (${component}) refused: ${problem}; ${tail}`;
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
function sayOnce({ input, origin }, reasonKey, text) {
  let { load, lead } = chainTeller(input, origin);
  sayPlainCode({
    key: [load, input.component, reasonKey].join(" "),
    lead,
    text,
  });
}
//@ chunk-s61vbvea.js:635359-635467 placement
var shownTextLine = (component, { written, drawn }) =>
  `ui.render (${component}): ${written} characters of text are drawn up to the first ${drawn}`;
//@ chunk-s61vbvea.js:635467-635693 placement
var tellOwnProps = (report) =>
  sayOnce(
    report,
    "own props",
    `ui.render (${report.input.component}): props.${report.names.join(", props.")} rewritten with more than ${SHOWN_TEXT_MAX} characters of keys and short strings, or nested past ${MAX_DEPTH} deep; the engine's own is drawn`,
  );
//@ chunk-s61vbvea.js:635693-635757 placement
var tellShownText = (report) =>
  sayOnce(report, "text cut", shownTextLine(report.input.component, report.clipped));
//@ chunk-s61vbvea.js:635757-635769 placement
var NAME_CHARS = 256;
//@ chunk-s61vbvea.js:635769-636004 placement
function namesLength(value, depth) {
  if (typeof value === "string") return value.length <= NAME_CHARS ? value.length : 0;
  let isArray = Array.isArray(value);
  if (!isArray && !isPlainDataObject(value)) return 0;
  return depth > MAX_DEPTH
    ? 1 / 0
    : isArray
      ? denseListCopy(value).reduce((acc, entry) => acc + namesLength(entry, depth + 1), 0)
      : Object.entries(value).reduce(
          (acc, [key, value]) => acc + key.length + namesLength(value, depth + 1),
          0,
        );
}
//@ chunk-s61vbvea.js:636004-636313 placement
function cutValue(value, room) {
  if (typeof value === "string") return value.length <= NAME_CHARS ? value : room.shown(value, " ");
  if (Array.isArray(value)) {
    let list = denseListCopy(value);
    let mapped = list.map((entry) => cutValue(entry, room));
    return mapped.every((cut, index) => cut === list[index]) ? value : mapped;
  }
  if (!isPlainDataObject(value)) return value;
  let entries = Object.entries(value);
  let mapped = entries.map(([key, value]) => [key, cutValue(value, room)]);
  return mapped.every(([, cut], index) => cut === entries[index]?.[1]) ? value : Object.fromEntries(mapped);
}
//@ chunk-s61vbvea.js:636313-636361 placement
var textLength = (value) => collectStrings(value).reduce((acc, text) => acc + text.length, 0);
//@ chunk-s61vbvea.js:636361-636783 placement
function withShownProps(drawn, input, report) {
  let props = input.props;
  let budget = textRoom();
  let flattened = Object.entries(drawn.props).flatMap(([key, value]) => {
    if (value === props[key] || textLength(value) <= textLength(props[key])) return [];
    let isOwnProp = namesLength(value, 0) > SHOWN_TEXT_MAX;
    let shown = isOwnProp ? props[key] : cutValue(value, budget);
    return shown === value
      ? []
      : [
          {
            key,
            drawn: shown,
            isOwn: isOwnProp,
          },
        ];
  });
  let mapped = flattened.filter((entry) => entry.isOwn).map((entry) => entry.key);
  if (budget.isCut())
    report.cut({
      written: budget.written(),
      drawn: SHOWN_TEXT_MAX,
    });
  if (mapped.length > 0) report.own(mapped);
  return flattened.length === 0
    ? drawn
    : {
        ...drawn,
        props: {
          ...drawn.props,
          ...Object.fromEntries(flattened.map((entry) => [entry.key, entry.drawn])),
        },
      };
}
//@ chunk-s61vbvea.js:636783-636807 placement
var linksByLedger = () => new WeakMap();
//@ chunk-s61vbvea.js:636807-636821 placement
var heldLinks; // deferred: uses linksByLedger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:636807", () => {
  heldLinks = linksByLedger();
});
//@ chunk-s61vbvea.js:636821-636994 placement
function drawersOf(modules, tree) {
  let ledger = tree && heldByTree.get(tree);
  let flattened = (ledger && heldLinks.get(ledger))?.flatMap((drawer) =>
    modules.some((mod) => mod.name === drawer) ? [drawer] : drawer.split("+"),
  );
  let filtered = modules.filter((mod) => flattened?.includes(mod.name));
  return filtered.length === 0 ? modules : filtered;
}
//@ chunk-s61vbvea.js:636994-637050 placement
var thrownKey = (component, teller) => [teller.load, component, "threw while drawn"].join(" ");
//@ chunk-s61vbvea.js:637050-637509 placement
function firstThrowReport(component, teller, kind) {
  let dedupeKey = `reported ${kind} ${thrownKey(component, teller)}`;
  if (toldRefusals.has(dedupeKey)) return null;
  toldRefusals.add(dedupeKey);
  let pluginArgs = loadedModuleArgs(teller.lead);
  let originInfo = pluginArgs && classifyPluginOrigin(pluginArgs);
  let fields = {
    ...originInfo,
    component: fromEnum(component),
  };
  let isClient = kind === "Client";
  if (!isClient && NOTHING_LEFT[component] !== undefined)
    logFeatureBad("plugin_function_hooks_draw", "threw_while_drawn", fields);
  else
    logFeatureSad(
      "plugin_function_hooks_draw",
      isClient ? "client_threw_while_drawn" : "threw_while_drawn",
      fields,
    );
  return `ui.render (${component}): a plugin's ${kind} threw while drawn (plugin ${originInfo?.plugin_name_redacted ?? "unattributed"}, ${originInfo?.provenance ?? "unattributed"})`;
}
//@ chunk-s61vbvea.js:637551-637731 placement
var standingLinks = (steps) =>
  steps
    .filter((step, index) => {
      let next = steps[index + 1];
      let isPassThrough =
        next !== undefined &&
        isDeepStrictEqual(step.received, next.received) &&
        isDeepStrictEqual(step.returned, next.returned);
      return step.plugin !== ENGINE && step.outcome !== "skipped" && !isPassThrough;
    })
    .map((step) => step.plugin);
//@ chunk-s61vbvea.js:637731-637827 placement
var thrownText = (component, message) =>
  `ui.render (${component}) threw while drawn: ${message}; ` +
  (NOTHING_LEFT[component] ?? "the engine drew its own");
//@ chunk-s61vbvea.js:637827-637959 placement
function tellThrown({ component, teller, error }) {
  let dedupeKey = thrownKey(component, teller);
  if (isPlainCodeSaid(dedupeKey)) return;
  sayPlainCode({
    key: dedupeKey,
    lead: teller.lead,
    text: thrownText(component, logLine(String(errorMessage(error)))),
  });
}
//@ chunk-s61vbvea.js:637959-637988 placement
var thrownTeller = (modules, tree) => tellerOf(drawersOf(modules, tree));
//@ chunk-s61vbvea.js:637988-638191 placement
function unknownBorderNote(style) {
  return `Box borderStyle ${typeof style === "string" ? `"${shownKey(style)}" is not a border style` : `is ${valueKind(style)}, not a style name`} (the styles are ${[...BORDER_STYLES].join(", ")}); the Box is drawn with no border`;
}
//@ chunk-s61vbvea.js:638191-638337 placement
function tellUnknownBorder({ input, style, origin }) {
  let dedupeKey = plainKey(input, "borderStyle");
  if (isPlainCodeSaid(dedupeKey)) return;
  sayPlainCode({
    key: dedupeKey,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, unknownBorderNote(style)),
  });
}
//@ chunk-s61vbvea.js:638337-639581 placement
async function dispatchRenderSite({ input, signal, origin }) {
  let stepRecorder = createStepRecorder();
  let onShownText = (clipped) =>
    tellShownText({
      input,
      clipped,
      origin,
    });
  let coreStep = coreHandler(stepRecorder, (request) =>
    withShownProps(request, input, {
      cut: onShownText,
      own: (names) =>
        tellOwnProps({
          input,
          names,
          origin,
        }),
    }),
  );
  let coreSteps = hasCurrentDispatch() ? [] : [coreStep];
  let drawingScope = createDrawingScope(renderInstanceKey(input), input, () =>
    renderPluginsForInstance(input),
  );
  let scope = newScope({
    drawing: drawingScope,
  });
  let traceSteps = [];
  let rawDrawn = await dispatchScopeStorage
    .run(scope, () =>
      reportChainFailure({
        e: input,
        handlers: [
          ...hookMembersFor(RENDER_EVENT, origin, {
            e: input,
          }),
          ...coreSteps,
        ],
        site: RENDER_SITE,
        signal,
        ...(input.surface === "vscode" && {
          isUnfolded: true,
        }),
        origin: hookOriginFromStack(origin),
        trace: (steps) => {
          traceSteps = steps;
        },
      }),
    )
    .finally(() => {
      drawingScope.isInFlight = false;
      scope.isEnded = true;
      scope.values = undefined;
    });
  if (input.requestId !== "" && !signal.aborted) recordStateReads(drawingScope);
  let drawn = wellFormed(rawDrawn);
  let isEngineNode = input.component === ONE_ENGINE_NODE_COMPONENT;
  let clientRows = 0;
  let treeProblem = validateTree(drawn, input.component, {
    surface: input.surface,
    note: (note) => logForDebugging(`ui.render (${input.component}): ${logLine(note)}`),
    ...(isEngineNode && {
      clientRows: (client) => {
        let rows = surfaceRowLedger.clientRows(clientMountKey(input, client));
        clientRows += rows;
        return rows;
      },
      measured: (total) => surfaceRowLedger.recordOwn(input, total - clientRows),
    }),
  });
  countLeftEmpty(input, drawn);
  if (treeProblem !== undefined) {
    logForDebugging(
      `ui.render (${input.component}): the chain settled on a tree that does not validate (${logLine(treeProblem)}); drawing the engine's own`,
      {
        level: "warn",
      },
    );
    tellRefused({
      input,
      problem: treeProblem,
      origin,
    });
    releaseAllPresses(drawn, input);
    countRefused(input.component, () => chainTeller(input, origin).lead);
    return ENGINE_ELEMENT;
  }
  let withBorders = withKnownBorders(withUsableBoxKeys(drawn), (style) =>
    tellUnknownBorder({
      input,
      style,
      origin,
    }),
  );
  let withRemote = withRemoteProps(withBorders, input.surface);
  let withLinks = withPlainLinks(withRemote, input.surface, (drawnPlain) =>
    tellPlainLink({
      input,
      drawnPlain,
      origin,
    }),
  );
  let finalTree = withPlainCode(withShownText(withLinks, onShownText), (drawnPlain) =>
    tellPlainCode({
      input,
      drawnPlain,
      origin,
    }),
  );
  releaseDroppedPresses(drawn, finalTree, input);
  heldByTree.set(finalTree, stepRecorder);
  heldLinks.set(stepRecorder, standingLinks(traceSteps));
  return finalTree;
}
//@ chunk-s61vbvea.js:639581-639701 placement
function memoizedStableKey() {
  let weakMap = new WeakMap();
  return (value) => {
    let cached = weakMap.get(value);
    if (cached !== undefined) return cached;
    let contentHash = computeContentHash(stableStringifySafe(value));
    weakMap.set(value, contentHash);
    return contentHash;
  };
}
//@ chunk-s61vbvea.js:639701-639715 placement
var propsKey; // deferred: uses memoizedStableKey of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:639701", () => {
  propsKey = memoizedStableKey();
});
//@ chunk-s61vbvea.js:639715-639809 placement
var valueKeyOf = (input) =>
  [input.viewport?.columns ?? "", input.viewport?.isFullscreen ?? "", propsKey(input.props)].join("\x00");
//@ chunk-s61vbvea.js:639809-639895 placement
var answers = (record, propsKey, version) =>
  record.settled !== undefined &&
  record.propsKey === propsKey &&
  record.versions === renderVersions() &&
  record.version === version;
//@ chunk-s61vbvea.js:639895-639941 placement
var siteVersionOf = (versions, input) =>
  withPluginVersions(
    renderVersionKey(versions, renderPluginsForInstance(input), renderPaceOf(input)),
    versions,
    renderInstanceKey(input),
  );
//@ chunk-s61vbvea.js:639941-639977 placement
var currentVersion = (input) => siteVersionOf(renderVersions().getState(), input);
//@ chunk-s61vbvea.js:639977-640133 placement
var heldFor = (input, drawn) =>
  drawn.then((tree) => {
    let withPresses = hostDrawnPresses(tree, {
      component: input.component,
      requestId: input.requestId,
      surface: input.surface,
    });
    let ledger = heldByTree.get(tree);
    if (ledger !== undefined) heldByTree.set(withPresses, ledger);
    return withPresses;
  });
//@ chunk-s61vbvea.js:640133-640145 placement
var MAX_SHARED_DRAWS = 500;
//@ chunk-s61vbvea.js:640145-640450 placement
function onScreenOf(input) {
  let onScreen = Object.hasOwn(input.props, "onScreen") ? input.props.onScreen : undefined;
  let screenProps = typeof onScreen === "object" ? onScreen : undefined;
  let first = screenProps && "first" in screenProps ? screenProps.first : null;
  let last = screenProps && "last" in screenProps ? screenProps.last : null;
  let of = screenProps && "of" in screenProps ? screenProps.of : null;
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
function sharedDrawOf(record, drawn) {
  let versions = renderVersions();
  return {
    ...record,
    versions,
    engineVersion: versions.getState().get(RENDER_EVENT) ?? 0,
    heldRows: undefined,
    drawn,
    settled: undefined,
  };
}
//@ chunk-s61vbvea.js:640580-640911 placement
function sharedDrawStore() {
  let byInstance = new Map();
  let versions;
  let engineVersion = 0;
  let reuseCount = 0;
  return {
    get: (instanceKey) => byInstance.get(instanceKey),
    set: (instanceKey, record) => {
      if (record.versions !== versions || record.engineVersion !== engineVersion) {
        byInstance.clear();
        versions = record.versions;
        engineVersion = record.engineVersion;
      }
      byInstance.delete(instanceKey);
      byInstance.set(instanceKey, record);
      for (let key of byInstance.keys()) {
        if (byInstance.size <= MAX_SHARED_DRAWS) break;
        byInstance.delete(key);
      }
    },
    drop: (instanceKey, record) => {
      if (byInstance.get(instanceKey) === record) byInstance.delete(instanceKey);
    },
    size: () => byInstance.size,
    reused: () => reuseCount,
    countReuse: () => {
      reuseCount += 1;
    },
  };
}
//@ chunk-s61vbvea.js:640911-640951 placement
var sharedPropsKey = (input, origin) => `${originChainText(origin)}\x00${valueKeyOf(input)}`;
//@ chunk-s61vbvea.js:640951-642484 placement
function createRenderDraws() {
  let store = sharedDrawStore();
  async function uiRender(input, { signal, origin }) {
    if (hasCurrentDispatch())
      return heldFor(
        input,
        dispatchRenderSite({
          input,
          signal,
          origin,
        }),
      );
    let instanceKey = renderInstanceKey(input);
    let propsKey = sharedPropsKey(input, origin);
    let version = currentVersion(input);
    let shared = input.requestId === "" ? undefined : store.get(instanceKey);
    if (shared && answers(shared, propsKey, version)) {
      store.countReuse();
      logForDebugging(
        `ui.render (${input.component} ${input.requestId}): ${input.surface} reuses its settled evaluation (one dispatch per draw)`,
      );
      return heldFor(input, shared.drawn);
    }
    let now = Date.now();
    let plugins = renderPaceOf(input) === "live" ? renderPluginsForInstance(input) : [];
    let isFirst = shared === undefined;
    let drawn = dispatchRenderSite({
      input,
      signal,
      origin,
    });
    if (input.requestId !== "") {
      let record = sharedDrawOf(
        {
          propsKey,
          version,
          onScreen: onScreenOf(input),
        },
        drawn,
      );
      store.set(instanceKey, record);
      drawn.then(
        (settled) => {
          record.settled = settled;
          if (!isFirst) throttleLive(plugins, Date.now() - now);
        },
        (error) =>
          logForDebugging(
            `ui.render (${input.component} ${input.requestId}): evaluation failed: ${errorMessage(error)}`,
            {
              level: "error",
            },
          ),
      );
      signal.addEventListener(
        "abort",
        () => {
          if (!record.settled) {
            store.drop(instanceKey, record);
            throttleSteady(plugins, Date.now() - now);
          }
        },
        {
          once: true,
        },
      );
    }
    return heldFor(input, drawn);
  }
  function sharedFor(input, origin) {
    let record = store.get(renderInstanceKey(input));
    return input.requestId !== "" &&
      record !== undefined &&
      answers(record, record.propsKey, currentVersion(input)) &&
      record.propsKey ===
        sharedPropsKey(
          {
            viewport: input.viewport,
            props: {
              ...input.props,
              onScreen: record.onScreen,
            },
          },
          origin,
        )
      ? record
      : undefined;
  }
  function settledFor(input, origin) {
    if (input.requestId === "") return;
    let record = store.get(renderInstanceKey(input));
    return record !== undefined && answers(record, sharedPropsKey(input, origin), currentVersion(input))
      ? record.settled
      : undefined;
  }
  return {
    uiRender,
    settled: settledFor,
    held: (input) => store.get(renderInstanceKey(input))?.settled,
    askedOnScreen: (input, origin) => sharedFor(input, origin)?.onScreen,
    heldRowsOf: (input, origin) => sharedFor(input, origin)?.heldRows,
    noteHeldRows: (input, heldRows) => {
      let record = store.get(renderInstanceKey(input));
      if (record?.onScreen === null) record.heldRows = heldRows;
    },
    noteThrown: (input, drawn) => {
      let record = store.get(renderInstanceKey(input));
      if (
        record !== undefined &&
        (record.settled === undefined || heldByTree.get(record.settled) !== heldByTree.get(drawn))
      )
        return;
      if (record !== undefined) {
        record.settled = ENGINE_ELEMENT;
        record.drawn = Promise.resolve(ENGINE_ELEMENT);
      }
      hostDrawnPresses(ENGINE_ELEMENT, input);
    },
    reuseCount: store.reused,
    sharedCount: store.size,
  };
}
//@ chunk-s61vbvea.js:663451-663537 placement
function desktopTicketOf(input) {
  return input.surface === "desktop" ? drawnClientLedger.begin(input.component, input.requestId) : undefined;
}
//@ chunk-s61vbvea.js:663537-663589 placement
var hasRenderHooks = (component) =>
  hasModuleHookingSite(
    RENDER_EVENT,
    component === undefined
      ? undefined
      : {
          component,
        },
  );
//@ chunk-s61vbvea.js:663589-663711 placement
var hasRenderHooksFor = (input) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      matchesField(loadedModule.matcherFor(RENDER_EVENT), "component", input.component) &&
      matcherAdmits(loadedModule, RENDER_EVENT, input),
  );
//@ chunk-s61vbvea.js:663711-663725 placement
var renderDraws; // deferred: uses createRenderDraws of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:663711", () => {
  renderDraws = createRenderDraws();
});
//@ chunk-s61vbvea.js:663725-663797 placement
// deferred: uses setRenderSites (../../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:663725", () => {
  setRenderSites(
    Object.keys(RENDER_SITES).map((key) => ({
      event: RENDER_EVENT,
      component: key,
      drawnBy: RENDER_SITES[key],
    })),
  );
});
//@ chunk-s61vbvea.js:663797-664592 placement
// deferred: uses createDesktopFaultHandler (./desktopSurface.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:663797", () => {
  installRenderBridge({
    async run(request) {
      let props = request.props;
      let ticket = desktopTicketOf(request);
      if (!hasRenderHooksFor(request)) {
        if (ticket !== undefined) drawnClientLedger.record(ticket, []);
        return engineElement(props);
      }
      let tree = await renderDraws.uiRender(request, {
        signal: new AbortController().signal,
      });
      let engineRef = findEngineRef(tree);
      let heldInput = engineRef === undefined ? undefined : heldRenderInput(tree, engineRef);
      let effectiveProps =
        heldInput !== undefined && heldInput.component === request.component ? heldInput.props : props;
      let clientElements = collectClientElements(tree);
      if (ticket !== undefined) drawnClientLedger.record(ticket, clientElements);
      return {
        props: effectiveProps,
        rewritten: effectiveProps !== props,
        tree,
        clientModules: surfaceBundleHashes(clientElements),
        drawnBy: getActiveModNames(drawersOf(chainModules(request), tree)),
      };
    },
    hooked: hasRenderHooks,
    onInvalidate: (listener) => {
      let releaseVersions = subscribeRenderVersions(() => listener());
      let releaseStale = subscribeStale((stale) => {
        let filtered = stale.filter((entry) => entry.surface !== "terminal");
        if (filtered.length > 0) listener(filtered);
      });
      return () => {
        releaseVersions();
        releaseStale();
      };
    },
    press: ({ surface = "desktop", ...rest }) =>
      handleUiPress({
        ...rest,
        surface,
      }),
    input: ({ surface = "desktop", ...rest }) =>
      dispatchInputQueued({
        ...rest,
        surface,
      }),
    select: ({ surface = "desktop", ...rest }) =>
      dispatchSelectQueued({
        ...rest,
        surface,
      }),
    clientModule: (address) => surfaceBundleCache.moduleFor(address),
    clientPress: (request) => dispatchDesktopClient(request),
    clientMessage: (request) => postDesktopClientMessage(request),
    clientFault: createDesktopFaultHandler(),
  });
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
