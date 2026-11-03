/**
 * components/memory/OrgMemoryProjectPicker.tsx
 *
 * 2.1.316 新增：组织记忆项目选择、切换与系统提示段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c55mbvfz.js (24)
 * attribution: placement 24
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ, MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { BRACKET_CONFUSABLES_2, escapeXmlText } from "../../utils/sanitization.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import {
  readSavedSelection,
  selectionAccountKey,
  isPublicProjects,
} from "../../services/orgMemory/selection.js";
import {
  disconnectOrgMemory,
  reconnectOrgMemory,
  getOrgMemoryPickerData,
} from "../../services/orgMemory/discovery.js";
import { withDeadline } from "../../utils/sleep.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  waitForOrgMemoryDecisionSettled,
  shrinkOrgMemoryDecisionWriteAsk,
  getOrgMemoryDecision,
  getOrgMemoryServedIdentity,
} from "../../services/orgMemory/orgMemoryDecision.js";
import {
  setSharedMemoryServedViaTools,
  buildMemoryStoreEntry,
  formatMemoryStoreLine,
} from "../../memdir/memoryStoresPrompt.js";
import { clearOrgMemoryCredential } from "../../services/orgMemory/credential.js";
import { logError } from "../../utils/log.js";
import {
  sortRootFirst,
  getStoreScopeLabel,
  describeStoreScope,
} from "../../services/orgMemory/storeLabels.js";
import { readableOrgMemoryStores, isStoreWritable } from "../../services/memorySync/availability.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { loadStorePromptIndex } from "../../services/orgMemory/promptIndex.js";
import { logEvent } from "../../services/analytics/index.js";
import { count } from "../../utils/collections.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { describeMemoryStoreIndex, wrapFetchedMemoryIndex } from "../../memdir/memdir.js";

//@ chunk-c55mbvfz.js:21749-21753 placement
init_react_production();
//@ chunk-c55mbvfz.js:21819-21926 placement
var MEMORY_TOOL_NAMES = `${MEMORY_LIST_TOOL_NAME} / ${MEMORY_READ} / ${MEMORY_WRITE}`;
var MAX_PROJECT_NAME_CHARS = 80;
var BRACKET_CONFUSABLES_REGEX = new RegExp(`[${[...BRACKET_CONFUSABLES_2.keys()].join("")}]`, "gu");
var MEMORY_INDEX_FETCH_TIMEOUT_MS = 20000;
var MEMORY_SWITCH_TIMEOUT_MS = 120000;
//@ chunk-c55mbvfz.js:21926-21973 placement
class RequestEpoch {
  latest = 0;
  begin() {
    return ++this.latest;
  }
}
//@ chunk-c55mbvfz.js:21973-21999 placement
var requestEpochSlot = new SessionRootSlot(() => new RequestEpoch());
//@ chunk-c55mbvfz.js:21999-23215 placement
/**
 * 切换/断开当前目录使用的组织记忆项目，等待决定落定并返回结果状态。
 */
