/**
 * components/memory/OrgMemoryProjectPicker.tsx
 *
 * 2.1.316 新增：组织记忆项目选择、切换与系统提示段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dzt5bmy4.js (24)
 * attribution: placement 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../utils/collections.js";
import { wrapInSystemReminder } from "../../utils/messages.js";
import { describeMemoryStoreIndex, wrapFetchedMemoryIndex } from "../../memdir/memdir.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dzt5bmy4.js:22941-22945 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dzt5bmy4.js:22941", () => {
  init_react_production();
});
//@ chunk-dzt5bmy4.js:23011-23118 placement
var MEMORY_TOOL_NAMES; // deferred: uses BRACKET_CONFUSABLES_2 (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PROJECT_NAME_CHARS;
var BRACKET_CONFUSABLES_REGEX;
var MEMORY_INDEX_FETCH_TIMEOUT_MS;
var MEMORY_SWITCH_TIMEOUT_MS;
deferInit("chunk-dzt5bmy4.js:23011", () => {
  MEMORY_TOOL_NAMES = `${MEMORY_LIST_TOOL_NAME} / ${MEMORY_READ} / ${MEMORY_WRITE}`;
  MAX_PROJECT_NAME_CHARS = 80;
  BRACKET_CONFUSABLES_REGEX = new RegExp(`[${[...BRACKET_CONFUSABLES_2.keys()].join("")}]`, "gu");
  MEMORY_INDEX_FETCH_TIMEOUT_MS = 20000;
  MEMORY_SWITCH_TIMEOUT_MS = 120000;
});
//@ chunk-dzt5bmy4.js:23118-23165 placement
class RequestEpoch {
  latest = 0;
  begin() {
    return ++this.latest;
  }
}
//@ chunk-dzt5bmy4.js:23165-23191 placement
var requestEpochSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dzt5bmy4.js:23165", () => {
  requestEpochSlot = new SessionRootSlot(() => new RequestEpoch());
});
//@ chunk-dzt5bmy4.js:23191-24407 placement
/**
 * 切换/断开当前目录使用的组织记忆项目，等待决定落定并返回结果状态。
 */
