/**
 * services/extractMemories/memdirResync.ts
 *
 * 2.1.316 新增：记忆目录重同步：检测成功的工具调用后重新同步 memdir。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xr4xc2mq.js (39)
 * attribution: placement 39
 */
import { expandPath } from "../../utils/path.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage, AbortError, isAbortError } from "../../utils/errors.js";
import { uniq, count } from "../../utils/collections.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { NPt } from "../../memdir/memoryTool.js";
import { MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { isAutoMemPath } from "../../memdir/paths.js";
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { env } from "../../utils/env.js";
import { getDefaultHaikuModel } from "../../utils/model/planModeModel.js";
import { getSmallFastModel, unlessManagedDeniedModel } from "../../utils/model/smallFastModel.js";
import { isPermittedByOrgModelPolicy } from "../../utils/model/defaultModel.js";
import { getSideQueryThinkingSettings } from "../../utils/thinking.js";
import { tagUntrustedArtifactContent, m3 } from "../../utils/messages/untrustedArtifactContent.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { aN } from "../../utils/sideQuery.js";
import { safeParseJSON, $U } from "../../utils/json.js";
import { fT } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { resolveTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";

/**
 * 后台记忆/梦境写入文件后，逐个重新同步主会话的文件读取状态（记调试日志说明是内容还是仅时间变化），把解析成功的路径作为待通知的记忆更新入队。
 */
//@ chunk-xr4xc2mq.js:2141-2681 placement
async function resyncMemoryWrites(context, notice) {
  if (notice.paths.length === 0) return;
  let resolvedPaths = [];
  for (let path of notice.paths)
    try {
      let s = expandPath(path);
      resolvedPaths.push(s);
      let u = await logFileStateResync(context.readFileState, s, { requireReadBeforeWrite: !0 });
      if (u !== null)
        logForDebugging(
          `[memdir] re-synced readFileState for ${path} after the background ${notice.source} pass wrote it (${u === "changed" ? "content changed" : "mtime only, content identical"})`,
        );
    } catch (error) {
      logForDebugging(
        `[memdir] left ${jsonStringify(path)} out of the background ${notice.source} pass's change notice, could not resolve it: ${errorMessage(error)}`,
      );
    }
  if (resolvedPaths.length === 0) return;
  context.enqueuePendingMemoryUpdate({ ...notice, paths: uniq(resolvedPaths) });
}
//@ chunk-xr4xc2mq.js:2740-2759 placement
var weakSet = new WeakSet();
//@ chunk-xr4xc2mq.js:2759-2831 placement
function YBn(e) {
  return `the ${e.ruleBehavior} rule "${formatPermissionRule(e.ruleValue)}"`;
}
/**
 * 每个上下文只提示一次：某权限规则（拒绝或需逐次批准）阻止后台向记忆目录保存，规则移除后会恢复保存。
 */
//@ chunk-xr4xc2mq.js:2831-3233 placement
function describeMemoryRuleBlock(e, r, n) {
  if (weakSet.has(e)) return;
  weakSet.add(e);
  let o = `${YBn(r)} (from ${getSettingSourceDisplayNameLowercase(r.source)})`,
    s =
      r.ruleBehavior === "deny"
        ? `${o} blocks those writes`
        : `${o} needs your approval for each write, and background saving can't ask`;
  return `Claude isn't saving memories to ${n} in the background: ${s}. Saving resumes once that rule is removed or no longer covers that folder, and may then include what was skipped.`;
}
/**
 * 注册一个"saving memories"的回合后记忆任务（运行中、不写入记录），返回任务 id。
 */
//@ chunk-xr4xc2mq.js:3233-3429 placement
function registerPostTurnMemoryTask(e, r) {
  let n = generateTaskId("post_turn_memory"),
    o = {
      ...createTaskStateBase(n, "post_turn_memory", "saving memories"),
      type: "post_turn_memory",
      status: "running",
      skipTranscript: !0,
      abortController: r,
    };
  return (e.register(o), n);
}
/**
 * 把运行中的记忆任务标为结束状态（completed/failed/killed），并发出不写入记录的环境型任务通知。
 */
//@ chunk-xr4xc2mq.js:3429-3658 placement
function finishMemoryTask(e, r, n) {
  let o = !1;
  if (
    (r.update(e, (s) => {
      if (s.status !== "running") return s;
      return ((o = !0), { ...s, status: n, endTime: Date.now(), notified: !0, abortController: void 0 });
    }),
    o)
  )
    emitTaskNotification(e, n === "killed" ? "stopped" : n, { skipTranscript: !0, ambient: !0 });
}
//@ chunk-xr4xc2mq.js:3658-3825 placement
class MemoryExtractorSlots {
  extractor = null;
  drainer = async () => {};
  disarm = () => {};
  owedWithin = () => !1;
  onPassEnded = null;
  onPassSkipped = null;
  savePlace = null;
  restoredPlace = null;
  restoredPlaceAt = null;
}
//@ chunk-xr4xc2mq.js:3825-3850 placement
var te = new HostScoped(() => new MemoryExtractorSlots());
/**
 * 判断用户文字是否算"实质内容"的常量：最少词数、按字计词的文字系统正则（汉字/假名/泰文等）、问号字符集、可忽略的结尾字符正则。
 */
//@ chunk-xr4xc2mq.js:3850-4066 placement
var MIN_PROSE_WORDS = 2,
  CHAR_COUNTED_SCRIPTS_RE =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/gu,
  QUESTION_MARKS = new Set(["?", "\uFF1F", "\u061F"]),
  TRAILING_IGNORABLE_RE = /^[\s\p{P}\p{S}\p{M}]$/u;
//@ chunk-xr4xc2mq.js:4066-4114 placement
function xe(e) {
  return count(e.split(/\s+/), Boolean);
}
//@ chunk-xr4xc2mq.js:4114-4159 placement
function wt(e) {
  return e.match(CHAR_COUNTED_SCRIPTS_RE)?.length ?? 0;
}
//@ chunk-xr4xc2mq.js:4159-4205 placement
function Et(e, r) {
  return xe(e) >= r || wt(e) >= r * MIN_PROSE_WORDS;
}
//@ chunk-xr4xc2mq.js:4205-4264 placement
function Re(e) {
  return Math.max(xe(e), Math.floor(wt(e) / MIN_PROSE_WORDS));
}
//@ chunk-xr4xc2mq.js:4264-4352 placement
function bt(e) {
  if (e < 3) return "0-2";
  if (e < 10) return "3-9";
  if (e < 40) return "10-39";
  return "40+";
}
//@ chunk-xr4xc2mq.js:4352-4477 placement
function endsWithQuestion(e) {
  let r = [...e];
  for (let n = r.length - 1; n >= 0; n--) {
    let o = r[n];
    if (QUESTION_MARKS.has(o)) return !0;
    if (!TRAILING_IGNORABLE_RE.test(o)) return !1;
  }
  return !1;
}
//@ chunk-xr4xc2mq.js:4477-4537 placement
function Ye(e) {
  return e.type === "user" || e.type === "assistant";
}
/**
 * 统计指定消息之后的有效回合数；找不到该消息或未指定时统计全部。
 */
//@ chunk-xr4xc2mq.js:4537-4700 placement
function countTurnsSince(e, r) {
  if (r === null || r === void 0) return count(e, Ye);
  let n = !1,
    o = 0;
  for (let s of e) {
    if (!n) {
      if (s.uuid === r) n = !0;
      continue;
    }
    if (Ye(s)) o++;
  }
  if (!n) return count(e, Ye);
  return o;
}
//@ chunk-xr4xc2mq.js:4700-4709 placement
var Ot = 3;
//@ chunk-xr4xc2mq.js:4709-4797 placement
function Lt(e, r) {
  let n = new Set(r.map((o) => o.uuid));
  return e.filter((o) => !n.has(o.uuid));
}
//@ chunk-xr4xc2mq.js:4797-4895 placement
function It(e) {
  return e.some((r) => r.type === "attachment" && r.attachment.type === "max_turns_reached");
}
//@ chunk-xr4xc2mq.js:4895-4979 placement
function Ft(e) {
  return e.findLast((r) => r.type === "assistant")?.isApiErrorMessage === !0;
}
//@ chunk-xr4xc2mq.js:4979-5520 placement = hasSuccessfulToolCall (1)
function hasSuccessfulToolCall(e, r, n) {
  let o = r === void 0,
    s = new Set();
  for (let u of e) {
    if (!o) {
      if (u.uuid === r) o = !0;
      continue;
    }
    if (u.type === "user") {
      let content = u.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (block) => block.type === "tool_result" && block.is_error !== !0 && s.has(block.tool_use_id),
        )
      )
        return !0;
      continue;
    }
    if (u.type !== "assistant") continue;
    let content = u.message.content;
    if (!Array.isArray(content)) continue;
    for (let h of content) {
      if (n && h.type === "tool_use" && NPt.has(h.name)) return !0;
      if (h.type === "tool_use" && h.name === MEMORY_WRITE) {
        s.add(h.id);
        continue;
      }
      let x = collectReadToolFilePaths(h);
      if (x !== void 0 && isAutoMemPath(x)) return !0;
    }
  }
  return n && !o && hasSuccessfulToolCall(e, void 0, !0);
}
//@ chunk-xr4xc2mq.js:5520-5529 placement
var St = 3;
//@ chunk-xr4xc2mq.js:5529-5728 placement
function isSubstantialUserMessage(e) {
  if (e.type !== "user" || e.isMeta) return !1;
  let content = e.message.content;
  if (typeof content === "string") return xe(content) >= St;
  if (!Array.isArray(content)) return !1;
  return content.some((n) => n.type === "text" && xe(n.text) >= St);
}
/**
 * 从后往前找最后一个人类回合的 uuid（普通用户消息，或非元消息的队列命令附件的源 uuid），找不到时用备用消息的 uuid。
 */
