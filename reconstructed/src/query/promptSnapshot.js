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

//@ chunk-ha3km179.js:129854-129924 placement
/**
 * 是否被放回
 */
function wasPutBackSafe(messageQueue, n) {
  try {
    return messageQueue.wasPutBack(n);
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
      (T) => T.type === "attachment" && T.attachment?.type === "credential_org",
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
    let R =
      mainThread &&
      messagesForQuery.some(
        (T) =>
          T.type === "assistant" &&
          Array.isArray(T.message?.content) &&
          T.message.content.some((w) => w?.type === "thinking" || w?.type === "redacted_thinking"),
      ) &&
      isModelCapabilityEnabled("org_locked_thinking", getCanonicalName(model), model) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_lexical_glade", false);
    logFeatureOk("context_credential_org_change", {
      warned: R,
    });
    return R
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
var EMPTY_TOOL_STANDING = {
  epoch: 0,
  owed: new Set(),
};
//@ chunk-ha3km179.js:131398-132074 placement
/**
 * 跟踪工具描述的待发送状态。
 */
function createToolDescriptionStandings() {
  let e = {
    standings: new WeakMap(),
  };
  function n(y, S) {
    try {
      if (y === undefined || y.toolDescriptions.size === 0)
        return S > 0
          ? {
              names: EMPTY_TOOL_STANDING.owed,
              epoch: S,
            }
          : undefined;
      let M = e.standings.get(y.record) ?? EMPTY_TOOL_STANDING;
      let R = S > M.epoch;
      if (!R && M.owed.size === 0) return;
      let filtered = [...y.toolDescriptions.keys()].filter(R ? isHookDescribed : (P) => M.owed.has(P));
      return R || filtered.length > 0
        ? {
            names: new Set(filtered),
            epoch: Math.max(S, M.epoch),
          }
        : undefined;
    } catch (error) {
      logError(toError(error));
      return;
    }
  }
  let noteRedescribed = (y, S, M) =>
    void e.standings.set(y, {
      epoch: S.epoch,
      owed: new Set([...S.names].filter((R) => !M.has(R))),
    });
  function s(y, S) {
    let M = e.standings.get(y);
    if (M !== undefined) e.standings.set(S, M);
  }
  return {
    redescribing: n,
    noteRedescribed,
    noteCopied: s,
    forgetStandings: () => {
      e.standings = new WeakMap();
    },
  };
}
//@ chunk-ha3km179.js:132074-132115 placement
/**
 * 工具描述待发状态
 */
var toolDescriptionStandings = identity(createToolDescriptionStandings(), (e) => e.forgetStandings());
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
  let e = new Map();
  function n(s, h) {
    e.delete(s);
    e.set(s, h);
    for (let key of [...e.keys()].slice(0, -MAX_PROMPT_HASHES)) e.delete(key);
  }
  function r(s, h, y) {
    try {
      let S = e.get(s.systemPromptHash);
      if (y === undefined || !y.isFresh) return;
      if (S === undefined) {
        n(s.systemPromptHash, y.answers);
        return;
      }
      let M = changedSectionAnswers(S, y.answers);
      let R = diffPromptSections(s.systemPrompt, h, [...M.values()]);
      if (R !== undefined || S === "behind")
        n(
          R === undefined ? s.systemPromptHash : hashSystemPrompt(R),
          resolveHeldAnswers({
            held: S,
            answers: y.answers,
            owed: M,
            sent: R,
          }),
        );
      return R;
    } catch (error) {
      logError(toError(error));
      return;
    }
  }
  return {
    owedPrompt: r,
    noteRendered: (s, h) => {
      if (h !== undefined) n(s, h.isFresh ? h.answers : "behind");
    },
    notedCount: () => e.size,
    forgetStandings: () => e.clear(),
  };
}
//@ chunk-ha3km179.js:132818-132859 placement
/**
 * 系统提示哈希历史
 */
var systemPromptHistory = identity(createSystemPromptHistory(), (e) => e.forgetStandings());
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
function nonEmptyOrNull(e) {
  return e === "" ? null : e;
}
//@ chunk-ha3km179.js:133035-133306 placement
function changedSectionAnswers(e, answers) {
  return new Map(
    [...answers].flatMap(([r, s]) => {
      let h = e === "behind" ? undefined : e.get(r);
      let y = nonEmptyOrNull(s.answer);
      let S = h === undefined ? undefined : nonEmptyOrNull(h.answer);
      let M = h !== undefined && S !== nonEmptyOrNull(h.text);
      let R = y !== nonEmptyOrNull(s.text);
      return y !== S && (M || R) && (y !== null || typeof S === "string")
        ? [
            [
              r,
              {
                before: S,
                after: y,
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
    [...answers].flatMap(([h, y]) => {
      let S = owed.get(h);
      let M = held === "behind" ? undefined : held.get(h);
      let R = S?.after === null && sent?.includes(S.before ?? "") === false;
      let T = typeof S?.after === "string" && sent?.includes(S.after) === true;
      let w = R || T ? y : M;
      return w === undefined ? [] : [[h, w]];
    }),
  );
}
//@ chunk-ha3km179.js:133587-134155 placement
/**
 * 比较两版提示段落的顺序与增删。
 */
function diffPromptSections(systemPrompt, n, r) {
  let s = indexParts(systemPrompt);
  let h = indexParts(n);
  let filtered = systemPrompt.filter((D) => D !== "" && s.counts.get(D) === 1 && h.counts.get(D) === 1);
  let mapped = filtered.map((D) => h.places.get(D) ?? -1);
  let all = mapped.every((D, L) => L === 0 || (mapped[L - 1] ?? D) < D);
  let flattened = r.flatMap(({ before, after }) => {
    let z = typeof before === "string" && s.counts.get(before) === 1 && !h.counts.has(before);
    return after === null && !z
      ? []
      : [
          {
            before: z || before === null ? before : undefined,
            after,
          },
        ];
  });
  let flattened_2 = [...filtered, undefined].flatMap((D, L) => {
    let z = filtered[L - 1];
    let G = applyPromptSectionEdits(partsBetween(s, z, D), partsBetween(h, z, D), flattened);
    return D === undefined ? G : [...G, D];
  });
  let filtered_2 = flattened_2.filter((D) => D !== "");
  let filtered_3 = systemPrompt.filter((D) => D !== "");
  let Q = filtered_2.length === filtered_3.length && filtered_2.every((D, L) => D === filtered_3[L]);
  return !all || Q ? undefined : asSystemPrompt(flattened_2);
}
//@ chunk-ha3km179.js:134155-134291 placement
function indexParts(e) {
  let n = new Map();
  let r = new Map();
  for (let [s, h] of e.entries()) {
    n.set(h, (n.get(h) ?? 0) + 1);
    r.set(h, s);
  }
  return {
    parts: e,
    counts: n,
    places: r,
  };
}
//@ chunk-ha3km179.js:134291-134411 placement
function partsBetween(e, n, r) {
  return e.parts.slice(
    n === undefined ? 0 : (e.places.get(n) ?? -1) + 1,
    r === undefined ? e.parts.length : e.places.get(r),
  );
}
//@ chunk-ha3km179.js:134411-134491 placement = formatSnippet (0.806)
function formatSnippet(e, n, r) {
  return e.filter((s) => n.some((h) => h.after === s && h.before === r));
}
//@ chunk-ha3km179.js:134491-134854 placement = formatSnippet (0.806)
/**
 * 应用提示段落编辑。
 */
function applyPromptSectionEdits(e, n, r) {
  let filtered = n.filter((T) => T !== "");
  let filtered_2 = r.filter((T) => T.after === null || filtered.includes(T.after));
  let flattened = e.flatMap((T) => {
    let found = filtered_2.find((P) => P.before === T);
    return found === undefined ? [T] : (found.after ?? []);
  });
  let filtered_3 = e.filter((T) => T !== "" && !filtered_2.some((w) => w.before === T));
  let M = formatSnippet(filtered, filtered_2, undefined);
  return filtered.every((T) => filtered_2.some((w) => w.after === T)) &&
    filtered_3.length === M.length &&
    (M.length > 0 || formatSnippet(filtered, filtered_2, null).length > 0)
    ? filtered
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
function recordReminderFold(carriedForward, n) {
  let { fold, cached } = resolveReminderFold(n);
  try {
    logEvent("tengu_reminder_fold_recorded", {
      recorded: fold !== undefined,
      ...(fold !== undefined && {
        fold,
      }),
      carriedForward,
      inherited: n !== undefined,
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
  let r = pickWireShape({
    systemTurns: wireShape_2.systemTurns ?? wireShape.systemTurns,
    toolChangeHeader: wireShape_2.toolChangeHeader ?? wireShape.toolChangeHeader,
    inlineTools: wireShape_2.inlineTools ?? wireShape.inlineTools,
    keptReminders: wireShape_2.keptReminders ?? wireShape.keptReminders,
    toolResultSafeguards: wireShape_2.toolResultSafeguards ?? wireShape.toolResultSafeguards,
    systemTurnsAnsweredBy: wireShape_2.systemTurnsAnsweredBy ?? wireShape.systemTurnsAnsweredBy,
  });
  let any = REQUEST_SHAPE_KEYS.some((h) => r[h] !== wireShape[h]);
  if (any)
    try {
      let { systemTurnsAnsweredBy, ...y } = r;
      logEvent("tengu_wire_shape_recorded", {
        ...y,
        overwrote: REQUEST_SHAPE_KEYS.some((S) => wireShape[S] !== undefined && r[S] !== wireShape[S]),
      });
    } catch (error) {
      logError(error);
    }
  return {
    wireShape: r,
    changed: any || r.systemTurnsAnsweredBy !== wireShape.systemTurnsAnsweredBy,
  };
}
//@ chunk-ha3km179.js:135920-136157 placement
function recordWireToolInputEcho(carriedForward, n) {
  let { echo, cached } = getEchoWireToolInputsState(n);
  try {
    logEvent("tengu_wire_tool_input_echo_recorded", {
      recorded: echo !== undefined,
      ...(echo !== undefined && {
        echo,
      }),
      carriedForward,
      inherited: n !== undefined,
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
function recordPromptSnapshot(messagesForQuery, systemPrompt, r) {
  let promptSnapshot = resolvePromptSnapshot(messagesForQuery, systemPrompt, r);
  try {
    let h = snapshotIfEnabled(messagesForQuery, r.options);
    if (h !== undefined && promptSnapshot.record?.attachment.type === "prompt_snapshot")
      toolDescriptionStandings.noteCopied(h.record, promptSnapshot.record.attachment);
    if (promptSnapshot.source === "live_recorded" && promptSnapshot.snapshotHash && !promptSnapshot.rewritten)
      systemPromptHistory.noteRendered(promptSnapshot.snapshotHash, r.turnSections);
    let y =
      r.toolDescribeEpoch !== undefined && isRedescribable(r)
        ? toolDescriptionStandings.redescribing(h, r.toolDescribeEpoch)
        : undefined;
    return y === undefined
      ? promptSnapshot
      : {
          ...promptSnapshot,
          redescribing: y,
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
  e,
  n,
  {
    resumeActive,
    stamp,
    inheritedReminderFold,
    inheritedWireShape,
    inheritedEchoWireToolInputs,
    contextRendering,
    turnSections,
    ...T
  },
) {
  let w = {
    systemPrompt: n,
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
    if (!shouldSnapshotSystemPrompt(T.options)) return w;
    let P = snapshotIfEnabled(e, T.options);
    let Q = P !== undefined && isRenderPointNewer(e);
    let D =
      P !== undefined &&
      !Q &&
      !resumeActive &&
      isRedescribable(T) &&
      classifyQuerySource(T.querySource) === "main"
        ? systemPromptHistory.owedPrompt(P, n, turnSections)
        : undefined;
    let L = D !== undefined;
    let z = Q || L;
    let G = D ?? n;
    if (P && (!z || resumeActive || !isRedescribable(T))) {
      let Z = !z && !resumeActive && isRedescribable(T);
      let re =
        Z && P.reminderFold === undefined && isThreadStateFeatureOn()
          ? recordReminderFold(true, inheritedReminderFold?.())
          : undefined;
      let Re =
        Z && P.echoWireToolInputs === undefined && isServerClassifierEnabled()
          ? recordWireToolInputEcho(true, inheritedEchoWireToolInputs?.())
          : undefined;
      let se =
        Z && P.contextRendering === undefined && isPromptSnapshotFeatureOn()
          ? recordContextRendering(true, contextRendering)
          : undefined;
      let reminderFold = P.reminderFold ?? re;
      let echoWireToolInputs = P.echoWireToolInputs ?? Re;
      let contextRendering_2 = P.contextRendering ?? se;
      return {
        systemPrompt: P.systemPrompt,
        toolDescriptions: P.toolDescriptions,
        toolEntries: P.toolEntries,
        toolServers: P.toolServers,
        recordedCliPrefix: P.cliPrefix,
        recordedWireShape: P.wireShape,
        record:
          re !== undefined || Re !== undefined || se !== undefined
            ? createAttachmentMessage_2(
                {
                  type: "prompt_snapshot",
                  systemPrompt: [...P.systemPrompt],
                  ...(P.toolDescriptions.size > 0 && {
                    tools: snapshotToolEntries(P),
                  }),
                  ...(P.cliPrefix !== undefined && {
                    cliPrefix: P.cliPrefix,
                  }),
                  ...(reminderFold !== undefined && {
                    reminderFold,
                  }),
                  ...pickWireShape(P.wireShape),
                  ...(echoWireToolInputs !== undefined && {
                    echoWireToolInputs,
                  }),
                  ...(contextRendering_2 !== undefined && {
                    contextRendering: contextRendering_2,
                  }),
                },
                stamp,
              )
            : undefined,
        source: "from_snapshot",
        snapshotHash: P.systemPromptHash,
      };
    }
    if (resumeActive || !isRedescribable(T)) return w;
    let ee =
      P?.reminderFold ??
      (isThreadStateFeatureOn() ? recordReminderFold(P !== undefined, inheritedReminderFold?.()) : undefined);
    let V = P?.wireShape ?? dropSystemTurnsAnsweredBy(inheritedWireShape?.());
    let fe =
      P?.echoWireToolInputs ??
      (isServerClassifierEnabled()
        ? recordWireToolInputEcho(P !== undefined, inheritedEchoWireToolInputs?.())
        : undefined);
    let ie =
      P?.contextRendering ??
      (isPromptSnapshotFeatureOn() ? recordContextRendering(P !== undefined, contextRendering) : undefined);
    return {
      systemPrompt: G,
      toolDescriptions: P?.toolDescriptions,
      toolEntries: P?.toolEntries,
      toolServers: P?.toolServers,
      recordedCliPrefix: P?.cliPrefix,
      recordedWireShape: V,
      record: createAttachmentMessage_2(
        {
          type: "prompt_snapshot",
          systemPrompt: [...G],
          ...(P !== undefined &&
            P.toolDescriptions.size > 0 && {
              tools: snapshotToolEntries(P),
            }),
          ...(P?.cliPrefix !== undefined && {
            cliPrefix: P.cliPrefix,
          }),
          ...(ee !== undefined && {
            reminderFold: ee,
          }),
          ...pickWireShape(V),
          ...(fe !== undefined && {
            echoWireToolInputs: fe,
          }),
          ...(ie !== undefined && {
            contextRendering: ie,
          }),
        },
        stamp,
      ),
      source: "live_recorded",
      snapshotHash: hashSystemPrompt(G),
      atRenderPoint: L || (Q && P !== undefined && !isDeepStrictEqual([...G], [...P.systemPrompt])),
      ...(L && {
        rewritten: L,
      }),
    };
  } catch (error) {
    logError(error);
    return w;
  }
}
//@ chunk-ha3km179.js:138963-140211 placement
/**
 * 记录本回合发送的工具描述。
 */
function recordToolDescriptions(messagesForQuery, inlineToolsDeclared, { head, stamp, handed, ...y }) {
  try {
    if (inlineToolsDeclared === undefined || !shouldSnapshotSystemPrompt(y.options) || !isRedescribable(y))
      return;
    let S = promptSnapshotUnlessRenderPoint(messagesForQuery, y.options);
    if (!S) return;
    let filtered = inlineToolsDeclared.filter((G) => !S.toolDescriptions.has(G.name));
    let R = new Map(
      inlineToolsDeclared.flatMap((G) =>
        handed?.names.has(G.name) === true && S.toolDescriptions.get(G.name) !== G.description
          ? [[G.name, G]]
          : [],
      ),
    );
    let T = new Set(inlineToolsDeclared.map((G) => G.name));
    let w =
      S.toolDescriptions.has(TOOL_SEARCH_TOOL_NAME) &&
      !T.has(TOOL_SEARCH_TOOL_NAME) &&
      isToolSearchLockedOffByDefault()
        ? new Set([TOOL_SEARCH_TOOL_NAME])
        : undefined;
    let cliPrefix = S.cliPrefix ?? head?.cliPrefix;
    let Q = cliPrefix !== S.cliPrefix;
    let { wireShape, changed } = applyWireShape(S.wireShape, head?.wireShape);
    if (filtered.length === 0 && R.size === 0 && !Q && !changed && w === undefined) {
      if (handed !== undefined) toolDescriptionStandings.noteRedescribed(S.record, handed, T);
      return;
    }
    let attachmentMessage = createAttachmentMessage_2(
      {
        type: "prompt_snapshot",
        systemPrompt: [...S.systemPrompt],
        tools: [...snapshotToolEntries(S, w).map((G) => R.get(G.name) ?? G), ...filtered].map(
          ({ name: G, description, schema, server }) => ({
            name: G,
            description,
            ...(schema && {
              schema,
            }),
            ...(server !== undefined && {
              server,
            }),
          }),
        ),
        ...(cliPrefix !== undefined && {
          cliPrefix,
        }),
        ...(S.reminderFold !== undefined && {
          reminderFold: S.reminderFold,
        }),
        ...wireShape,
        ...(S.echoWireToolInputs !== undefined && {
          echoWireToolInputs: S.echoWireToolInputs,
        }),
        ...(S.contextRendering !== undefined && {
          contextRendering: S.contextRendering,
        }),
      },
      stamp,
    );
    if (attachmentMessage.attachment.type === "prompt_snapshot") {
      toolDescriptionStandings.noteCopied(S.record, attachmentMessage.attachment);
      if (handed !== undefined)
        toolDescriptionStandings.noteRedescribed(attachmentMessage.attachment, handed, T);
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
function lazyToolAttachment(e) {
  return createAttachmentMessage_2(setModelRenderPoint(), e);
}
//@ chunk-ha3km179.js:140246-140987 placement
/**
 * 记录延迟加载的工具。
 */
function recordDeferredTools(messagesForQuery, deferredToolsSent, { stamp, toolInputCopies, ...h }) {
  try {
    if (!isRedescribable(h)) return;
    if (deferredToolsSent === undefined && (toolInputCopies?.size ?? 0) === 0) return;
    let y = recordedDeferredTools(messagesForQuery);
    let S = new Map();
    for (let w of deferredToolsSent?.entries ?? [])
      if (!S.has(w.name) && !isDeepStrictEqual(y.entries.get(w.name), w)) S.set(w.name, w);
    let filtered = [...(deferredToolsSent?.nameOnlyAnnouncements ?? [])].filter(
      (w) => !y.nameOnlyAnnouncements.has(w),
    );
    let filtered_2 = [...(deferredToolsSent?.strippedReferences ?? [])].filter(
      (w) => !y.strippedReferences.has(w),
    );
    let mapped = [...(toolInputCopies ?? [])]
      .filter(([w, P]) => y.toolInputCopies.get(w) !== P)
      .map(([w, P]) => ({
        id: w,
        copy: P,
      }));
    if (S.size === 0 && filtered.length === 0 && filtered_2.length === 0 && mapped.length === 0) return;
    return createAttachmentMessage_2(
      {
        type: "deferred_tools_record",
        entries: [...S.values()],
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