async function switchOrgMemoryProject(session, targetKind) {
  try {
    let epochTracker = requestEpochSlot.of(session);
    let epoch = epochTracker.begin();
    let savedPickBefore = targetKind === "project" ? readSavedSelection() : null;
    let accountKeyBefore = selectionAccountKey();
    let before = snapshotOrgMemoryStores();
    let resnapshot = () => {
      before = snapshotOrgMemoryStores();
    };
    let switchPromise =
      targetKind === "off" ? disconnectOrgMemory(resnapshot) : reconnectOrgMemory(resnapshot);
    let switchResult = (await withDeadline(switchPromise, MEMORY_INDEX_FETCH_TIMEOUT_MS)) ?? "timeout";
    if (switchResult !== "timeout" && switchResult.kind === "refused") {
      logMemoryProjectSwitch("refused", before, before, []);
      logFeatureSad("org_memory_project_switch", switchResult.reason);
      return {
        outcome: "refused",
        notice: memoryDeferredText(switchResult.reason),
      };
    }
    let after = snapshotOrgMemoryStores();
    let isPending = switchResult === "timeout" || switchResult.current.state === "undecided";
    let outcome = isPending ? "pending" : memorySwitchOutcome(targetKind, before, after);
    let selection =
      switchResult !== "timeout" && switchResult.current.state === "on"
        ? switchResult.current.request.selection
        : null;
    let selectionDropped =
      !isPending &&
      savedPickBefore !== null &&
      selection !== savedPickBefore &&
      selectionAccountKey() === accountKeyBefore &&
      readSavedSelection() === null;
    applyMemoryWritableState(outcome, before, after);
    let indexes =
      outcome === "switched" || outcome === "connected" ? await loadMemoryStoresContent(after.stores) : [];
    logMemoryProjectSwitch(outcome, before, after, indexes, selectionDropped);
    if (selectionDropped) logFeatureSad("org_memory_project_switch", "selection_dropped");
    else if (outcome === "unavailable" || outcome === "pending")
      logFeatureSad(
        "org_memory_project_switch",
        switchResult === "timeout" ? "switch_deadline" : memoryUnavailableReason(switchResult.current),
      );
    else
      logFeatureOk("org_memory_project_switch", {
        outcome: fromEnum(outcome),
      });
    if (outcome === "pending")
      switchPromise
        .then(() =>
          waitForOrgMemoryDecisionSettled(MEMORY_SWITCH_TIMEOUT_MS, undefined, {
            unref: true,
          }),
        )
        .then(() => {
          if (epoch !== epochTracker.latest) return;
          let settled = snapshotOrgMemoryStores();
          if (hasOrgMemoryContent(before) || settled.stores.length > 0)
            setSharedMemoryServedViaTools(settled.stores.some((store) => store.writable));
        })
        .catch(() => {});
    let orgMemoryPrompt = buildOrgMemoryPrompt(outcome, targetKind, before, after, indexes, selectionDropped);
    return {
      outcome,
      notice: describeMemorySwitchOutcome(outcome, targetKind, before, after, selectionDropped),
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
      notice: memoryNotConnectedText(targetKind),
    };
  }
}
//@ chunk-dzt5bmy4.js:24407-24673 placement
function applyMemoryWritableState(outcome, before, after) {
  switch (outcome) {
    case "switched":
    case "connected":
      setSharedMemoryServedViaTools(after.stores.some((store) => store.writable));
      return;
    case "disconnected":
    case "unavailable":
    case "pending":
      if (hasOrgMemoryContent(before)) setSharedMemoryServedViaTools(false);
      return;
    case "unchanged":
      if (hasOrgMemoryContent(before) || after.stores.length > 0)
        setSharedMemoryServedViaTools(after.stores.some((store) => store.writable));
      return;
  }
}
//@ chunk-dzt5bmy4.js:24673-24730 placement
function hasOrgMemoryContent(snapshot) {
  return snapshot.servedEarlier || snapshot.stores.length > 0;
}
//@ chunk-dzt5bmy4.js:24730-24907 placement
function snapshotOrgMemoryStores() {
  return {
    project: describeMemoryProjectSelection(getOrgMemoryDecision()),
    servedEarlier: getOrgMemoryServedIdentity() !== null,
    stores: sortRootFirst(readableOrgMemoryStores()).map((store) => ({
      id: getStoreScopeLabel(store),
      description: describeStoreScope(store),
      writable: isStoreWritable(store),
      promptIndex: store.promptIndex,
      store,
    })),
  };
}
//@ chunk-dzt5bmy4.js:24907-25212 placement
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
//@ chunk-dzt5bmy4.js:25212-25413 placement
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
//@ chunk-dzt5bmy4.js:25413-25631 placement
function sameMemoryStores(left, right) {
  return (
    left.stores.length === right.stores.length &&
    left.stores.every((store, index) => {
      let otherStore = right.stores[index];
      return (
        otherStore !== undefined &&
        store.id === otherStore.id &&
        store.store.path === otherStore.store.path &&
        store.promptIndex === otherStore.promptIndex &&
        store.writable === otherStore.writable
      );
    })
  );
}
//@ chunk-dzt5bmy4.js:25631-25826 placement
function memorySwitchOutcome(mode, previousSnapshot, currentSnapshot) {
  if (currentSnapshot.stores.length === 0) {
    if (mode === "off") return hasOrgMemoryContent(previousSnapshot) ? "disconnected" : "unchanged";
    return "unavailable";
  }
  if (previousSnapshot.stores.length === 0) return "connected";
  return sameMemoryStores(previousSnapshot, currentSnapshot) ? "unchanged" : "switched";
}
//@ chunk-dzt5bmy4.js:25826-26033 placement
function memoryUnavailableReason(decision) {
  switch (decision.state) {
    case "off":
      return `off_${decision.cause}`;
    case "parked":
      return `parked_${decision.cause}`;
    case "ended":
      return `ended_${decision.cause}`;
    case "undecided":
      return "settle_timeout";
    case "on":
      return "no_stores";
  }
}
//@ chunk-dzt5bmy4.js:26033-26356 placement
async function loadMemoryStoresContent(stores) {
  let filtered = stores.filter((entry) => entry.promptIndex !== undefined);
  let results = await Promise.all(filtered.map((entry) => loadStorePromptIndex(entry.store)));
  return filtered.map((store, index) => {
    let indexResult = results[index];
    if (indexResult === null || indexResult === undefined)
      return {
        store,
        state: "unavailable",
        content: "",
      };
    return indexResult.content.trim() === ""
      ? {
          store,
          state: "empty",
          content: "",
        }
      : {
          store,
          state: "loaded",
          content: indexResult.content,
        };
  });
}
//@ chunk-dzt5bmy4.js:26356-26648 placement
function logMemoryProjectSwitch(outcome, before, after, storeContents, pickDropped = false) {
  logEvent("tengu_org_memory_project_switch", {
    outcome: fromEnum(outcome),
    pick_dropped: pickDropped,
    stores_before: before.stores.length,
    stores_after: after.stores.length,
    indexes_loaded: countWhere(storeContents, (entry) => entry.state === "loaded"),
    indexes_empty: countWhere(storeContents, (entry) => entry.state === "empty"),
    indexes_unavailable: countWhere(storeContents, (entry) => entry.state === "unavailable"),
  });
}
//@ chunk-dzt5bmy4.js:26648-27459 placement
function describeMemorySwitchOutcome(outcome, mode, previousSnapshot, currentSnapshot, isPickDropped) {
  if (isPickDropped) return describeStaleMemoryPick(outcome, currentSnapshot);
  switch (outcome) {
    case "switched":
    case "connected":
      return memoryConnectedText(currentSnapshot);
    case "disconnected":
      return `off for this directory \u2014 Claude has stopped using ${memoryProjectLabel(previousSnapshot.project)}`;
    case "unavailable":
      return previousSnapshot.stores.length > 0
        ? "couldn't connect, so it is off for now \u2014 the pick is kept for this directory; Enter on it in /memory retries"
        : "couldn't connect \u2014 the pick is kept for this directory; Enter on it in /memory retries";
    case "pending":
      return mode === "off"
        ? "off for this directory \u2014 disconnecting once the in-flight connection attempt lands"
        : "saved for this directory \u2014 still connecting; Claude can use it once it lands";
    case "unchanged":
      return mode === "off"
        ? "off for this directory \u2014 nothing was connected"
        : "saved for this directory \u2014 already connected, nothing changed";
  }
}
//@ chunk-dzt5bmy4.js:27459-27695 placement
function memoryNotConnectedText(mode) {
  return mode === "off"
    ? "off for this directory \u2014 the disconnect may not have finished this session; it holds from next session"
    : "couldn't connect \u2014 the pick is kept for this directory; Enter on it in /memory retries";
}
//@ chunk-dzt5bmy4.js:27695-27967 placement
function memoryConnectedText(snapshot) {
  let any = snapshot.stores.some((store) => store.writable);
  let connectionSummary = `connected to ${memoryProjectLabel(snapshot.project)}${any ? "" : " (read-only)"}`;
  let usageNote = any ? "Claude can use it and save to it now" : "Claude can use it now";
  return snapshot.project.kind === "picked"
    ? `${connectionSummary} \u2014 saved for this directory; ${usageNote}`
    : `${connectionSummary} \u2014 ${usageNote}`;
}
//@ chunk-dzt5bmy4.js:27967-28246 placement
function memoryDeferredText(reason) {
  switch (reason) {
    case "account_boundary":
      return "saved for this directory \u2014 the account changed mid-session, so it connects next session";
    case "untrusted_workspace":
      return "saved for this directory \u2014 this workspace is not trusted yet, so it connects next session";
  }
}
//@ chunk-dzt5bmy4.js:28246-28688 placement
function describeStaleMemoryPick(outcome, snapshot) {
  switch (outcome) {
    case "switched":
    case "connected":
      return `${"that project is no longer available \u2014 the pick was cleared"}; ${memoryConnectedText(snapshot)}`;
    case "unchanged":
      return `${"that project is no longer available \u2014 the pick was cleared"}; connection unchanged`;
    case "unavailable":
    case "disconnected":
    case "pending":
      return `${"that project is no longer available \u2014 the pick was cleared"}; project memory is off until another pick in /memory`;
  }
}
//@ chunk-dzt5bmy4.js:28688-28851 placement
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
//@ chunk-dzt5bmy4.js:28851-29104 placement
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
//@ chunk-dzt5bmy4.js:29104-32633 placement
/**
 * 生成组织记忆项目的系统提示段（最近项目、已连接存储列表、读写说明）。
 */