//@ chunk-xr4xc2mq.js:5728-6037 placement
function getLastHumanTurnUuid(e, r) {
  for (let n = e.length - 1; n >= 0; n--) {
    let o = e[n];
    if (o === void 0 || !isHumanTurn(o)) continue;
    if (o.type === "user") {
      if (!o.isMeta) return o.uuid;
    } else if (
      o.type === "attachment" &&
      o.attachment.type === "queued_command" &&
      !o.attachment.isMeta &&
      o.attachment.source_uuid !== void 0
    )
      return o.attachment.source_uuid;
  }
  return r?.uuid;
}
/**
 * 判断指定消息之后是否有实质性的回合；找不到该消息时检查全部。
 */
//@ chunk-xr4xc2mq.js:6037-6173 placement
function hasSubstantialTurnSince(e, r) {
  let n = r === void 0;
  for (let o of e) {
    if (!n) {
      if (o.uuid === r) n = !0;
      continue;
    }
    if (isSubstantialUserMessage(o)) return !0;
  }
  if (!n) return e.some(isSubstantialUserMessage);
  return !1;
}
//@ chunk-xr4xc2mq.js:6173-6277 placement
function sliceAfterUuid(e, r) {
  if (r === void 0) return e;
  let index = e.findIndex((o) => o.uuid === r);
  return index === -1 ? e : e.slice(index + 1);
}
//@ chunk-xr4xc2mq.js:6277-6560 placement
function getUserTurnText(e) {
  if (e.type === "attachment") {
    let { attachment: attachment } = e;
    return attachment.type === "queued_command" && !attachment.isMeta
      ? contentToText(attachment.prompt)
      : void 0;
  }
  if (e.type !== "user" || e.isMeta || e.isCompactSummary) return;
  let content = e.message.content;
  if (Array.isArray(content) && content.every((n) => n.type === "tool_result")) return;
  return contentToText(content);
}
//@ chunk-xr4xc2mq.js:6560-6662 placement
function contentToText(e) {
  return typeof e === "string"
    ? e
    : e.filter((r) => r.type === "text").map((r) => r.text).join(`
`);
}
//@ chunk-xr4xc2mq.js:6662-6769 placement
function getAssistantPlainText(e) {
  if (e.type !== "assistant") return;
  let content = e.message.content;
  return Array.isArray(content) ? contentToText(content) : void 0;
}
/**
 * 判断最近一个用户回合是否值得记忆提取：窗口内有实质内容，或最后的用户文字非空且是在回答助手的提问。
 */