async function switchOrgMemoryProject(session, _) {
  try {
    let C = requestEpochSlot.of(session);
    let v = C.begin();
    let T = _ === "project" ? readSavedSelection() : null;
    let x = selectionAccountKey();
    let D = snapshotOrgMemoryStores();
    let N = () => {
      D = snapshotOrgMemoryStores();
    };
    let B = _ === "off" ? disconnectOrgMemory(N) : reconnectOrgMemory(N);
    let I = (await withDeadline(B, MEMORY_INDEX_FETCH_TIMEOUT_MS)) ?? "timeout";
    if (I !== "timeout" && I.kind === "refused") {
      logMemoryProjectSwitch("refused", D, D, []);
      logFeatureSad("org_memory_project_switch", I.reason);
      return {
        outcome: "refused",
        notice: memoryDeferredText(I.reason),
      };
    }
    let L = snapshotOrgMemoryStores();
    let U = I === "timeout" || I.current.state === "undecided";
    let V = U ? "pending" : memorySwitchOutcome(_, D, L);
    let selection = I !== "timeout" && I.current.state === "on" ? I.current.request.selection : null;
    let pickDropped =
      !U && T !== null && selection !== T && selectionAccountKey() === x && readSavedSelection() === null;
    applyMemoryWritableState(V, D, L);
    let K = V === "switched" || V === "connected" ? await loadMemoryStoresContent(L.stores) : [];
    logMemoryProjectSwitch(V, D, L, K, pickDropped);
    if (pickDropped) logFeatureSad("org_memory_project_switch", "selection_dropped");
    else if (V === "unavailable" || V === "pending")
      logFeatureSad(
        "org_memory_project_switch",
        I === "timeout" ? "switch_deadline" : memoryUnavailableReason(I.current),
      );
    else
      logFeatureOk("org_memory_project_switch", {
        outcome: fromEnum(V),
      });
    if (V === "pending")
      B.then(() =>
        waitForOrgMemoryDecisionSettled(MEMORY_SWITCH_TIMEOUT_MS, undefined, {
          unref: true,
        }),
      )
        .then(() => {
          if (v !== C.latest) return;
          let H = snapshotOrgMemoryStores();
          if (hasOrgMemoryContent(D) || H.stores.length > 0)
            setSharedMemoryServedViaTools(H.stores.some((store) => store.writable));
        })
        .catch(() => {});
    let orgMemoryPrompt = buildOrgMemoryPrompt(V, _, D, L, K, pickDropped);
    return {
      outcome: V,
      notice: describeMemorySwitchOutcome(V, _, D, L, pickDropped),
      ...(orgMemoryPrompt !== null && {
        modelMessage: orgMemoryPrompt,
      }),
    };
  } catch (error) {
    shrinkOrgMemoryDecisionWriteAsk();
    clearOrgMemoryCredential();
    logError(error);
    logFeatureBad("org_memory_project_switch", "unexpected_throw");
    return {
      outcome: "unavailable",
      notice: memoryNotConnectedText(_),
    };
  }
}
//@ chunk-c55mbvfz.js:23215-23481 placement
function applyMemoryWritableState(b, _, C) {
  switch (b) {
    case "switched":
    case "connected":
      setSharedMemoryServedViaTools(C.stores.some((store) => store.writable));
      return;
    case "disconnected":
    case "unavailable":
    case "pending":
      if (hasOrgMemoryContent(_)) setSharedMemoryServedViaTools(false);
      return;
    case "unchanged":
      if (hasOrgMemoryContent(_) || C.stores.length > 0)
        setSharedMemoryServedViaTools(C.stores.some((store) => store.writable));
      return;
  }
}
//@ chunk-c55mbvfz.js:23481-23538 placement
function hasOrgMemoryContent(b) {
  return b.servedEarlier || b.stores.length > 0;
}
//@ chunk-c55mbvfz.js:23538-23715 placement
function snapshotOrgMemoryStores() {
  return {
    project: describeMemoryProjectSelection(getOrgMemoryDecision()),
    servedEarlier: getOrgMemoryServedIdentity() !== null,
    stores: sortRootFirst(readableOrgMemoryStores()).map((b) => ({
      id: getStoreScopeLabel(b),
      description: describeStoreScope(b),
      writable: isStoreWritable(b),
      promptIndex: b.promptIndex,
      store: b,
    })),
  };
}
//@ chunk-c55mbvfz.js:23715-24020 placement
function describeMemoryProjectSelection(orgMemoryDecision) {
  if (orgMemoryDecision.state !== "on")
    return {
      kind: "none",
    };
  let selection = orgMemoryDecision.request.selection;
  if (selection === null || orgMemoryDecision.selectionSource !== "preference")
    return {
      kind: "default",
    };
  if (isPublicProjects(selection))
    return {
      kind: "picked",
      name: "all public projects",
    };
  let found = getOrgMemoryPickerData()?.candidates.find((candidate) => candidate.id === selection);
  return {
    kind: "picked",
    name: found === undefined ? null : sanitizeProjectName(found.name),
  };
}
//@ chunk-c55mbvfz.js:24020-24221 placement
function sanitizeProjectName(name) {
  let trimmed = isNetworkPath(name)
    .replaceAll('"', "'")
    .replaceAll("<", "\u2039")
    .replaceAll(">", "\u203A")
    .replace(/[\u2028\u2029]/g, " ")
    .trim();
  if (trimmed === "") return null;
  return truncateCodePoints(trimmed, MAX_PROJECT_NAME_CHARS) === trimmed
    ? trimmed
    : `${truncateCodePoints(trimmed, MAX_PROJECT_NAME_CHARS - 1)}\u2026`;
}
//@ chunk-c55mbvfz.js:24221-24439 placement
function sameMemoryStores(b, _) {
  return (
    b.stores.length === _.stores.length &&
    b.stores.every((store, v) => {
      let T = _.stores[v];
      return (
        T !== undefined &&
        store.id === T.id &&
        store.store.path === T.store.path &&
        store.promptIndex === T.promptIndex &&
        store.writable === T.writable
      );
    })
  );
}
//@ chunk-c55mbvfz.js:24439-24634 placement
function memorySwitchOutcome(b, _, C) {
  if (C.stores.length === 0) {
    if (b === "off") return hasOrgMemoryContent(_) ? "disconnected" : "unchanged";
    return "unavailable";
  }
  if (_.stores.length === 0) return "connected";
  return sameMemoryStores(_, C) ? "unchanged" : "switched";
}
//@ chunk-c55mbvfz.js:24634-24841 placement
function memoryUnavailableReason(b) {
  switch (b.state) {
    case "off":
      return `off_${b.cause}`;
    case "parked":
      return `parked_${b.cause}`;
    case "ended":
      return `ended_${b.cause}`;
    case "undecided":
      return "settle_timeout";
    case "on":
      return "no_stores";
  }
}
//@ chunk-c55mbvfz.js:24841-25164 placement
async function loadMemoryStoresContent(stores) {
  let filtered = stores.filter((v) => v.promptIndex !== undefined);
  let results = await Promise.all(filtered.map((v) => loadStorePromptIndex(v.store)));
  return filtered.map((store, T) => {
    let x = results[T];
    if (x === null || x === undefined)
      return {
        store,
        state: "unavailable",
        content: "",
      };
    return x.content.trim() === ""
      ? {
          store,
          state: "empty",
          content: "",
        }
      : {
          store,
          state: "loaded",
          content: x.content,
        };
  });
}
//@ chunk-c55mbvfz.js:25164-25456 placement
function logMemoryProjectSwitch(b, _, C, v, pickDropped = false) {
  logEvent("tengu_org_memory_project_switch", {
    outcome: fromEnum(b),
    pick_dropped: pickDropped,
    stores_before: _.stores.length,
    stores_after: C.stores.length,
    indexes_loaded: count(v, (x) => x.state === "loaded"),
    indexes_empty: count(v, (x) => x.state === "empty"),
    indexes_unavailable: count(v, (x) => x.state === "unavailable"),
  });
}
//@ chunk-c55mbvfz.js:25456-26267 placement
function describeMemorySwitchOutcome(b, _, C, v, T) {
  if (T) return describeStaleMemoryPick(b, v);
  switch (b) {
    case "switched":
    case "connected":
      return memoryConnectedText(v);
    case "disconnected":
      return `off for this directory \u2014 Claude has stopped using ${memoryProjectLabel(C.project)}`;
    case "unavailable":
      return C.stores.length > 0
        ? "couldn't connect, so it is off for now \u2014 the pick is kept for this directory; Enter on it in /memory retries"
        : "couldn't connect \u2014 the pick is kept for this directory; Enter on it in /memory retries";
    case "pending":
      return _ === "off"
        ? "off for this directory \u2014 disconnecting once the in-flight connection attempt lands"
        : "saved for this directory \u2014 still connecting; Claude can use it once it lands";
    case "unchanged":
      return _ === "off"
        ? "off for this directory \u2014 nothing was connected"
        : "saved for this directory \u2014 already connected, nothing changed";
  }
}
//@ chunk-c55mbvfz.js:26267-26503 placement
function memoryNotConnectedText(b) {
  return b === "off"
    ? "off for this directory \u2014 the disconnect may not have finished this session; it holds from next session"
    : "couldn't connect \u2014 the pick is kept for this directory; Enter on it in /memory retries";
}
//@ chunk-c55mbvfz.js:26503-26775 placement
function memoryConnectedText(b) {
  let any = b.stores.some((store) => store.writable);
  let C = `connected to ${memoryProjectLabel(b.project)}${any ? "" : " (read-only)"}`;
  let v = any ? "Claude can use it and save to it now" : "Claude can use it now";
  return b.project.kind === "picked" ? `${C} \u2014 saved for this directory; ${v}` : `${C} \u2014 ${v}`;
}
//@ chunk-c55mbvfz.js:26775-27054 placement
function memoryDeferredText(reason) {
  switch (reason) {
    case "account_boundary":
      return "saved for this directory \u2014 the account changed mid-session, so it connects next session";
    case "untrusted_workspace":
      return "saved for this directory \u2014 this workspace is not trusted yet, so it connects next session";
  }
}
//@ chunk-c55mbvfz.js:27054-27496 placement
function describeStaleMemoryPick(b, _) {
  switch (b) {
    case "switched":
    case "connected":
      return `${"that project is no longer available \u2014 the pick was cleared"}; ${memoryConnectedText(_)}`;
    case "unchanged":
      return `${"that project is no longer available \u2014 the pick was cleared"}; connection unchanged`;
    case "unavailable":
    case "disconnected":
    case "pending":
      return `${"that project is no longer available \u2014 the pick was cleared"}; project memory is off until another pick in /memory`;
  }
}
//@ chunk-c55mbvfz.js:27496-27659 placement
function memoryProjectLabel(project) {
  switch (project.kind) {
    case "none":
      return "project memory";
    case "default":
      return "the default project memory";
    case "picked":
      return project.name ?? "the picked project";
  }
}
//@ chunk-c55mbvfz.js:27659-27912 placement
function memoryProjectPromptLabel(project) {
  switch (project.kind) {
    case "none":
      return "project memory";
    case "default":
      return "the default project memory";
    case "picked":
      return project.name === null
        ? "a project with no displayable name"
        : `project "${escapeXmlText(project.name).replace(BRACKET_CONFUSABLES_REGEX, (_) => `&#${_.codePointAt(0)};`)}"`;
  }
}
//@ chunk-c55mbvfz.js:27912-31441 placement
/**
 * 生成组织记忆项目的系统提示段（最近项目、已连接存储列表、读写说明）。
 */
