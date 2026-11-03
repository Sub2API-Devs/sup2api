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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { MEMORY_LIST_TOOL_NAME, MEMORY_READ, MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { BRACKET_CONFUSABLES, escapeXmlText } from "../../utils/sanitization.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { readSavedSelection, Jpe, yPe } from "../../services/orgMemory/selection.js";
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
import { mwe, buildMemoryStoreEntry, formatMemoryStoreLine } from "../../memdir/memoryStoresPrompt.js";
import { clearOrgMemoryCredential } from "../../services/orgMemory/credential.js";
import { logError } from "../../utils/log.js";
import {
  sortRootFirst,
  getStoreScopeLabel,
  describeStoreScope,
} from "../../services/orgMemory/storeLabels.js";
import { Qpe, CAt } from "../../services/memorySync/availability.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { loadStorePromptIndex } from "../../services/orgMemory/promptIndex.js";
import { logEvent } from "../../services/analytics/index.js";
import { count } from "../../utils/collections.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { describeMemoryStoreIndex, wrapFetchedMemoryIndex } from "../../memdir/memdir.js";

//@ chunk-c55mbvfz.js:21749-21753 placement
j();
//@ chunk-c55mbvfz.js:21819-21926 placement
var MEMORY_TOOL_NAMES = `${MEMORY_LIST_TOOL_NAME} / ${MEMORY_READ} / ${MEMORY_WRITE}`,
  MAX_PROJECT_NAME_CHARS = 80,
  BRACKET_CONFUSABLES_REGEX = new RegExp(`[${[...BRACKET_CONFUSABLES.keys()].join("")}]`, "gu"),
  MEMORY_INDEX_FETCH_TIMEOUT_MS = 20000,
  MEMORY_SWITCH_TIMEOUT_MS = 120000;
//@ chunk-c55mbvfz.js:21926-21973 placement
class Yo {
  latest = 0;
  begin() {
    return ++this.latest;
  }
}
//@ chunk-c55mbvfz.js:21973-21999 placement
var Jt = new SessionRootSlot(() => new Yo());
/**
 * 切换/断开当前目录使用的组织记忆项目，等待决定落定并返回结果状态。
 */
//@ chunk-c55mbvfz.js:21999-23215 placement
async function switchOrgMemoryProject(b, _) {
  try {
    let of = Jt.of(b),
      begin = of.begin(),
      T = _ === "project" ? readSavedSelection() : null,
      x = Jpe(),
      D = snapshotOrgMemoryStores(),
      N = () => {
        D = snapshotOrgMemoryStores();
      },
      B = _ === "off" ? disconnectOrgMemory(N) : reconnectOrgMemory(N),
      I = (await withDeadline(B, MEMORY_INDEX_FETCH_TIMEOUT_MS)) ?? "timeout";
    if (I !== "timeout" && I.kind === "refused")
      return (
        logMemoryProjectSwitch("refused", D, D, []),
        logFeatureSad("org_memory_project_switch", I.reason),
        { outcome: "refused", notice: memoryDeferredText(I.reason) }
      );
    let L = snapshotOrgMemoryStores(),
      U = I === "timeout" || I.current.state === "undecided",
      V = U ? "pending" : memorySwitchOutcome(_, D, L),
      ee = I !== "timeout" && I.current.state === "on" ? I.current.request.selection : null,
      Y = !U && T !== null && ee !== T && Jpe() === x && readSavedSelection() === null;
    applyMemoryWritableState(V, D, L);
    let K = V === "switched" || V === "connected" ? await loadMemoryStoresContent(L.stores) : [];
    if ((logMemoryProjectSwitch(V, D, L, K, Y), Y))
      logFeatureSad("org_memory_project_switch", "selection_dropped");
    else if (V === "unavailable" || V === "pending")
      logFeatureSad(
        "org_memory_project_switch",
        I === "timeout" ? "switch_deadline" : memoryUnavailableReason(I.current),
      );
    else logFeatureOk("org_memory_project_switch", { outcome: fromEnum(V) });
    if (V === "pending")
      B.then(() => waitForOrgMemoryDecisionSettled(MEMORY_SWITCH_TIMEOUT_MS, void 0, { unref: !0 }))
        .then(() => {
          if (begin !== of.latest) return;
          let H = snapshotOrgMemoryStores();
          if (pe(D) || H.stores.length > 0) mwe(H.stores.some((store) => store.writable));
        })
        .catch(() => {});
    let X = buildOrgMemoryPrompt(V, _, D, L, K, Y);
    return {
      outcome: V,
      notice: describeMemorySwitchOutcome(V, _, D, L, Y),
      ...(X !== null && { modelMessage: X }),
    };
  } catch (error) {
    return (
      shrinkOrgMemoryDecisionWriteAsk(),
      clearOrgMemoryCredential(),
      logError(error),
      logFeatureBad("org_memory_project_switch", "unexpected_throw"),
      { outcome: "unavailable", notice: memoryNotConnectedText(_) }
    );
  }
}
//@ chunk-c55mbvfz.js:23215-23481 placement
function applyMemoryWritableState(b, _, C) {
  switch (b) {
    case "switched":
    case "connected":
      mwe(C.stores.some((store) => store.writable));
      return;
    case "disconnected":
    case "unavailable":
    case "pending":
      if (pe(_)) mwe(!1);
      return;
    case "unchanged":
      if (pe(_) || C.stores.length > 0) mwe(C.stores.some((store) => store.writable));
      return;
  }
}
//@ chunk-c55mbvfz.js:23481-23538 placement
function pe(b) {
  return b.servedEarlier || b.stores.length > 0;
}
//@ chunk-c55mbvfz.js:23538-23715 placement
function snapshotOrgMemoryStores() {
  return {
    project: describeMemoryProjectSelection(getOrgMemoryDecision()),
    servedEarlier: getOrgMemoryServedIdentity() !== null,
    stores: sortRootFirst(Qpe()).map((b) => ({
      id: getStoreScopeLabel(b),
      description: describeStoreScope(b),
      writable: CAt(b),
      promptIndex: b.promptIndex,
      store: b,
    })),
  };
}
//@ chunk-c55mbvfz.js:23715-24020 placement
function describeMemoryProjectSelection(b) {
  if (b.state !== "on") return { kind: "none" };
  let selection = b.request.selection;
  if (selection === null || b.selectionSource !== "preference") return { kind: "default" };
  if (yPe(selection)) return { kind: "picked", name: "all public projects" };
  let C = getOrgMemoryPickerData()?.candidates.find((v) => v.id === selection);
  return { kind: "picked", name: C === void 0 ? null : sanitizeProjectName(C.name) };
}
//@ chunk-c55mbvfz.js:24020-24221 placement
function sanitizeProjectName(b) {
  let trimmed = isNetworkPath(b)
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
        T !== void 0 &&
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
    if (b === "off") return pe(_) ? "disconnected" : "unchanged";
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
async function loadMemoryStoresContent(b) {
  let filtered = b.filter((v) => v.promptIndex !== void 0),
    results = await Promise.all(filtered.map((v) => loadStorePromptIndex(v.store)));
  return filtered.map((v, T) => {
    let x = results[T];
    if (x === null || x === void 0) return { store: v, state: "unavailable", content: "" };
    return x.content.trim() === ""
      ? { store: v, state: "empty", content: "" }
      : { store: v, state: "loaded", content: x.content };
  });
}
//@ chunk-c55mbvfz.js:25164-25456 placement
function logMemoryProjectSwitch(b, _, C, v, T = !1) {
  logEvent("tengu_org_memory_project_switch", {
    outcome: fromEnum(b),
    pick_dropped: T,
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
  let any = b.stores.some((store) => store.writable),
    C = `connected to ${memoryProjectLabel(b.project)}${any ? "" : " (read-only)"}`,
    v = any ? "Claude can use it and save to it now" : "Claude can use it now";
  return b.project.kind === "picked" ? `${C} \u2014 saved for this directory; ${v}` : `${C} \u2014 ${v}`;
}
//@ chunk-c55mbvfz.js:26775-27054 placement
function memoryDeferredText(b) {
  switch (b) {
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
function memoryProjectLabel(b) {
  switch (b.kind) {
    case "none":
      return "project memory";
    case "default":
      return "the default project memory";
    case "picked":
      return b.name ?? "the picked project";
  }
}
//@ chunk-c55mbvfz.js:27659-27912 placement
function memoryProjectPromptLabel(b) {
  switch (b.kind) {
    case "none":
      return "project memory";
    case "default":
      return "the default project memory";
    case "picked":
      return b.name === null
        ? "a project with no displayable name"
        : `project "${escapeXmlText(b.name).replace(BRACKET_CONFUSABLES_REGEX, (_) => `&#${_.codePointAt(0)};`)}"`;
  }
}
/**
 * 生成组织记忆项目的系统提示段（最近项目、已连接存储列表、读写说明）。
 */
//@ chunk-c55mbvfz.js:27912-31441 placement
function buildOrgMemoryPrompt(b, _, C, v, T, x = !1) {
  let D = C.stores.length > 0 ? ` \u2014 most recently ${memoryProjectPromptLabel(C.project)}` : "",
    N = pe(C)
      ? ` Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, describe an earlier connection${D}, possibly to a different project. Treat them as stale until re-checked with the tools: do not attribute those memories to, or save them into, the project connected now on the strength of the earlier results alone. Your personal memory directory, if your system prompt names one, is unaffected.`
      : "";
  switch (b) {
    case "unchanged":
      return null;
    case "pending":
      if (pe(C))
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
      if (!pe(C)) return null;
      return wrapInSystemReminder(
        `This session is no longer connected to ${memoryProjectPromptLabel(C.project)} (${b === "disconnected" ? "the user turned it off in /memory" : x ? "the project the user re-picked is no longer available, so the pick was cleared and nothing connected" : "reconnecting to the re-picked project failed"}). Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, are stale, and nothing is connected for the memory tools to serve until the user reconnects in /memory (${MEMORY_LIST_TOOL_NAME} with no arguments reports what, if anything, is connected whenever you need to re-check). If the user asks you to remember something, use your personal memory directory if your system prompt names one; otherwise explain that project memory is disconnected for this session.`,
      );
    case "switched":
    case "connected": {
      let mapped = v.stores.map((store) =>
          buildMemoryStoreEntry(store.store, store.writable, store.id, store.description),
        ),
        found = mapped.find((V) => !V.readOnly),
        L =
          found === void 0
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
  let _ = `/${b.store.promptIndex}`,
    C = describeMemoryStoreIndex(b.store.id, _);
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