//@ chunk-xr4xc2mq.js:6769-6952 placement
function isMemoryCandidateTurn(e, r, n) {
  let at = e
    .flatMap((u, y) => {
      let h = getUserTurnText(u);
      return h === void 0 ? [] : [{ index: y, text: h }];
    })
    .at(-1);
  if (at === void 0) return !1;
  return Et(Qe(e, n), r) || (at.text.trim() !== "" && answersAssistantQuestion(e, at.index));
}
//@ chunk-xr4xc2mq.js:6952-7034 placement
function Qe(e, r) {
  return e.flatMap((n) => getUserTurnText(n) ?? []).slice(-Math.max(r, 1)).join(`
`);
}
//@ chunk-xr4xc2mq.js:7034-7176 placement
function answersAssistantQuestion(e, r) {
  for (let n = r - 1; n >= 0; n--) {
    let o = e[n];
    if (getUserTurnText(o) !== void 0) return !1;
    let s = getAssistantPlainText(o);
    if (s !== void 0 && s.trim() !== "") return endsWithQuestion(s);
  }
  return !1;
}
/**
 * 统计某 uuid 之后的用户回合：总回合数、人类亲写回合数与字数、任务通知回合数、无来源标记回合数、正文词数。
 */
//@ chunk-xr4xc2mq.js:7176-7698 placement
function summarizeUserTurns(messages, sinceUuid) {
  let turns = sliceAfterUuid(messages, sinceUuid).flatMap((s) => {
      let u = getUserTurnText(s);
      if (u === void 0) return [];
      let y =
        s.type === "attachment" && s.attachment.type === "queued_command"
          ? s.attachment.origin
          : s.type === "user"
            ? s.origin
            : void 0;
      return [{ message: s, text: u, origin: y }];
    }),
    ownWordsTurns = turns.filter((s) => isHumanTurn(s.message));
  return {
    userTurns: turns.length,
    ownWordsTurns: ownWordsTurns.length,
    ownWordsChars: ownWordsTurns.reduce((s, u) => s + u.text.length, 0),
    taskNotificationTurns: count(turns, (s) => s.origin?.kind === "task-notification"),
    unstampedTurns: count(turns, (s) => s.origin === void 0),
    proseWords: Re(
      turns.map((s) => s.text).join(`
`),
    ),
  };
}
//@ chunk-xr4xc2mq.js:7698-7895 placement = collectReadToolFilePaths (1)
function collectReadToolFilePaths(messages) {
  if (
    messages.type !== "tool_use" ||
    (messages.name !== FILE_EDIT_TOOL_NAME && messages.name !== FILE_WRITE_TOOL_NAME)
  )
    return;
  let input = messages.input;
  if (typeof input === "object" && input !== null && "file_path" in input) {
    let file_path = input.file_path;
    return typeof file_path === "string" ? file_path : void 0;
  }
  return;
}
/**
 * 记忆"初看"判断的常量：输出 token 上限、超时、只回答 JSON 的指令、分隔符、省略号，以及按"新/旧 × 用户/助手"排列的填充优先级。
 */
