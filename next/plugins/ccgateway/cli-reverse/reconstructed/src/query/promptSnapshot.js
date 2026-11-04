/**
 * query/promptSnapshot.ts
 *
 * 2.1.316 新增：计算本次请求的提示快照（实时/快照/继承来源）；记录本回合发送的工具描述等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (32)
 * attribution: placement 32
 */
import { isDeepStrictEqual } from "util";
import { logError } from "../utils/log.js";
import { FOREIGN_ORG_THINKING_NOTICE } from "../constants/messages.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import {
  isAnthropicAuthEnabled,
  isHostManagedProviderAuth,
  getStoredOauthAccountInfo,
} from "../utils/auth.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { env } from "../utils/env.js";
import { usableLauncherHostLoginToken } from "../utils/auth/launcherHostLogin.js";
import { getOAuthTokenFromFileDescriptor } from "../utils/authFileDescriptor.js";
import { isOauthTokenFromBgSnapshot, getSystemPromptSectionEpoch } from "../bootstrap/state.js";
import { createAttachmentMessage_2 } from "../utils/debug.js";
import { isModelCapabilityEnabled } from "../utils/model/promptBundles.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { createInformationalSystemMessage } from "../utils/messages.js";
import { isHookDescribed, redescribeEpoch } from "../services/api/toolDescriptionCache.js";
import { toError } from "../utils/errors.js";
import { identity } from "../utils/identity.js";
import {
  hashSystemPrompt,
  pickWireShape,
  snapshotIfEnabled,
  shouldSnapshotSystemPrompt,
  isRenderPointNewer,
  isPromptSnapshotFeatureOn,
  snapshotToolEntries,
  dropSystemTurnsAnsweredBy,
  promptSnapshotUnlessRenderPoint,
  setModelRenderPoint,
  recordedDeferredTools,
} from "../utils/contextAttachments/promptSnapshot.js";
import { sectionAnswers } from "../plugins/functionHooks/promptComposition.js";
import { asSystemPrompt } from "../utils/systemPromptType.js";
import { resolveReminderFold, isThreadStateFeatureOn } from "../utils/contextAttachments/threadState.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { getEchoWireToolInputsState, isServerClassifierEnabled } from "../utils/wireToolInputEcho.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { isToolSearchLockedOffByDefault } from "../utils/toolSearch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:129854-129924 placement
/**
 * 是否被放回
 */