function buildOrgMemoryPrompt(
  outcome,
  mode,
  previousSnapshot,
  currentSnapshot,
  storeContents,
  isPickDropped = false,
) {
  let recentProjectNote =
    previousSnapshot.stores.length > 0
      ? ` \u2014 most recently ${memoryProjectPromptLabel(previousSnapshot.project)}`
      : "";
  let stalenessNotice = hasOrgMemoryContent(previousSnapshot)
    ? ` Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, describe an earlier connection${recentProjectNote}, possibly to a different project. Treat them as stale until re-checked with the tools: do not attribute those memories to, or save them into, the project connected now on the strength of the earlier results alone. Your personal memory directory, if your system prompt names one, is unaffected.`
    : "";
  switch (outcome) {
    case "unchanged":
      return null;
    case "pending":
      if (hasOrgMemoryContent(previousSnapshot))
        return wrapInSystemReminder(
          `This session is no longer connected to ${memoryProjectPromptLabel(previousSnapshot.project)} (a re-pick in /memory is still being applied). Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, are stale. Call ${MEMORY_LIST_TOOL_NAME} with no arguments to check what, if anything, is connected before relying on the memory tools again.`,
        );
      return mode === "off"
        ? null
        : wrapInSystemReminder(
            `The user picked a project's shared memory in /memory and the connection is still being set up; nothing is connected yet. Before relying on the ${MEMORY_TOOL_NAMES} tools, call ${MEMORY_LIST_TOOL_NAME} with no arguments: once it lists connected stores, read your teammates' shared memories and save new shared learnings through those tools as their prompts describe. Your personal memory directory, if your system prompt names one, is unaffected either way.`,
          );
    case "disconnected":
    case "unavailable":
      if (!hasOrgMemoryContent(previousSnapshot)) return null;
      return wrapInSystemReminder(
        `This session is no longer connected to ${memoryProjectPromptLabel(previousSnapshot.project)} (${outcome === "disconnected" ? "the user turned it off in /memory" : isPickDropped ? "the project the user re-picked is no longer available, so the pick was cleared and nothing connected" : "reconnecting to the re-picked project failed"}). Any connected memory store list or shared memory index your system prompt may carry, and any ${MEMORY_TOOL_NAMES} results earlier in this conversation, are stale, and nothing is connected for the memory tools to serve until the user reconnects in /memory (${MEMORY_LIST_TOOL_NAME} with no arguments reports what, if anything, is connected whenever you need to re-check). If the user asks you to remember something, use your personal memory directory if your system prompt names one; otherwise explain that project memory is disconnected for this session.`,
      );
    case "switched":
    case "connected": {
      let mapped = currentSnapshot.stores.map((store) =>
        buildMemoryStoreEntry(store.store, store.writable, store.id, store.description),
      );
      let found = mapped.find((storeEntry) => !storeEntry.readOnly);
      let writeInstructions =
        found === undefined
          ? `Every connected store is read-only in this session: ${MEMORY_WRITE} calls are refused.`
          : `Save new shared memories in \`${found.id}\` under \`${found.projectDir}\` and keep its index \`${found.indexPath}\` current, as the ${MEMORY_WRITE} tool prompt describes. Private memories belong in your personal memory directory, if your system prompt names one; the shared stores are for what teammates should also see. Never save secrets, credentials or other sensitive data to the shared stores.`;
      return [
        wrapInSystemReminder(
          [
            `The project memory connected to this session has changed: ${isPickDropped ? `the project the user picked in /memory is no longer available, so ${memoryProjectPromptLabel(currentSnapshot.project)} is connected instead` : currentSnapshot.project.kind === "default" ? "the user picked a project in /memory, and the default project memory is what is now connected" : `the user picked ${memoryProjectPromptLabel(currentSnapshot.project)} in /memory`}.${stalenessNotice}`,
            "",
            `Connected memory stores for the rest of this session \u2014 pass an id as the ${MEMORY_TOOL_NAMES} tools' store argument, and call ${MEMORY_LIST_TOOL_NAME} with no arguments to re-check this set whenever you are unsure:`,
            ...mapped.map(formatMemoryStoreLine),
            "",
            writeInstructions,
          ].join(`
`),
        ),
        ...storeContents.map(memoryIndexPromptSection),
      ].join(`

`);
    }
  }
}
//@ chunk-dzt5bmy4.js:32633-32908 placement
function memoryIndexPromptSection(storeContent) {
  let promptPath = `/${storeContent.store.promptIndex}`;
  let indexLabel = describeMemoryStoreIndex(storeContent.store.id, promptPath);
  switch (storeContent.state) {
    case "unavailable":
      return `(${indexLabel} could not be fetched just now \u2014 call ${MEMORY_READ} on it when you need it.)`;
    case "empty":
      return `(${indexLabel} is currently empty.)`;
    case "loaded":
      return wrapFetchedMemoryIndex(indexLabel, promptPath, storeContent.content);
  }
}
export { switchOrgMemoryProject };