//@ chunk-xr4xc2mq.js:7895-8094 placement
var FIRST_LOOK_MAX_TOKENS = 64,
  FIRST_LOOK_TIMEOUT_MS = 20000,
  FIRST_LOOK_ANSWER_INSTRUCTION = 'Answer with JSON only: {"write_likely": true} or {"write_likely": false}.',
  EXCHANGE_SEPARATOR = `

`,
  ELLIPSIS = "\u2026",
  FILL_PRIORITY = [
    { fresh: !0, user: !0 },
    { fresh: !0, user: !1 },
    { fresh: !1, user: !0 },
    { fresh: !1, user: !1 },
  ];
/**
 * 为记忆"初看"挑选最近的对话片段：从后往前收集最多 N 个用户回合（跳过 API 错误、合成模型与任务通知），按"新的用户、新的助手、旧的用户、旧的助手"优先级装入字符预算（超出部分截取尾部），最新一条不是新消息时返回空。
 */
//@ chunk-xr4xc2mq.js:8094-8881 placement
function buildFirstLookExchanges(messages, sinceUuid, maxUserTurns, maxChars) {
  let s = sinceUuid === void 0 ? -1 : messages.findIndex((w) => w.uuid === sinceUuid),
    entries = [],
    y = 0;
  for (let w = messages.length - 1; w >= 0; w--) {
    let S = messages[w],
      M =
        S.type === "assistant"
          ? S.isApiErrorMessage || S.message.model === SYNTHETIC_MODEL
            ? void 0
            : getAssistantPlainText(S)
          : isTaskNotificationTurn(S)
            ? void 0
            : getUserTurnText(S);
    if (M === void 0 || M.trim() === "") continue;
    let E = S.type !== "assistant";
    if ((entries.push({ user: E, fresh: w > s, body: M.trim() }), E && ++y >= maxUserTurns)) break;
  }
  if (!entries[0]?.fresh) return { text: "", userTurns: 0 };
  let chosen = new Map(),
    budgetLeft = maxChars;
  for (let { fresh: fresh, user: user } of FILL_PRIORITY)
    for (let [M, E] of entries.entries()) {
      if (E.fresh !== fresh || E.user !== user) continue;
      let j = user ? "User: " : "Assistant: ",
        U = (chosen.size > 0 ? EXCHANGE_SEPARATOR.length : 0) + j.length;
      if (U + E.body.length <= budgetLeft) {
        (chosen.set(M, j + E.body), (budgetLeft -= U + E.body.length));
        continue;
      }
      let R = budgetLeft - U - ELLIPSIS.length;
      if (R > 0) chosen.set(M, j + ELLIPSIS + takeLastChars(E.body, R));
      budgetLeft = 0;
      break;
    }
  return {
    text: entries
      .map((w, S) => chosen.get(S))
      .filter((w) => w !== void 0)
      .reverse()
      .join(EXCHANGE_SEPARATOR),
    userTurns: y,
  };
}
/**
 * 用小模型做记忆提取前的"初看"：在超时内问模型最近对话是否可能需要写记忆（JSON 布尔），检查组织模型策略与托管拒绝；无法判断或出错时返回 error（不跳过本次提取）；返回判定、模型、耗时、输入长度与用户回合数。
 */
