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
import { Vt } from "../utils/agentId.js";
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
import { ge } from "../utils/identity.js";
import {
  t3n,
  pickWireShape,
  j_e,
  shouldSnapshotSystemPrompt,
  e3n,
  qun,
  snapshotToolEntries,
  y$o,
  met,
  _$o,
  recordedDeferredTools,
} from "../utils/contextAttachments/promptSnapshot.js";
import { sectionAnswers } from "../plugins/functionHooks/promptComposition.js";
import { asSystemPrompt } from "../utils/systemPromptType.js";
import { resolveReminderFold, X1t } from "../utils/contextAttachments/threadState.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { getEchoWireToolInputsState, isServerClassifierEnabled } from "../utils/wireToolInputEcho.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { rGt } from "../utils/toolSearch.js";

//@ chunk-ha3km179.js:129854-129924 placement
function xxr(e, n) {
  try {
    return e.wasPutBack(n);
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-ha3km179.js:129924-129981 placement
function yu(e) {
  try {
    e.startRequeueWindow();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:129981-130032 placement
function oSo(e) {
  try {
    e.settleTaken();
  } catch (error) {
    logError(error);
  }
}
/**
 * 切换组织后之前的思考内容不可用的说明文本。
 */
//@ chunk-ha3km179.js:130032-130465 placement
var CROSS_ORG_THINKING_NOTICE = `${FOREIGN_ORG_THINKING_NOTICE}
Claude's earlier thinking was written while you were signed in to another organization, so Claude can't use it now. It isn't deleted: resume this session signed in to that organization to use it again. Claude's next responses may be slower and use more tokens because it has to reread this session and generate new thinking. See docs for more: https://platform.claude.com/docs/en/build-with-claude/preserved-thinking`;
/**
 * 检测跨组织的思考块并生成说明附件。
 */
//@ chunk-ha3km179.js:130465-131326 placement
function crossOrgThinkingAttachments(
  e,
  { querySource: querySource, mainThread: mainThread, model: model, stamp: stamp },
) {
  if (classifyQuerySource(querySource) === "auxiliary") return [];
  try {
    if (!isAnthropicAuthEnabled()) return [];
    let y = Vt(
        env.CLAUDE_CODE_OAUTH_TOKEN ||
          usableLauncherHostLoginToken() !== null ||
          (getOAuthTokenFromFileDescriptor() &&
            (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
          ? env.CLAUDE_CODE_ORGANIZATION_UUID
          : getStoredOauthAccountInfo()?.organizationUuid,
      )?.toLowerCase(),
      S = e.findLast((T) => T.type === "attachment" && T.attachment?.type === "credential_org")?.attachment
        .organizationUuid;
    if (y === void 0 || y === S) return [];
    let M = createAttachmentMessage_2({ type: "credential_org", organizationUuid: y }, stamp);
    if (typeof S !== "string") return [M];
    let R =
      mainThread &&
      e.some(
        (T) =>
          T.type === "assistant" &&
          Array.isArray(T.message?.content) &&
          T.message.content.some((w) => w?.type === "thinking" || w?.type === "redacted_thinking"),
      ) &&
      isModelCapabilityEnabled("org_locked_thinking", getCanonicalName(model), model) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_lexical_glade", !1);
    return (
      logFeatureOk("context_credential_org_change", { warned: R }),
      R ? [M, createInformationalSystemMessage(CROSS_ORG_THINKING_NOTICE, "warning")] : [M]
    );
  } catch (error) {
    return (logError(error), logFeatureSad("context_credential_org_change", "record_failed"), []);
  }
}
//@ chunk-ha3km179.js:131368-131398 placement
var _u = { epoch: 0, owed: new Set() };
/**
 * 跟踪工具描述的待发送状态。
 */
//@ chunk-ha3km179.js:131398-132074 placement
function createToolDescriptionStandings() {
  let e = { standings: new WeakMap() };
  function n(y, S) {
    try {
      if (y === void 0 || y.toolDescriptions.size === 0) return S > 0 ? { names: _u.owed, epoch: S } : void 0;
      let M = e.standings.get(y.record) ?? _u,
        R = S > M.epoch;
      if (!R && M.owed.size === 0) return;
      let filtered = [...y.toolDescriptions.keys()].filter(R ? isHookDescribed : (P) => M.owed.has(P));
      return R || filtered.length > 0 ? { names: new Set(filtered), epoch: Math.max(S, M.epoch) } : void 0;
    } catch (error) {
      logError(toError(error));
      return;
    }
  }
  let r = (y, S, M) =>
    void e.standings.set(y, { epoch: S.epoch, owed: new Set([...S.names].filter((R) => !M.has(R))) });
  function s(y, S) {
    let M = e.standings.get(y);
    if (M !== void 0) e.standings.set(S, M);
  }
  return {
    redescribing: n,
    noteRedescribed: r,
    noteCopied: s,
    forgetStandings: () => {
      e.standings = new WeakMap();
    },
  };
}
//@ chunk-ha3km179.js:132074-132115 placement
var qn = ge(createToolDescriptionStandings(), (e) => e.forgetStandings());
//@ chunk-ha3km179.js:132115-132198 placement
function Su(e) {
  try {
    return e.settingsHooksOff ? void 0 : redescribeEpoch();
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-ha3km179.js:132198-132208 placement
var Ag = 16;
/**
 * 记录最近的系统提示哈希（有上限）。
 */
//@ chunk-ha3km179.js:132208-132818 placement
function createSystemPromptHistory() {
  let e = new Map();
  function n(s, h) {
    (e.delete(s), e.set(s, h));
    for (let y of [...e.keys()].slice(0, -Ag)) e.delete(y);
  }
  function r(s, h, y) {
    try {
      let S = e.get(s.systemPromptHash);
      if (y === void 0 || !y.isFresh) return;
      if (S === void 0) {
        n(s.systemPromptHash, y.answers);
        return;
      }
      let M = changedSectionAnswers(S, y.answers),
        R = diffPromptSections(s.systemPrompt, h, [...M.values()]);
      if (R !== void 0 || S === "behind")
        n(
          R === void 0 ? s.systemPromptHash : t3n(R),
          resolveHeldAnswers({ held: S, answers: y.answers, owed: M, sent: R }),
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
      if (h !== void 0) n(s, h.isFresh ? h.answers : "behind");
    },
    notedCount: () => e.size,
    forgetStandings: () => e.clear(),
  };
}
//@ chunk-ha3km179.js:132818-132859 placement
var hi = ge(createSystemPromptHistory(), (e) => e.forgetStandings());
//@ chunk-ha3km179.js:132859-132999 placement
function sectionAnswersSnapshot(e, n) {
  try {
    return !e.options.settingsHooksOff && e.agentId === void 0
      ? { isFresh: n === getSystemPromptSectionEpoch(), answers: sectionAnswers() }
      : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-ha3km179.js:132999-133035 placement
function Wr(e) {
  return e === "" ? null : e;
}
//@ chunk-ha3km179.js:133035-133306 placement
function changedSectionAnswers(e, n) {
  return new Map(
    [...n].flatMap(([r, s]) => {
      let h = e === "behind" ? void 0 : e.get(r),
        y = Wr(s.answer),
        S = h === void 0 ? void 0 : Wr(h.answer),
        M = h !== void 0 && S !== Wr(h.text),
        R = y !== Wr(s.text);
      return y !== S && (M || R) && (y !== null || typeof S === "string")
        ? [[r, { before: S, after: y }]]
        : [];
    }),
  );
}
//@ chunk-ha3km179.js:133306-133587 placement
function resolveHeldAnswers({ held: held, answers: answers, owed: owed, sent: sent }) {
  return new Map(
    [...answers].flatMap(([h, y]) => {
      let S = owed.get(h),
        M = held === "behind" ? void 0 : held.get(h),
        R = S?.after === null && sent?.includes(S.before ?? "") === !1,
        T = typeof S?.after === "string" && sent?.includes(S.after) === !0,
        w = R || T ? y : M;
      return w === void 0 ? [] : [[h, w]];
    }),
  );
}
/**
 * 比较两版提示段落的顺序与增删。
 */
//@ chunk-ha3km179.js:133587-134155 placement
function diffPromptSections(e, n, r) {
  let s = indexParts(e),
    h = indexParts(n),
    filtered = e.filter((D) => D !== "" && s.counts.get(D) === 1 && h.counts.get(D) === 1),
    mapped = filtered.map((D) => h.places.get(D) ?? -1),
    all = mapped.every((D, L) => L === 0 || (mapped[L - 1] ?? D) < D),
    flattened = r.flatMap(({ before: before, after: after }) => {
      let z = typeof before === "string" && s.counts.get(before) === 1 && !h.counts.has(before);
      return after === null && !z ? [] : [{ before: z || before === null ? before : void 0, after: after }];
    }),
    flattened_2 = [...filtered, void 0].flatMap((D, L) => {
      let z = filtered[L - 1],
        G = applyPromptSectionEdits(partsBetween(s, z, D), partsBetween(h, z, D), flattened);
      return D === void 0 ? G : [...G, D];
    }),
    filtered_2 = flattened_2.filter((D) => D !== ""),
    filtered_3 = e.filter((D) => D !== ""),
    Q = filtered_2.length === filtered_3.length && filtered_2.every((D, L) => D === filtered_3[L]);
  return !all || Q ? void 0 : asSystemPrompt(flattened_2);
}
//@ chunk-ha3km179.js:134155-134291 placement
function indexParts(e) {
  let n = new Map(),
    r = new Map();
  for (let [s, h] of e.entries()) (n.set(h, (n.get(h) ?? 0) + 1), r.set(h, s));
  return { parts: e, counts: n, places: r };
}
//@ chunk-ha3km179.js:134291-134411 placement
function partsBetween(e, n, r) {
  return e.parts.slice(
    n === void 0 ? 0 : (e.places.get(n) ?? -1) + 1,
    r === void 0 ? e.parts.length : e.places.get(r),
  );
}
//@ chunk-ha3km179.js:134411-134491 placement = formatSnippet (0.806)
function formatSnippet(e, n, r) {
  return e.filter((s) => n.some((h) => h.after === s && h.before === r));
}
/**
 * 应用提示段落编辑。
 */
//@ chunk-ha3km179.js:134491-134854 placement = formatSnippet (0.806)
function applyPromptSectionEdits(e, n, r) {
  let filtered = n.filter((T) => T !== ""),
    filtered_2 = r.filter((T) => T.after === null || filtered.includes(T.after)),
    flattened = e.flatMap((T) => {
      let found = filtered_2.find((P) => P.before === T);
      return found === void 0 ? [T] : (found.after ?? []);
    }),
    filtered_3 = e.filter((T) => T !== "" && !filtered_2.some((w) => w.before === T)),
    M = formatSnippet(filtered, filtered_2, void 0);
  return filtered.every((T) => filtered_2.some((w) => w.after === T)) &&
    filtered_3.length === M.length &&
    (M.length > 0 || formatSnippet(filtered, filtered_2, null).length > 0)
    ? filtered
    : flattened;
}
//@ chunk-ha3km179.js:134854-134932 placement
function hn({ options: options, querySource: querySource }) {
  return !options.bareFork && classifyQuerySource(querySource) !== "auxiliary";
}
//@ chunk-ha3km179.js:134932-135162 placement
function recordReminderFold(e, n) {
  let { fold: fold, cached: cached } = resolveReminderFold(n);
  try {
    logEvent("tengu_reminder_fold_recorded", {
      recorded: fold !== void 0,
      ...(fold !== void 0 && { fold: fold }),
      carriedForward: e,
      inherited: n !== void 0,
      cached: cached.value,
      cachedSource: fromEnum(cached.source),
    });
  } catch (error) {
    logError(error);
  }
  return fold;
}
//@ chunk-ha3km179.js:135162-135257 placement
var Ru = ["systemTurns", "toolChangeHeader", "inlineTools", "keptReminders", "toolResultSafeguards"];
/**
 * 应用请求线形（systemTurns、toolChangeHeader、inlineTools 等）。
 */
//@ chunk-ha3km179.js:135257-135920 placement
function applyWireShape(e, n) {
  if (n === void 0 || !isFoamySpringEnabled()) return { wireShape: e, changed: !1 };
  let r = pickWireShape({
      systemTurns: n.systemTurns ?? e.systemTurns,
      toolChangeHeader: n.toolChangeHeader ?? e.toolChangeHeader,
      inlineTools: n.inlineTools ?? e.inlineTools,
      keptReminders: n.keptReminders ?? e.keptReminders,
      toolResultSafeguards: n.toolResultSafeguards ?? e.toolResultSafeguards,
      systemTurnsAnsweredBy: n.systemTurnsAnsweredBy ?? e.systemTurnsAnsweredBy,
    }),
    any = Ru.some((h) => r[h] !== e[h]);
  if (any)
    try {
      let { systemTurnsAnsweredBy: systemTurnsAnsweredBy, ...y } = r;
      logEvent("tengu_wire_shape_recorded", {
        ...y,
        overwrote: Ru.some((S) => e[S] !== void 0 && r[S] !== e[S]),
      });
    } catch (error) {
      logError(error);
    }
  return { wireShape: r, changed: any || r.systemTurnsAnsweredBy !== e.systemTurnsAnsweredBy };
}
//@ chunk-ha3km179.js:135920-136157 placement
function recordWireToolInputEcho(e, n) {
  let { echo: echo, cached: cached } = getEchoWireToolInputsState(n);
  try {
    logEvent("tengu_wire_tool_input_echo_recorded", {
      recorded: echo !== void 0,
      ...(echo !== void 0 && { echo: echo }),
      carriedForward: e,
      inherited: n !== void 0,
      cached: cached.value,
      cachedSource: fromEnum(cached.source),
    });
  } catch (error) {
    logError(error);
  }
  return echo;
}
//@ chunk-ha3km179.js:136157-136294 placement
function recordContextRendering(e, n) {
  if (n === void 0) return;
  try {
    logEvent("tengu_context_rendering_recorded", { rendering: fromEnum(n), carriedForward: e });
  } catch (error) {
    logError(error);
  }
  return n;
}
/**
 * 记录提示快照并处理复制关系。
 */
//@ chunk-ha3km179.js:136294-136722 placement
function recordPromptSnapshot(e, n, r) {
  let s = resolvePromptSnapshot(e, n, r);
  try {
    let h = j_e(e, r.options);
    if (h !== void 0 && s.record?.attachment.type === "prompt_snapshot")
      qn.noteCopied(h.record, s.record.attachment);
    if (s.source === "live_recorded" && s.snapshotHash && !s.rewritten)
      hi.noteRendered(s.snapshotHash, r.turnSections);
    let y = r.toolDescribeEpoch !== void 0 && hn(r) ? qn.redescribing(h, r.toolDescribeEpoch) : void 0;
    return y === void 0 ? s : { ...s, redescribing: y };
  } catch (error) {
    return (logError(error), s);
  }
}
/**
 * 计算本次请求的提示快照（实时/快照/继承来源）。
 */
//@ chunk-ha3km179.js:136722-138963 placement
function resolvePromptSnapshot(
  e,
  n,
  {
    resumeActive: resumeActive,
    stamp: stamp,
    inheritedReminderFold: inheritedReminderFold,
    inheritedWireShape: inheritedWireShape,
    inheritedEchoWireToolInputs: inheritedEchoWireToolInputs,
    contextRendering: contextRendering,
    turnSections: turnSections,
    ...T
  },
) {
  let w = {
    systemPrompt: n,
    toolDescriptions: void 0,
    toolEntries: void 0,
    toolServers: void 0,
    recordedCliPrefix: void 0,
    recordedWireShape: void 0,
    record: void 0,
    source: "live_unrecorded",
    snapshotHash: void 0,
  };
  try {
    if (!shouldSnapshotSystemPrompt(T.options)) return w;
    let P = j_e(e, T.options),
      Q = P !== void 0 && e3n(e),
      D =
        P !== void 0 && !Q && !resumeActive && hn(T) && classifyQuerySource(T.querySource) === "main"
          ? hi.owedPrompt(P, n, turnSections)
          : void 0,
      L = D !== void 0,
      z = Q || L,
      G = D ?? n;
    if (P && (!z || resumeActive || !hn(T))) {
      let Z = !z && !resumeActive && hn(T),
        re =
          Z && P.reminderFold === void 0 && X1t()
            ? recordReminderFold(!0, inheritedReminderFold?.())
            : void 0,
        Re =
          Z && P.echoWireToolInputs === void 0 && isServerClassifierEnabled()
            ? recordWireToolInputEcho(!0, inheritedEchoWireToolInputs?.())
            : void 0,
        se =
          Z && P.contextRendering === void 0 && qun() ? recordContextRendering(!0, contextRendering) : void 0,
        Te = P.reminderFold ?? re,
        U = P.echoWireToolInputs ?? Re,
        nt = P.contextRendering ?? se;
      return {
        systemPrompt: P.systemPrompt,
        toolDescriptions: P.toolDescriptions,
        toolEntries: P.toolEntries,
        toolServers: P.toolServers,
        recordedCliPrefix: P.cliPrefix,
        recordedWireShape: P.wireShape,
        record:
          re !== void 0 || Re !== void 0 || se !== void 0
            ? createAttachmentMessage_2(
                {
                  type: "prompt_snapshot",
                  systemPrompt: [...P.systemPrompt],
                  ...(P.toolDescriptions.size > 0 && { tools: snapshotToolEntries(P) }),
                  ...(P.cliPrefix !== void 0 && { cliPrefix: P.cliPrefix }),
                  ...(Te !== void 0 && { reminderFold: Te }),
                  ...pickWireShape(P.wireShape),
                  ...(U !== void 0 && { echoWireToolInputs: U }),
                  ...(nt !== void 0 && { contextRendering: nt }),
                },
                stamp,
              )
            : void 0,
        source: "from_snapshot",
        snapshotHash: P.systemPromptHash,
      };
    }
    if (resumeActive || !hn(T)) return w;
    let ee =
        P?.reminderFold ?? (X1t() ? recordReminderFold(P !== void 0, inheritedReminderFold?.()) : void 0),
      V = P?.wireShape ?? y$o(inheritedWireShape?.()),
      fe =
        P?.echoWireToolInputs ??
        (isServerClassifierEnabled()
          ? recordWireToolInputEcho(P !== void 0, inheritedEchoWireToolInputs?.())
          : void 0),
      ie = P?.contextRendering ?? (qun() ? recordContextRendering(P !== void 0, contextRendering) : void 0);
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
          ...(P !== void 0 && P.toolDescriptions.size > 0 && { tools: snapshotToolEntries(P) }),
          ...(P?.cliPrefix !== void 0 && { cliPrefix: P.cliPrefix }),
          ...(ee !== void 0 && { reminderFold: ee }),
          ...pickWireShape(V),
          ...(fe !== void 0 && { echoWireToolInputs: fe }),
          ...(ie !== void 0 && { contextRendering: ie }),
        },
        stamp,
      ),
      source: "live_recorded",
      snapshotHash: t3n(G),
      atRenderPoint: L || (Q && P !== void 0 && !isDeepStrictEqual([...G], [...P.systemPrompt])),
      ...(L && { rewritten: L }),
    };
  } catch (error) {
    return (logError(error), w);
  }
}
/**
 * 记录本回合发送的工具描述。
 */
//@ chunk-ha3km179.js:138963-140211 placement
function recordToolDescriptions(e, n, { head: head, stamp: stamp, handed: handed, ...y }) {
  try {
    if (n === void 0 || !shouldSnapshotSystemPrompt(y.options) || !hn(y)) return;
    let S = met(e, y.options);
    if (!S) return;
    let filtered = n.filter((G) => !S.toolDescriptions.has(G.name)),
      R = new Map(
        n.flatMap((G) =>
          handed?.names.has(G.name) === !0 && S.toolDescriptions.get(G.name) !== G.description
            ? [[G.name, G]]
            : [],
        ),
      ),
      T = new Set(n.map((G) => G.name)),
      w =
        S.toolDescriptions.has(TOOL_SEARCH_TOOL_NAME) && !T.has(TOOL_SEARCH_TOOL_NAME) && rGt()
          ? new Set([TOOL_SEARCH_TOOL_NAME])
          : void 0,
      P = S.cliPrefix ?? head?.cliPrefix,
      Q = P !== S.cliPrefix,
      { wireShape: wireShape, changed: changed } = applyWireShape(S.wireShape, head?.wireShape);
    if (filtered.length === 0 && R.size === 0 && !Q && !changed && w === void 0) {
      if (handed !== void 0) qn.noteRedescribed(S.record, handed, T);
      return;
    }
    let z = createAttachmentMessage_2(
      {
        type: "prompt_snapshot",
        systemPrompt: [...S.systemPrompt],
        tools: [...snapshotToolEntries(S, w).map((G) => R.get(G.name) ?? G), ...filtered].map(
          ({ name: G, description: description, schema: schema, server: server }) => ({
            name: G,
            description: description,
            ...(schema && { schema: schema }),
            ...(server !== void 0 && { server: server }),
          }),
        ),
        ...(P !== void 0 && { cliPrefix: P }),
        ...(S.reminderFold !== void 0 && { reminderFold: S.reminderFold }),
        ...wireShape,
        ...(S.echoWireToolInputs !== void 0 && { echoWireToolInputs: S.echoWireToolInputs }),
        ...(S.contextRendering !== void 0 && { contextRendering: S.contextRendering }),
      },
      stamp,
    );
    if (z.attachment.type === "prompt_snapshot") {
      if ((qn.noteCopied(S.record, z.attachment), handed !== void 0))
        qn.noteRedescribed(z.attachment, handed, T);
    }
    return z;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:140211-140246 placement
function ROs(e) {
  return createAttachmentMessage_2(_$o(), e);
}
/**
 * 记录延迟加载的工具。
 */
//@ chunk-ha3km179.js:140246-140987 placement
function recordDeferredTools(e, n, { stamp: stamp, toolInputCopies: toolInputCopies, ...h }) {
  try {
    if (!hn(h)) return;
    if (n === void 0 && (toolInputCopies?.size ?? 0) === 0) return;
    let y = recordedDeferredTools(e),
      S = new Map();
    for (let w of n?.entries ?? [])
      if (!S.has(w.name) && !isDeepStrictEqual(y.entries.get(w.name), w)) S.set(w.name, w);
    let filtered = [...(n?.nameOnlyAnnouncements ?? [])].filter((w) => !y.nameOnlyAnnouncements.has(w)),
      filtered_2 = [...(n?.strippedReferences ?? [])].filter((w) => !y.strippedReferences.has(w)),
      mapped = [...(toolInputCopies ?? [])]
        .filter(([w, P]) => y.toolInputCopies.get(w) !== P)
        .map(([w, P]) => ({ id: w, copy: P }));
    if (S.size === 0 && filtered.length === 0 && filtered_2.length === 0 && mapped.length === 0) return;
    return createAttachmentMessage_2(
      {
        type: "deferred_tools_record",
        entries: [...S.values()],
        ...(filtered.length > 0 && { nameOnlyAnnouncements: filtered }),
        ...(filtered_2.length > 0 && { strippedReferences: filtered_2 }),
        ...(mapped.length > 0 && { toolInputCopies: mapped }),
      },
      stamp,
    );
  } catch (error) {
    logError(error);
    return;
  }
}

export {
  ROs,
  xxr,
  oSo,
  Su,
  sectionAnswersSnapshot,
  yu,
  crossOrgThinkingAttachments,
  recordPromptSnapshot,
  recordDeferredTools,
  recordToolDescriptions,
};
