/**
 * plugins/functionHooks/ui/renderDispatch.ts
 *
 * ui.render 站点分发（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (63)
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
import { renderInstanceKey, commitReads, onStale } from "../api/state.js";
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
  drawnDesktopClients,
  moduleHashesOf,
  desktopModules,
  runClientPress,
  runClientMessage,
  createClientFaultRunner,
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

//@ chunk-7jxyna5q.js:554797-554885 placement
var chainModules = (input, origin) =>
  modulesHookingEvent(RENDER_EVENT, origin, {
    e: input,
  }).filter((mod) => matchesField(mod.matcherFor(RENDER_EVENT), "component", input.component));
//@ chunk-7jxyna5q.js:554885-554901 placement
var UNATTRIBUTED_LEAD = "hooks";
//@ chunk-7jxyna5q.js:554901-554969 placement
function leadOf(names) {
  let [first, ...rest] = names;
  return first !== undefined && rest.length === 0 ? first : UNATTRIBUTED_LEAD;
}
//@ chunk-7jxyna5q.js:554969-555032 placement
var loadOf = (modules) => modules.map((mod) => `${mod.name}#${mod.environmentId}`).join();
//@ chunk-7jxyna5q.js:555032-555090 placement
var tellerOf = (modules) => ({
  load: loadOf(modules),
  lead: leadOf(modules.map((mod) => mod.name)),
});
//@ chunk-7jxyna5q.js:555090-555119 placement
var chainTeller = (input, origin) => tellerOf(chainModules(input, origin));
//@ chunk-7jxyna5q.js:555119-555237 placement
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
//@ chunk-7jxyna5q.js:555237-555261 placement
var RENDER_SITE; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:555237", () => {
  RENDER_SITE = UI_ENV_SITE_RULES["ui.render"];
});
//@ chunk-7jxyna5q.js:555261-555344 placement
function ledgersByTree() {
  let weakMap = new WeakMap();
  return {
    get: (tree) => weakMap.get(tree),
    set: (tree, ledger) => {
      weakMap.set(tree, ledger);
    },
  };
}
//@ chunk-7jxyna5q.js:555344-555358 placement
var heldByTree; // deferred: uses ledgersByTree of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:555344", () => {
  heldByTree = ledgersByTree();
});
//@ chunk-7jxyna5q.js:555358-555398 placement
var heldRenderInput = (tree, engineRef) => heldByTree.get(tree)?.of(engineRef)?.input;
//@ chunk-7jxyna5q.js:555398-555429 placement
var logLine = (line) => line.replace(LINE_SCRUB, "?");
//@ chunk-7jxyna5q.js:555429-555484 placement
var isPlainCodeSaid = (key) => toldRefusals.has(`noted ${key}`) && (toldRefusals.has(key) || !hasUiLogSink());
//@ chunk-7jxyna5q.js:555484-555524 placement
var plainCodeText = (component, note) => `ui.render (${component}): ${note}`;
//@ chunk-7jxyna5q.js:555524-555660 placement
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
//@ chunk-7jxyna5q.js:555660-555838 placement
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
//@ chunk-7jxyna5q.js:555838-555982 placement
function tellPlainCode({ input, drawnPlain, origin }) {
  let key = plainKey(input, plainCodeFinding(drawnPlain));
  if (isPlainCodeSaid(key)) return;
  sayPlainCode({
    key,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainCodeNote(drawnPlain)),
  });
}
//@ chunk-7jxyna5q.js:555982-556144 placement
function tellPlainLink({ input, drawnPlain, origin }) {
  let key = plainKey(input, `${input.surface} ${plainLinkFinding(drawnPlain)}`);
  if (isPlainCodeSaid(key)) return;
  sayPlainCode({
    key,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, plainLinkNote(drawnPlain)),
  });
}
//@ chunk-7jxyna5q.js:556144-556257 placement
var NOTHING_LEFT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:556144", () => {
  NOTHING_LEFT = Object.freeze({
    AbovePrompt: "nothing was drawn",
    Backdrop: "nothing was drawn",
    Pane: "the pane was closed",
  });
});
//@ chunk-7jxyna5q.js:556257-556475 placement
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
//@ chunk-7jxyna5q.js:556475-556629 placement
function countLeftEmpty(input, drawn) {
  let { component } = input;
  let subject = RENDER_SITE.refusedSubject?.(input) ?? component;
  let error = engineCreateErrors.get(subject);
  engineCreateErrors.delete(subject);
  if (error !== undefined && NOTHING_LEFT[component] !== undefined && drawn.type === "engine")
    countRefused(component, () => error);
}
//@ chunk-7jxyna5q.js:556629-556760 placement
function refusedText(component, problem) {
  let tail = NOTHING_LEFT[component] !== undefined ? "nothing was drawn" : "the engine drew its own";
  return `ui.render (${component}) refused: ${problem}; ${tail}`;
}
//@ chunk-7jxyna5q.js:556760-556917 placement
function tellRefused({ input, problem, origin }) {
  if (!hasUiLogSink()) return;
  let { load, lead } = chainTeller(input, origin);
  tellOnce({
    key: [load, input.component, problem].join(" "),
    lead,
    text: refusedText(input.component, problem),
  });
}
//@ chunk-7jxyna5q.js:556917-557035 placement
function sayOnce({ input, origin }, reasonKey, text) {
  let { load, lead } = chainTeller(input, origin);
  sayPlainCode({
    key: [load, input.component, reasonKey].join(" "),
    lead,
    text,
  });
}
//@ chunk-7jxyna5q.js:557035-557143 placement
var shownTextLine = (component, { written, drawn }) =>
  `ui.render (${component}): ${written} characters of text are drawn up to the first ${drawn}`;
//@ chunk-7jxyna5q.js:557143-557369 placement
var tellOwnProps = (report) =>
  sayOnce(
    report,
    "own props",
    `ui.render (${report.input.component}): props.${report.names.join(", props.")} rewritten with more than ${SHOWN_TEXT_MAX} characters of keys and short strings, or nested past ${MAX_DEPTH} deep; the engine's own is drawn`,
  );
//@ chunk-7jxyna5q.js:557369-557433 placement
var tellShownText = (report) =>
  sayOnce(report, "text cut", shownTextLine(report.input.component, report.clipped));
//@ chunk-7jxyna5q.js:557433-557445 placement
var NAME_CHARS = 256;
//@ chunk-7jxyna5q.js:557445-557680 placement
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
//@ chunk-7jxyna5q.js:557680-557989 placement
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
//@ chunk-7jxyna5q.js:557989-558037 placement
var textLength = (value) => collectStrings(value).reduce((acc, text) => acc + text.length, 0);
//@ chunk-7jxyna5q.js:558037-558459 placement
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
//@ chunk-7jxyna5q.js:558459-558483 placement
var linksByLedger = () => new WeakMap();
//@ chunk-7jxyna5q.js:558483-558497 placement
var heldLinks; // deferred: uses linksByLedger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:558483", () => {
  heldLinks = linksByLedger();
});
//@ chunk-7jxyna5q.js:558497-558670 placement
function drawersOf(modules, tree) {
  let ledger = tree && heldByTree.get(tree);
  let flattened = (ledger && heldLinks.get(ledger))?.flatMap((drawer) =>
    modules.some((mod) => mod.name === drawer) ? [drawer] : drawer.split("+"),
  );
  let filtered = modules.filter((mod) => flattened?.includes(mod.name));
  return filtered.length === 0 ? modules : filtered;
}
//@ chunk-7jxyna5q.js:558670-558726 placement
var thrownKey = (component, teller) => [teller.load, component, "threw while drawn"].join(" ");
//@ chunk-7jxyna5q.js:558726-559185 placement
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
//@ chunk-7jxyna5q.js:559227-559407 placement
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
//@ chunk-7jxyna5q.js:559407-559503 placement
var thrownText = (component, message) =>
  `ui.render (${component}) threw while drawn: ${message}; ` +
  (NOTHING_LEFT[component] ?? "the engine drew its own");
//@ chunk-7jxyna5q.js:559503-559635 placement
function tellThrown({ component, teller, error }) {
  let dedupeKey = thrownKey(component, teller);
  if (isPlainCodeSaid(dedupeKey)) return;
  sayPlainCode({
    key: dedupeKey,
    lead: teller.lead,
    text: thrownText(component, logLine(String(errorMessage(error)))),
  });
}
//@ chunk-7jxyna5q.js:559635-559664 placement
var thrownTeller = (modules, tree) => tellerOf(drawersOf(modules, tree));
//@ chunk-7jxyna5q.js:559664-559867 placement
function unknownBorderNote(style) {
  return `Box borderStyle ${typeof style === "string" ? `"${shownKey(style)}" is not a border style` : `is ${valueKind(style)}, not a style name`} (the styles are ${[...BORDER_STYLES].join(", ")}); the Box is drawn with no border`;
}
//@ chunk-7jxyna5q.js:559867-560013 placement
function tellUnknownBorder({ input, style, origin }) {
  let dedupeKey = plainKey(input, "borderStyle");
  if (isPlainCodeSaid(dedupeKey)) return;
  sayPlainCode({
    key: dedupeKey,
    lead: chainTeller(input, origin).lead,
    text: plainCodeText(input.component, unknownBorderNote(style)),
  });
}
//@ chunk-7jxyna5q.js:560013-561259 placement
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
  if (input.requestId !== "" && !signal.aborted) commitReads(drawingScope);
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
//@ chunk-7jxyna5q.js:561259-561379 placement
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
//@ chunk-7jxyna5q.js:561379-561393 placement
var propsKey; // deferred: uses memoizedStableKey of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:561379", () => {
  propsKey = memoizedStableKey();
});
//@ chunk-7jxyna5q.js:561393-561487 placement
var valueKeyOf = (input) =>
  [input.viewport?.columns ?? "", input.viewport?.isFullscreen ?? "", propsKey(input.props)].join("\x00");
//@ chunk-7jxyna5q.js:561487-561573 placement
var answers = (record, propsKey, version) =>
  record.settled !== undefined &&
  record.propsKey === propsKey &&
  record.versions === renderVersions() &&
  record.version === version;
//@ chunk-7jxyna5q.js:561573-561619 placement
var siteVersionOf = (versions, input) =>
  withPluginVersions(
    renderVersionKey(versions, renderPluginsForInstance(input), renderPaceOf(input)),
    versions,
    renderInstanceKey(input),
  );
//@ chunk-7jxyna5q.js:561619-561655 placement
var currentVersion = (input) => siteVersionOf(renderVersions().getState(), input);
//@ chunk-7jxyna5q.js:561655-561811 placement
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
//@ chunk-7jxyna5q.js:561811-561823 placement
var MAX_SHARED_DRAWS = 500;
//@ chunk-7jxyna5q.js:561823-562128 placement
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
//@ chunk-7jxyna5q.js:562128-562258 placement
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
//@ chunk-7jxyna5q.js:562258-562589 placement
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
//@ chunk-7jxyna5q.js:562589-562629 placement
var sharedPropsKey = (input, origin) => `${originChainText(origin)}\x00${valueKeyOf(input)}`;
//@ chunk-7jxyna5q.js:562629-564167 placement
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
//@ chunk-7jxyna5q.js:585207-585294 placement
function desktopTicketOf(input) {
  return input.surface === "desktop"
    ? drawnDesktopClients.begin(input.component, input.requestId)
    : undefined;
}
//@ chunk-7jxyna5q.js:585294-585346 placement
var hasRenderHooks = (component) =>
  hasModuleHookingSite(
    RENDER_EVENT,
    component === undefined
      ? undefined
      : {
          component,
        },
  );
//@ chunk-7jxyna5q.js:585346-585468 placement
var hasRenderHooksFor = (input) =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      matchesField(loadedModule.matcherFor(RENDER_EVENT), "component", input.component) &&
      matcherAdmits(loadedModule, RENDER_EVENT, input),
  );
//@ chunk-7jxyna5q.js:585468-585482 placement
var renderDraws; // deferred: uses createRenderDraws of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:585468", () => {
  renderDraws = createRenderDraws();
});
//@ chunk-7jxyna5q.js:585482-585554 placement
// deferred: uses setRenderSites (../../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:585482", () => {
  setRenderSites(
    Object.keys(RENDER_SITES).map((key) => ({
      event: RENDER_EVENT,
      component: key,
      drawnBy: RENDER_SITES[key],
    })),
  );
});
//@ chunk-7jxyna5q.js:585554-586356 placement
// deferred: uses createClientFaultRunner (./desktopSurface.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:585554", () => {
  installRenderBridge({
    async run(request) {
      let props = request.props;
      let ticket = desktopTicketOf(request);
      if (!hasRenderHooksFor(request)) {
        if (ticket !== undefined) drawnDesktopClients.record(ticket, []);
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
      if (ticket !== undefined) drawnDesktopClients.record(ticket, clientElements);
      return {
        props: effectiveProps,
        rewritten: effectiveProps !== props,
        tree,
        clientModules: moduleHashesOf(clientElements),
        drawnBy: getActiveModNames(drawersOf(chainModules(request), tree)),
      };
    },
    hooked: hasRenderHooks,
    onInvalidate: (listener) => {
      let releaseVersions = subscribeRenderVersions(() => listener());
      let releaseStale = onStale((stale) => {
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
    clientModule: (address) => desktopModules.moduleFor(address),
    clientPress: (request) => runClientPress(request),
    clientMessage: (request) => runClientMessage(request),
    clientFault: createClientFaultRunner(),
  });
});
export {
  currentVersion,
  sayPlainCode,
  logLine,
  unknownBorderNote,
  renderDraws,
  thrownTeller,
  firstThrowReport,
  tellThrown,
  MAX_SHARED_DRAWS,
  NAME_CHARS,
  NOTHING_LEFT,
  RENDER_SITE,
  UNATTRIBUTED_LEAD,
  answers,
  chainModules,
  chainTeller,
  coreHandler,
  countLeftEmpty,
  countRefused,
  createRenderDraws,
  cutValue,
  desktopTicketOf,
  dispatchRenderSite,
  drawersOf,
  hasRenderHooks,
  hasRenderHooksFor,
  heldByTree,
  heldFor,
  heldLinks,
  heldRenderInput,
  isPlainCodeSaid,
  leadOf,
  ledgersByTree,
  linksByLedger,
  loadOf,
  memoizedStableKey,
  namesLength,
  onScreenOf,
  plainCodeText,
  plainKey,
  propsKey,
  refusedText,
  sayOnce,
  sharedDrawOf,
  sharedDrawStore,
  sharedPropsKey,
  shownTextLine,
  siteVersionOf,
  standingLinks,
  tellOwnProps,
  tellPlainCode,
  tellPlainLink,
  tellRefused,
  tellShownText,
  tellUnknownBorder,
  tellerOf,
  textLength,
  thrownKey,
  thrownText,
  valueKeyOf,
  withShownProps,
};