//@ chunk-xr4xc2mq.js:8881-10840 placement
async function runMemoryFirstLook({
  config: options,
  messages: messages,
  sinceUuid: sinceUuid,
  window: o,
  signal: signal,
  credentials: credentials,
}) {
  let now = Date.now(),
    model = options.model ?? "",
    inputText = "",
    userTurns = 0,
    finish = (M, exchanges) => {
      if (exchanges !== void 0) logFeatureSad("ccr_memory_first_look", exchanges);
      else if (M !== "empty") logFeatureOk("ccr_memory_first_look");
      return {
        verdict: M,
        error: exchanges,
        model: model,
        durationMs: Date.now() - now,
        inputChars: inputText.length,
        userTurns: userTurns,
      };
    },
    deadline = createCombinedAbortSignal(signal, { timeoutMs: FIRST_LOOK_TIMEOUT_MS, refTimer: !0 });
  try {
    let M = options.model ?? env.ANTHROPIC_SMALL_FAST_MODEL ?? getDefaultHaikuModel();
    model = options.model ?? getSmallFastModel();
    let E = buildFirstLookExchanges(messages, sinceUuid, o, options.maxInputChars);
    if (((inputText = E.text), (userTurns = E.userTurns), inputText === "")) return finish("empty");
    if (!isPermittedByOrgModelPolicy(model))
      return (
        logForDebugging(
          `[extractMemories] first look: ${model} is not permitted by the organization's model policy; the pass is not skipped`,
        ),
        finish("error", "policy")
      );
    if (unlessManagedDeniedModel(M) !== M || unlessManagedDeniedModel(model) !== model)
      return (
        logForDebugging(
          `[extractMemories] first look: managed settings deny the first look's model (${M}, sent as ${model}); the pass is not skipped`,
        ),
        finish("error", "managed_denied")
      );
    let [j, U] = getSideQueryThinkingSettings(model),
      R = tagUntrustedArtifactContent(messages, void 0, !1),
      X = R.length > 0 ? m3(R) : "",
      response = await raceWithAbortSignal(
        aN({
          model: model,
          system: options.instruction,
          skipSystemPromptPrefix: !0,
          messages: [
            {
              role: "user",
              content: `${X}<exchanges>
${inputText}
</exchanges>

${FIRST_LOOK_ANSWER_INSTRUCTION}`,
            },
          ],
          max_tokens: FIRST_LOOK_MAX_TOKENS + U,
          thinking: j,
          output_format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: { write_likely: { type: "boolean" } },
              required: ["write_likely"],
              additionalProperties: !1,
            },
          },
          timeout: FIRST_LOOK_TIMEOUT_MS,
          maxRetries: 0,
          signal: deadline.signal,
          forceAttributionHeader: !0,
          querySource: "extract_memories_first_look",
          credentials: credentials,
        }),
        deadline.signal,
        () => new AbortError(),
      ),
      found = response.content.find((le) => le.type === "text"),
      B = found?.type === "text" ? safeParseJSON($U(found.text), !1) : null,
      writeLikely = typeof B === "object" && B !== null && "write_likely" in B ? B.write_likely : void 0;
    if (typeof writeLikely !== "boolean")
      return (
        logForDebugging(
          `[extractMemories] first look: the model did not answer {"write_likely": true|false} (stop reason ${response.stop_reason}); the pass is not skipped`,
        ),
        finish("error", "no_boolean")
      );
    return finish(writeLikely ? "yes" : "no");
  } catch (error) {
    return (
      logForDebugging(`[extractMemories] first look failed: ${errorMessage(error)}; the pass is not skipped`),
      finish(
        "error",
        error instanceof fT || (deadline.signal.aborted && !signal.aborted)
          ? "timeout"
          : isAbortError(error)
            ? "aborted"
            : "api_error",
      )
    );
  } finally {
    deadline.cleanup();
  }
}
//@ chunk-xr4xc2mq.js:10840-11072 placement
function isTaskNotificationTurn(e) {
  let r =
    e.type === "attachment" && e.attachment.type === "queued_command"
      ? resolveTaskNotificationOrigin(e.attachment.origin, e.attachment.commandMode)
      : e.type === "user"
        ? e.origin
        : void 0;
  return r?.kind === "task-notification" && r.subkind !== "scheduled-trigger";
}

export {
  YBn,
  describeMemoryRuleBlock,
  resyncMemoryWrites,
  collectReadToolFilePaths,
  Ot,
  te,
  countTurnsSince,
  hasSuccessfulToolCall,
  summarizeUserTurns,
  isMemoryCandidateTurn,
  hasSubstantialTurnSince,
  bt,
  Re,
  Qe,
  runMemoryFirstLook,
  registerPostTurnMemoryTask,
  getLastHumanTurnUuid,
  Lt,
  It,
  Ft,
  finishMemoryTask,
};