function buildOrgMemoryPrompt(b, _, C, v, T, x = false) {
  let D = C.stores.length > 0 ? ` \u2014 most recently ${memoryProjectPromptLabel(C.project)}` : "";
  let N = hasOrgMemoryContent(C)
    ? ` Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, describe an earlier connection${D}, possibly to a different project. Treat them as stale until re-checked with the tools: do not attribute those memories to, or save them into, the project connected now on the strength of the earlier results alone. Your personal memory directory, if your system prompt names one, is unaffected.`
    : "";
  switch (b) {
    case "unchanged":
      return null;
    case "pending":
      if (hasOrgMemoryContent(C))
        return wrapInSystemReminder(
          `This session is no longer connected to ${memoryProjectPromptLabel(C.project)} (a re-pick in /memory is still being applied). Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, are stale. Call ${MEMORY_LIST_TOOL_NAME} with no arguments to check what, if anything, is connected before relying on the memory tools again.`,
        );
      return _ === "off"
        ? null
        : wrapInSystemReminder(
            `The user picked a project's shared memory in /memory and the connection is still being set up; nothing is connected yet. Before relying on the ${MEMORY_TOOL_NAMES} tools, call ${MEMORY_LIST_TOOL_NAME} with no arguments: once it lists connected stores, read your teammates' shared memories and save new shared learnings through those tools as their prompts describe. Your personal memory directory, if your system prompt names one, is unaffected either way.`,
          );
    case "disconnected":
    case "unavailable":
      if (!hasOrgMemoryContent(C)) return null;
      return wrapInSystemReminder(
        `This session is no longer connected to ${memoryProjectPromptLabel(C.project)} (${b === "disconnected" ? "the user turned it off in /memory" : x ? "the project the user re-picked is no longer available, so the pick was cleared and nothing connected" : "reconnecting to the re-picked project failed"}). Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, are stale, and nothing is connected for the memory tools to serve until the user reconnects in /memory (${MEMORY_LIST_TOOL_NAME} with no arguments reports what, if anything, is connected whenever you need to re-check). If the user asks you to remember something, use your personal memory directory if your system prompt names one; otherwise explain that project memory is disconnected for this session.`,
      );
    case "switched":
    case "connected": {
      let mapped = v.stores.map((store) =>
        buildMemoryStoreEntry(store.store, store.writable, store.id, store.description),
      );
      let found = mapped.find((V) => !V.readOnly);
      let L =
        found === undefined
          ? `Every connected store is read-only in this session: ${MEMORY_WRITE} calls are refused.`
          : `Save new shared memories in \`${found.id}\` under \`${found.projectDir}\` and keep its index \`${found.indexPath}\` current, as the ${MEMORY_WRITE} tool prompt describes. Private memories belong in your personal memory directory, if your system prompt names one; the shared stores are for what teammates should also see. Never save secrets, credentials or other sensitive data to the shared stores.`;
      return [
        wrapInSystemReminder(
          [
            `The project memory connected to this session has changed: ${x ? `the project the user picked in /memory is no longer available, so ${memoryProjectPromptLabel(v.project)} is connected instead` : v.project.kind === "default" ? "the user picked a project in /memory, and the default project memory is what is now connected" : `the user picked ${memoryProjectPromptLabel(v.project)} in /memory`}.${N}`,
            "",
            `Connected memory stores for the rest of this session \u2014 pass an id as the ${MEMORY_TOOL_NAMES} tools' store argument, and call ${MEMORY_LIST_TOOL_NAME} with no arguments to re-check this set whenever you are unsure:`,
            ...mapped.map(formatMemoryStoreLine),
            "",
            L,
          ].join(`
`),
        ),
        ...T.map(memoryIndexPromptSection),
      ].join(`

`);
    }
  }
}
//@ chunk-c55mbvfz.js:31441-31716 placement
function memoryIndexPromptSection(b) {
  let _ = `/${b.store.promptIndex}`;
  let C = describeMemoryStoreIndex(b.store.id, _);
  switch (b.state) {
    case "unavailable":
      return `(${C} could not be fetched just now \u2014 call ${MEMORY_READ} on it when you need it.)`;
    case "empty":
      return `(${C} is currently empty.)`;
    case "loaded":
      return wrapFetchedMemoryIndex(C, _, b.content);
  }
}
export { switchOrgMemoryProject };