function wasPutBackSafe(messageQueue, uuid) {
  try {
    return messageQueue.wasPutBack(uuid);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:129924-129981 placement
/**
 * 打开重新入队窗口
 */
function startRequeueWindowSafe(messageQueue) {
  try {
    messageQueue.startRequeueWindow();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:129981-130032 placement
/**
 * 标记已被取走
 */
function settleTakenSafe(messageQueue) {
  try {
    messageQueue.settleTaken();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:130032-130465 placement
/**
 * 切换组织后之前的思考内容不可用的说明文本。
 */
var CROSS_ORG_THINKING_NOTICE = `${FOREIGN_ORG_THINKING_NOTICE}
Claude's earlier thinking was written while you were signed in to another organization, so Claude can't use it now. It isn't deleted: resume this session signed in to that organization to use it again. Claude's next responses may be slower and use more tokens because it has to reread this session and generate new thinking. See docs for more: https://platform.claude.com/docs/en/build-with-claude/preserved-thinking`;
//@ chunk-ha3km179.js:130465-131326 placement
/**
 * 检测跨组织的思考块并生成说明附件。
 */
function crossOrgThinkingAttachments(messagesForQuery, { querySource, mainThread, model, stamp }) {
  if (classifyQuerySource(querySource) === "auxiliary") return [];
  try {
    if (!isAnthropicAuthEnabled()) return [];
    let lower = normalizeUuidOrNull(
      env.CLAUDE_CODE_OAUTH_TOKEN ||
        usableLauncherHostLoginToken() !== null ||
        (getOAuthTokenFromFileDescriptor() && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
        ? env.CLAUDE_CODE_ORGANIZATION_UUID
        : getStoredOauthAccountInfo()?.organizationUuid,
    )?.toLowerCase();
    let organizationUuid = messagesForQuery.findLast(
      (message) => message.type === "attachment" && message.attachment?.type === "credential_org",
    )?.attachment.organizationUuid;
    if (lower === undefined || lower === organizationUuid) return [];
    let attachmentMessage = createAttachmentMessage_2(
      {
        type: "credential_org",
        organizationUuid: lower,
      },
      stamp,
    );
    if (typeof organizationUuid !== "string") return [attachmentMessage];
    let warnThinking =
      mainThread &&
      messagesForQuery.some(
        (message) =>
          message.type === "assistant" &&
          Array.isArray(message.message?.content) &&
          message.message.content.some(
            (block) => block?.type === "thinking" || block?.type === "redacted_thinking",
          ),
      ) &&
      isModelCapabilityEnabled("org_locked_thinking", getCanonicalName(model), model) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_lexical_glade", false);
    logFeatureOk("context_credential_org_change", {
      warned: warnThinking,
    });
    return warnThinking
      ? [attachmentMessage, createInformationalSystemMessage(CROSS_ORG_THINKING_NOTICE, "warning")]
      : [attachmentMessage];
  } catch (error) {
    logError(error);
    logFeatureSad("context_credential_org_change", "record_failed");
    return [];
  }
}
//@ chunk-ha3km179.js:131368-131398 placement
/**
 * 无待发工具描述
 */
var EMPTY_TOOL_STANDING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:131368", () => {
  EMPTY_TOOL_STANDING = {
    epoch: 0,
    owed: new Set(),
  };
});
//@ chunk-ha3km179.js:131398-132074 placement
/**
 * 跟踪工具描述的待发送状态。
 */
function createToolDescriptionStandings() {
  let state = {
    standings: new WeakMap(),
  };
  function redescribing(promptRender, epoch) {
    try {
      if (promptRender === undefined || promptRender.toolDescriptions.size === 0)
        return epoch > 0
          ? {
              names: EMPTY_TOOL_STANDING.owed,
              epoch,
            }
          : undefined;
      let standing = state.standings.get(promptRender.record) ?? EMPTY_TOOL_STANDING;
      let newEpoch = epoch > standing.epoch;
      if (!newEpoch && standing.owed.size === 0) return;
      let filtered = [...promptRender.toolDescriptions.keys()].filter(
        newEpoch ? isHookDescribed : (toolName) => standing.owed.has(toolName),
      );
      return newEpoch || filtered.length > 0
        ? {
            names: new Set(filtered),
            epoch: Math.max(epoch, standing.epoch),
          }
        : undefined;
    } catch (error) {
      logError(toError(error));
      return;
    }
  }
  let noteRedescribed = (record, target, sentNames) =>
    void state.standings.set(record, {
      epoch: target.epoch,
      owed: new Set([...target.names].filter((toolName) => !sentNames.has(toolName))),
    });
  function copyCounters(fromRecord, toRecord) {
    let standing = state.standings.get(fromRecord);
    if (standing !== undefined) state.standings.set(toRecord, standing);
  }
  return {
    redescribing,
    noteRedescribed,
    noteCopied: copyCounters,
    forgetStandings: () => {
      state.standings = new WeakMap();
    },
  };
}
//@ chunk-ha3km179.js:132074-132115 placement
/**
 * 工具描述待发状态
 */
var toolDescriptionStandings; // deferred: uses createToolDescriptionStandings of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ha3km179.js:132074", () => {
  toolDescriptionStandings = identity(createToolDescriptionStandings(), (standings) =>
    standings.forgetStandings(),
  );
});
//@ chunk-ha3km179.js:132115-132198 placement
/**
 * 需要重新描述时的代次
 */
function redescribeEpochFor(options) {
  try {
    return options.settingsHooksOff ? undefined : redescribeEpoch();
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-ha3km179.js:132198-132208 placement
/**
 * 16
 */
var MAX_PROMPT_HASHES = 16;
//@ chunk-ha3km179.js:132208-132818 placement
/**
 * 记录最近的系统提示哈希（有上限）。
 */
function createSystemPromptHistory() {
  let history = new Map();
  function remember(hash, answers) {
    history.delete(hash);
    history.set(hash, answers);
    for (let key of [...history.keys()].slice(0, -MAX_PROMPT_HASHES)) history.delete(key);
  }
  function owedPrompt(promptRender, systemPrompt, snapshot) {
    try {
      let held = history.get(promptRender.systemPromptHash);
      if (snapshot === undefined || !snapshot.isFresh) return;
      if (held === undefined) {
        remember(promptRender.systemPromptHash, snapshot.answers);
        return;
      }
      let changed = changedSectionAnswers(held, snapshot.answers);
      let prompt = diffPromptSections(promptRender.systemPrompt, systemPrompt, [...changed.values()]);
      if (prompt !== undefined || held === "behind")
        remember(
          prompt === undefined ? promptRender.systemPromptHash : hashSystemPrompt(prompt),
          resolveHeldAnswers({
            held,
            answers: snapshot.answers,
            owed: changed,
            sent: prompt,
          }),
        );
      return prompt;
    } catch (error) {
      logError(toError(error));
      return;
    }
  }
  return {
    owedPrompt,
    noteRendered: (hash, snapshot) => {
      if (snapshot !== undefined) remember(hash, snapshot.isFresh ? snapshot.answers : "behind");
    },
    notedCount: () => history.size,
    forgetStandings: () => history.clear(),
  };
}
//@ chunk-ha3km179.js:132818-132859 placement
/**
 * 系统提示哈希历史
 */
var systemPromptHistory; // deferred: uses createSystemPromptHistory of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ha3km179.js:132818", () => {
  systemPromptHistory = identity(createSystemPromptHistory(), (history) => history.forgetStandings());
});
//@ chunk-ha3km179.js:132859-132999 placement
function sectionAnswersSnapshot(toolUseContext, promptRenderEpoch) {
  try {
    return !toolUseContext.options.settingsHooksOff && toolUseContext.agentId === undefined
      ? {
          isFresh: promptRenderEpoch === getSystemPromptSectionEpoch(),
          answers: sectionAnswers(),
        }
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-ha3km179.js:132999-133035 placement
/**
 * 空串转 null
 */
function nonEmptyOrNull(text) {
  return text === "" ? null : text;
}
//@ chunk-ha3km179.js:133035-133306 placement
function changedSectionAnswers(held, answers) {
  return new Map(
    [...answers].flatMap(([hash, answer]) => {
      let before = held === "behind" ? undefined : held.get(hash);
      let after = nonEmptyOrNull(answer.answer);
      let beforeAnswer = before === undefined ? undefined : nonEmptyOrNull(before.answer);
      let answerChanged = before !== undefined && beforeAnswer !== nonEmptyOrNull(before.text);
      let textChanged = after !== nonEmptyOrNull(answer.text);
      return after !== beforeAnswer &&
        (answerChanged || textChanged) &&
        (after !== null || typeof beforeAnswer === "string")
        ? [
            [
              hash,
              {
                before: beforeAnswer,
                after,
              },
            ],
          ]
        : [];
    }),
  );
}
//@ chunk-ha3km179.js:133306-133587 placement
function resolveHeldAnswers({ held, answers, owed, sent }) {
  return new Map(
    [...answers].flatMap(([hash, answer]) => {
      let owedEntry = owed.get(hash);
      let heldEntry = held === "behind" ? undefined : held.get(hash);
      let removedButNotSent = owedEntry?.after === null && sent?.includes(owedEntry.before ?? "") === false;
      let insertedAndSent = typeof owedEntry?.after === "string" && sent?.includes(owedEntry.after) === true;
      let chosen = removedButNotSent || insertedAndSent ? answer : heldEntry;
      return chosen === undefined ? [] : [[hash, chosen]];
    }),
  );
}
//@ chunk-ha3km179.js:133587-134155 placement
/**
 * 比较两版提示段落的顺序与增删。
 */
function diffPromptSections(parts, nextPrompt, edits) {
  let prevIndex = indexParts(parts);
  let nextIndex = indexParts(nextPrompt);
  let filtered = parts.filter(
    (part) => part !== "" && prevIndex.counts.get(part) === 1 && nextIndex.counts.get(part) === 1,
  );
  let mapped = filtered.map((part) => nextIndex.places.get(part) ?? -1);
  let all = mapped.every((position, index) => index === 0 || (mapped[index - 1] ?? position) < position);
  let edits_2 = edits.flatMap(({ before, after }) => {
    let beforeUnsent =
      typeof before === "string" && prevIndex.counts.get(before) === 1 && !nextIndex.counts.has(before);
    return after === null && !beforeUnsent
      ? []
      : [
          {
            before: beforeUnsent || before === null ? before : undefined,
            after,
          },
        ];
  });
  let flattened = [...filtered, undefined].flatMap((part, index) => {
    let previousPart = filtered[index - 1];
    let applied = applyPromptSectionEdits(
      partsBetween(prevIndex, previousPart, part),
      partsBetween(nextIndex, previousPart, part),
      edits_2,
    );
    return part === undefined ? applied : [...applied, part];
  });
  let filtered_2 = flattened.filter((part) => part !== "");
  let filtered_3 = parts.filter((originalPart) => originalPart !== "");
  let isUnchanged =
    filtered_2.length === filtered_3.length && filtered_2.every((part, index) => part === filtered_3[index]);
  return !all || isUnchanged ? undefined : asSystemPrompt(flattened);
}
//@ chunk-ha3km179.js:134155-134291 placement
function indexParts(parts) {
  let counts = new Map();
  let places = new Map();
  for (let [index, part] of parts.entries()) {
    counts.set(part, (counts.get(part) ?? 0) + 1);
    places.set(part, index);
  }
  return {
    parts,
    counts,
    places,
  };
}
//@ chunk-ha3km179.js:134291-134411 placement
function partsBetween(index, fromPart, toPart) {
  return index.parts.slice(
    fromPart === undefined ? 0 : (index.places.get(fromPart) ?? -1) + 1,
    toPart === undefined ? index.parts.length : index.places.get(toPart),
  );
}
//@ chunk-ha3km179.js:134411-134491 placement = formatSnippet (0.806)
function formatSnippet(parts, edits, before) {
  return parts.filter((part) => edits.some((edit) => edit.after === part && edit.before === before));
}
//@ chunk-ha3km179.js:134491-134854 placement = formatSnippet (0.806)
/**
 * 应用提示段落编辑。
 */
function applyPromptSectionEdits(prevParts, nextParts, edits) {
  let parts = nextParts.filter((part) => part !== "");
  let edits_2 = edits.filter((edit) => edit.after === null || parts.includes(edit.after));
  let flattened = prevParts.flatMap((part) => {
    let found = edits_2.find((edit) => edit.before === part);
    return found === undefined ? [part] : (found.after ?? []);
  });
  let filtered = prevParts.filter((part) => part !== "" && !edits_2.some((edit) => edit.before === part));
  let keptInserted = formatSnippet(parts, edits_2, undefined);
  return parts.every((part) => edits_2.some((edit) => edit.after === part)) &&
    filtered.length === keptInserted.length &&
    (keptInserted.length > 0 || formatSnippet(parts, edits_2, null).length > 0)
    ? parts
    : flattened;
}
//@ chunk-ha3km179.js:134854-134932 placement
/**
 * 非 bareFork 且辅助查询以外的
 */
function isRedescribable({ options, querySource }) {
  return !options.bareFork && classifyQuerySource(querySource) !== "auxiliary";
}
//@ chunk-ha3km179.js:134932-135162 placement
function recordReminderFold(carriedForward, inheritedFold) {
  let { fold, cached } = resolveReminderFold(inheritedFold);
  try {
    logEvent("tengu_reminder_fold_recorded", {
      recorded: fold !== undefined,
      ...(fold !== undefined && {
        fold,
      }),
      carriedForward,
      inherited: inheritedFold !== undefined,
      cached: cached.value,
      cachedSource: fromEnum(cached.source),
    });
  } catch (error) {
    logError(error);
  }
  return fold;
}
//@ chunk-ha3km179.js:135162-135257 placement
/**
 * 线形相关字段
 */
var REQUEST_SHAPE_KEYS = [
  "systemTurns",
  "toolChangeHeader",
  "inlineTools",
  "keptReminders",
  "toolResultSafeguards",
];
//@ chunk-ha3km179.js:135257-135920 placement
/**
 * 应用请求线形（systemTurns、toolChangeHeader、inlineTools 等）。
 */
function applyWireShape(wireShape, wireShape_2) {
  if (wireShape_2 === undefined || !isFoamySpringEnabled())
    return {
      wireShape,
      changed: false,
    };
  let merged = pickWireShape({
    systemTurns: wireShape_2.systemTurns ?? wireShape.systemTurns,
    toolChangeHeader: wireShape_2.toolChangeHeader ?? wireShape.toolChangeHeader,
    inlineTools: wireShape_2.inlineTools ?? wireShape.inlineTools,
    keptReminders: wireShape_2.keptReminders ?? wireShape.keptReminders,
    toolResultSafeguards: wireShape_2.toolResultSafeguards ?? wireShape.toolResultSafeguards,
    systemTurnsAnsweredBy: wireShape_2.systemTurnsAnsweredBy ?? wireShape.systemTurnsAnsweredBy,
  });
  let any = REQUEST_SHAPE_KEYS.some((key) => merged[key] !== wireShape[key]);
  if (any)
    try {
      let { systemTurnsAnsweredBy, ...loggedShape } = merged;
      logEvent("tengu_wire_shape_recorded", {
        ...loggedShape,
        overwrote: REQUEST_SHAPE_KEYS.some(
          (key) => wireShape[key] !== undefined && merged[key] !== wireShape[key],
        ),
      });
    } catch (error) {
      logError(error);
    }
  return {
    wireShape: merged,
    changed: any || merged.systemTurnsAnsweredBy !== wireShape.systemTurnsAnsweredBy,
  };
}
//@ chunk-ha3km179.js:135920-136157 placement
function recordWireToolInputEcho(carriedForward, inheritedEcho) {
  let { echo, cached } = getEchoWireToolInputsState(inheritedEcho);
  try {
    logEvent("tengu_wire_tool_input_echo_recorded", {
      recorded: echo !== undefined,
      ...(echo !== undefined && {
        echo,
      }),
      carriedForward,
      inherited: inheritedEcho !== undefined,
      cached: cached.value,
      cachedSource: fromEnum(cached.source),
    });
  } catch (error) {
    logError(error);
  }
  return echo;
}
//@ chunk-ha3km179.js:136157-136294 placement
function recordContextRendering(carriedForward, contextRendering) {
  if (contextRendering === undefined) return;
  try {
    logEvent("tengu_context_rendering_recorded", {
      rendering: fromEnum(contextRendering),
      carriedForward,
    });
  } catch (error) {
    logError(error);
  }
  return contextRendering;
}
//@ chunk-ha3km179.js:136294-136722 placement
/**
 * 记录提示快照并处理复制关系。
 */
function recordPromptSnapshot(messages, systemPrompt, options) {
  let promptSnapshot = resolvePromptSnapshot(messages, systemPrompt, options);
  try {
    let existingSnapshot = snapshotIfEnabled(messages, options.options);
    if (existingSnapshot !== undefined && promptSnapshot.record?.attachment.type === "prompt_snapshot")
      toolDescriptionStandings.noteCopied(existingSnapshot.record, promptSnapshot.record.attachment);
    if (promptSnapshot.source === "live_recorded" && promptSnapshot.snapshotHash && !promptSnapshot.rewritten)
      systemPromptHistory.noteRendered(promptSnapshot.snapshotHash, options.turnSections);
    let redescribing =
      options.toolDescribeEpoch !== undefined && isRedescribable(options)
        ? toolDescriptionStandings.redescribing(existingSnapshot, options.toolDescribeEpoch)
        : undefined;
    return redescribing === undefined
      ? promptSnapshot
      : {
          ...promptSnapshot,
          redescribing,
        };
  } catch (error) {
    logError(error);
    return promptSnapshot;
  }
}
//@ chunk-ha3km179.js:136722-138963 placement
/**
 * 计算本次请求的提示快照（实时/快照/继承来源）。
 */
function resolvePromptSnapshot(
  messages,
  systemPrompt,
  {
    resumeActive,
    stamp,
    inheritedReminderFold,
    inheritedWireShape,
    inheritedEchoWireToolInputs,
    contextRendering,
    turnSections,
    ...options
  },
) {
  let emptySnapshot = {
    systemPrompt,
    toolDescriptions: undefined,
    toolEntries: undefined,
    toolServers: undefined,
    recordedCliPrefix: undefined,
    recordedWireShape: undefined,
    record: undefined,
    source: "live_unrecorded",
    snapshotHash: undefined,
  };
  try {
    if (!shouldSnapshotSystemPrompt(options.options)) return emptySnapshot;
    let snapshot = snapshotIfEnabled(messages, options.options);
    let renderPointNewer = snapshot !== undefined && isRenderPointNewer(messages);
    let rewrittenPrompt =
      snapshot !== undefined &&
      !renderPointNewer &&
      !resumeActive &&
      isRedescribable(options) &&
      classifyQuerySource(options.querySource) === "main"
        ? systemPromptHistory.owedPrompt(snapshot, systemPrompt, turnSections)
        : undefined;
    let wasRewritten = rewrittenPrompt !== undefined;
    let needsRender = renderPointNewer || wasRewritten;
    let promptToSend = rewrittenPrompt ?? systemPrompt;
    if (snapshot && (!needsRender || resumeActive || !isRedescribable(options))) {
      let allowFill = !needsRender && !resumeActive && isRedescribable(options);
      let reminderFold =
        allowFill && snapshot.reminderFold === undefined && isThreadStateFeatureOn()
          ? recordReminderFold(true, inheritedReminderFold?.())
          : undefined;
      let echoWireToolInputs =
        allowFill && snapshot.echoWireToolInputs === undefined && isServerClassifierEnabled()
          ? recordWireToolInputEcho(true, inheritedEchoWireToolInputs?.())
          : undefined;
      let recordedContextRendering =
        allowFill && snapshot.contextRendering === undefined && isPromptSnapshotFeatureOn()
          ? recordContextRendering(true, contextRendering)
          : undefined;
      let reminderFold_2 = snapshot.reminderFold ?? reminderFold;
      let echoWireToolInputs_2 = snapshot.echoWireToolInputs ?? echoWireToolInputs;
      let contextRendering_2 = snapshot.contextRendering ?? recordedContextRendering;
      return {
        systemPrompt: snapshot.systemPrompt,
        toolDescriptions: snapshot.toolDescriptions,
        toolEntries: snapshot.toolEntries,
        toolServers: snapshot.toolServers,
        recordedCliPrefix: snapshot.cliPrefix,
        recordedWireShape: snapshot.wireShape,
        record:
          reminderFold !== undefined ||
          echoWireToolInputs !== undefined ||
          recordedContextRendering !== undefined
            ? createAttachmentMessage_2(
                {
                  type: "prompt_snapshot",
                  systemPrompt: [...snapshot.systemPrompt],
                  ...(snapshot.toolDescriptions.size > 0 && {
                    tools: snapshotToolEntries(snapshot),
                  }),
                  ...(snapshot.cliPrefix !== undefined && {
                    cliPrefix: snapshot.cliPrefix,
                  }),
                  ...(reminderFold_2 !== undefined && {
                    reminderFold: reminderFold_2,
                  }),
                  ...pickWireShape(snapshot.wireShape),
                  ...(echoWireToolInputs_2 !== undefined && {
                    echoWireToolInputs: echoWireToolInputs_2,
                  }),
                  ...(contextRendering_2 !== undefined && {
                    contextRendering: contextRendering_2,
                  }),
                },
                stamp,
              )
            : undefined,
        source: "from_snapshot",
        snapshotHash: snapshot.systemPromptHash,
      };
    }
    if (resumeActive || !isRedescribable(options)) return emptySnapshot;
    let reminderFold =
      snapshot?.reminderFold ??
      (isThreadStateFeatureOn()
        ? recordReminderFold(snapshot !== undefined, inheritedReminderFold?.())
        : undefined);
    let wireShape = snapshot?.wireShape ?? dropSystemTurnsAnsweredBy(inheritedWireShape?.());
    let echoWireToolInputs =
      snapshot?.echoWireToolInputs ??
      (isServerClassifierEnabled()
        ? recordWireToolInputEcho(snapshot !== undefined, inheritedEchoWireToolInputs?.())
        : undefined);
    let recordedContextRendering =
      snapshot?.contextRendering ??
      (isPromptSnapshotFeatureOn()
        ? recordContextRendering(snapshot !== undefined, contextRendering)
        : undefined);
    return {
      systemPrompt: promptToSend,
      toolDescriptions: snapshot?.toolDescriptions,
      toolEntries: snapshot?.toolEntries,
      toolServers: snapshot?.toolServers,
      recordedCliPrefix: snapshot?.cliPrefix,
      recordedWireShape: wireShape,
      record: createAttachmentMessage_2(
        {
          type: "prompt_snapshot",
          systemPrompt: [...promptToSend],
          ...(snapshot !== undefined &&
            snapshot.toolDescriptions.size > 0 && {
              tools: snapshotToolEntries(snapshot),
            }),
          ...(snapshot?.cliPrefix !== undefined && {
            cliPrefix: snapshot.cliPrefix,
          }),
          ...(reminderFold !== undefined && {
            reminderFold,
          }),
          ...pickWireShape(wireShape),
          ...(echoWireToolInputs !== undefined && {
            echoWireToolInputs,
          }),
          ...(recordedContextRendering !== undefined && {
            contextRendering: recordedContextRendering,
          }),
        },
        stamp,
      ),
      source: "live_recorded",
      snapshotHash: hashSystemPrompt(promptToSend),
      atRenderPoint:
        wasRewritten ||
        (renderPointNewer &&
          snapshot !== undefined &&
          !isDeepStrictEqual([...promptToSend], [...snapshot.systemPrompt])),
      ...(wasRewritten && {
        rewritten: wasRewritten,
      }),
    };
  } catch (error) {
    logError(error);
    return emptySnapshot;
  }
}
//@ chunk-ha3km179.js:138963-140211 placement
/**
 * 记录本回合发送的工具描述。
 */
function recordToolDescriptions(messagesForQuery, inlineToolsDeclared, { head, stamp, handed, ...options }) {
  try {
    if (
      inlineToolsDeclared === undefined ||
      !shouldSnapshotSystemPrompt(options.options) ||
      !isRedescribable(options)
    )
      return;
    let snapshot = promptSnapshotUnlessRenderPoint(messagesForQuery, options.options);
    if (!snapshot) return;
    let filtered = inlineToolsDeclared.filter(
      (inlineTool) => !snapshot.toolDescriptions.has(inlineTool.name),
    );
    let redescribedByName = new Map(
      inlineToolsDeclared.flatMap((inlineTool) =>
        handed?.names.has(inlineTool.name) === true &&
        snapshot.toolDescriptions.get(inlineTool.name) !== inlineTool.description
          ? [[inlineTool.name, inlineTool]]
          : [],
      ),
    );
    let sentNames = new Set(inlineToolsDeclared.map((inlineTool) => inlineTool.name));
    let lockedToolSearch =
      snapshot.toolDescriptions.has(TOOL_SEARCH_TOOL_NAME) &&
      !sentNames.has(TOOL_SEARCH_TOOL_NAME) &&
      isToolSearchLockedOffByDefault()
        ? new Set([TOOL_SEARCH_TOOL_NAME])
        : undefined;
    let cliPrefix = snapshot.cliPrefix ?? head?.cliPrefix;
    let cliPrefixChanged = cliPrefix !== snapshot.cliPrefix;
    let { wireShape, changed } = applyWireShape(snapshot.wireShape, head?.wireShape);
    if (
      filtered.length === 0 &&
      redescribedByName.size === 0 &&
      !cliPrefixChanged &&
      !changed &&
      lockedToolSearch === undefined
    ) {
      if (handed !== undefined) toolDescriptionStandings.noteRedescribed(snapshot.record, handed, sentNames);
      return;
    }
    let attachmentMessage = createAttachmentMessage_2(
      {
        type: "prompt_snapshot",
        systemPrompt: [...snapshot.systemPrompt],
        tools: [
          ...snapshotToolEntries(snapshot, lockedToolSearch).map(
            (toolEntry) => redescribedByName.get(toolEntry.name) ?? toolEntry,
          ),
          ...filtered,
        ].map(({ name, description, schema, server }) => ({
          name,
          description,
          ...(schema && {
            schema,
          }),
          ...(server !== undefined && {
            server,
          }),
        })),
        ...(cliPrefix !== undefined && {
          cliPrefix,
        }),
        ...(snapshot.reminderFold !== undefined && {
          reminderFold: snapshot.reminderFold,
        }),
        ...wireShape,
        ...(snapshot.echoWireToolInputs !== undefined && {
          echoWireToolInputs: snapshot.echoWireToolInputs,
        }),
        ...(snapshot.contextRendering !== undefined && {
          contextRendering: snapshot.contextRendering,
        }),
      },
      stamp,
    );
    if (attachmentMessage.attachment.type === "prompt_snapshot") {
      toolDescriptionStandings.noteCopied(snapshot.record, attachmentMessage.attachment);
      if (handed !== undefined)
        toolDescriptionStandings.noteRedescribed(attachmentMessage.attachment, handed, sentNames);
    }
    return attachmentMessage;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:140211-140246 placement
/**
 * 延迟加载工具附件
 */
function lazyToolAttachment(stamp) {
  return createAttachmentMessage_2(setModelRenderPoint(), stamp);
}
//@ chunk-ha3km179.js:140246-140987 placement
/**
 * 记录延迟加载的工具。
 */
function recordDeferredTools(messagesForQuery, deferredToolsSent, { stamp, toolInputCopies, ...options }) {
  try {
    if (!isRedescribable(options)) return;
    if (deferredToolsSent === undefined && (toolInputCopies?.size ?? 0) === 0) return;
    let recorded = recordedDeferredTools(messagesForQuery);
    let newEntries = new Map();
    for (let entry of deferredToolsSent?.entries ?? [])
      if (!newEntries.has(entry.name) && !isDeepStrictEqual(recorded.entries.get(entry.name), entry))
        newEntries.set(entry.name, entry);
    let filtered = [...(deferredToolsSent?.nameOnlyAnnouncements ?? [])].filter(
      (name) => !recorded.nameOnlyAnnouncements.has(name),
    );
    let filtered_2 = [...(deferredToolsSent?.strippedReferences ?? [])].filter(
      (name) => !recorded.strippedReferences.has(name),
    );
    let mapped = [...(toolInputCopies ?? [])]
      .filter(([id, copy]) => recorded.toolInputCopies.get(id) !== copy)
      .map(([id, copy]) => ({
        id,
        copy,
      }));
    if (newEntries.size === 0 && filtered.length === 0 && filtered_2.length === 0 && mapped.length === 0)
      return;
    return createAttachmentMessage_2(
      {
        type: "deferred_tools_record",
        entries: [...newEntries.values()],
        ...(filtered.length > 0 && {
          nameOnlyAnnouncements: filtered,
        }),
        ...(filtered_2.length > 0 && {
          strippedReferences: filtered_2,
        }),
        ...(mapped.length > 0 && {
          toolInputCopies: mapped,
        }),
      },
      stamp,
    );
  } catch (error) {
    logError(error);
    return;
  }
}
export {
  lazyToolAttachment,
  wasPutBackSafe,
  settleTakenSafe,
  redescribeEpochFor,
  sectionAnswersSnapshot,
  startRequeueWindowSafe,
  crossOrgThinkingAttachments,
  recordPromptSnapshot,
  recordDeferredTools,
  recordToolDescriptions,
};
