/**
 * services/artifacts/artifactAddonTools.ts
 *
 * 2.1.316 新增：Artifact addon 工具定义。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cqgek8qx.js (14)
 * attribution: placement 14
 */
import {
  republishWatchParagraph,
  liftPromptParagraphs,
  commentsWatchUnavailableNote,
} from "../../tools/ArtifactTool/pagePrompt.js";
import {
  ARTIFACT_TOOL_NAME,
  ArtifactInputError,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import {
  commentsPromptParagraphs,
  dbPromptParagraph,
  DB_PROFILES_PROMPT_PARAGRAPH,
  EMULATOR_PREVIEW_PROMPT_PARAGRAPH,
  PREVIEW_PROMPT_PARAGRAPH,
  VERIFY_PROMPT_PARAGRAPH,
} from "../../tools/ArtifactTool/promptText.js";
import { previewEngineKind, isArtifactPreviewEnabled } from "../artifactPreview/browserDiscovery.js";
import {
  ADDON_OF_LEGACY_ACTION,
  toParentArtifactInput,
  fromParentArtifactInput,
} from "./artifactToolActions.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_HEAD } from "../../tools/ArtifactTool/ArtifactTool.js";
import { vZe, isArtifactVerifyEnabled } from "./artifactPromptText.js";
import { isBuiltInArtifactHiddenForMcp } from "./artifactsMcpTools.js";
import { askCardFor, withAskDecisionRecording } from "../../tools/ArtifactTool/artifactAskMessages.js";
import {
  mapUpdatedInput,
  legacyCheckPermissions,
  legacyAskRule,
} from "../../tools/ArtifactTool/permissions/legacyPermissions.js";
import { applyAskRuleOverride } from "../../utils/permissions/permissions.js";
import { artifactSchemaGates } from "./artifactToolSchema.js";
import { e0s, t0s, n0s } from "../../tools/ArtifactTool/inputSchema.js";

//@ chunk-cqgek8qx.js:13430-13481 placement
function h() {
  return require("./chunk-2rzz5p5d.js");
}
//@ chunk-cqgek8qx.js:13481-13524 placement
function a() {
  return h().artifactLegacyHost;
}
/**
 * 各 addon 工具（comments/data/check）里旧 Artifact 动作名的改写规则（把提示词里的旧动作改成新工具的写法），以及校验失败时告诉模型"该动作在本工具里怎么写"的映射。
 */
//@ chunk-cqgek8qx.js:13524-14395 placement
var LEGACY_VERB_REWRITES = {
    comments: [
      [/action:? "comments"/g, 'action "read"'],
      [/action:? "unwatch"/g, 'action "watch" with `on: false`'],
      [/action:? "status"/g, 'action "watch" with no `url`'],
      [/action:? "resume_replies"|\bresume_replies\b/g, 'action "watch" with `replies: true`'],
    ],
    data: [
      [/action:? "(?:read_db|write_db)" with db_op /g, "action "],
      [/\bdb_op\b/g, "action"],
      [/action:? "read_db"|\bread_db\b/g, "a read (get, list, query or profiles)"],
      [/action:? "write_db"|\bwrite_db\b/g, "a write (set, update, delete or batch)"],
    ],
    check: [],
  },
  LEGACY_VERB_STEERS = {
    comments: {
      comments: '`action: "read"`',
      status: '`action: "watch"` with no `url`',
      unwatch: '`action: "watch"` with `on: false`',
      resume_replies: '`action: "watch"` with `replies: true`',
    },
    data: {
      read_db: 'as the read itself \u2014 `action`: "get", "list" or "query"',
      write_db: 'as the write itself \u2014 `action`: "set", "update", "delete" or "batch"',
    },
    check: {},
  };
//@ chunk-cqgek8qx.js:14395-14465 placement
function p(e, o) {
  let i = o;
  for (let [l, t] of LEGACY_VERB_REWRITES[e]) i = i.replace(l, t);
  return i;
}
/**
 * 把评论工具提示词改写为合并后 artifact 工具写法的替换表（comments→read、status→watch 列表、unwatch→watch on:false 等）。
 */
//@ chunk-cqgek8qx.js:14465-14895 placement
var COMMENTS_PROMPT_REWRITES = [
  ['`action: "comments"`', '`action: "read"`'],
  ['`action: "status"` lists', '`action: "watch"` with no `url` lists'],
  [" (pass `url` to check one)", ""],
  ['`action: "unwatch"` with `url`', '`action: "watch"` with `on: false` and its `url`'],
  ["`status` shows", "that listing shows"],
  ["that artifact's `status` row says", "that artifact's row in that listing says"],
  ["a watch result, `status`, or", "a watch result, that listing, or"],
];
//@ chunk-cqgek8qx.js:14895-14971 placement
function R(e) {
  let o = republishWatchParagraph(!0, e);
  for (let [i, l] of COMMENTS_PROMPT_REWRITES) o = o.replaceAll(i, l);
  return o;
}
/**
 * 生成 ArtifactComments 工具的提示词：读/答评论线程与管理监听的说明、按 watchRail 改写的评论段落、监听段落；live 时附"恢复自动回复"说明。
 */
//@ chunk-cqgek8qx.js:14971-16198 placement
function buildCommentsToolPrompt(gates) {
  let o = [
    `Read and answer the comment threads people leave on a published artifact, and manage this session's artifact watches. Publishing and reading the artifact itself is the \`${ARTIFACT_TOOL_NAME}\` tool's job; every call here names the artifact by its \`url\`. When the Artifact tool says an artifact is a Claude Doc, leave new comments through the document's own connector tools: search the available tools for them. This tool reads, replies to and resolves existing threads.`,
    liftPromptParagraphs(
      commentsPromptParagraphs(gates.watchRail === "none" ? commentsWatchUnavailableNote() : ""),
      [['`action: "comments"`', '`action: "read"`']],
    ),
    R(gates.watchRail),
  ];
  if (gates.watchRail === "live")
    o.push(
      "**Resuming automatic replies**: `action: \"watch\"` with `replies: true` and the artifact's `url` re-enables automatic comment replies that were stopped or paused for it (they stop when their live-updates task is killed or the watch is stopped, and pause \u2014 the watch kept, until the user's next message \u2014 when the user interrupts the session with Ctrl+C / Stop). Use it ONLY when the user has explicitly asked to resume auto-replies; it is approved the way a publish is (a prompt in default mode) and cannot undo the session-wide auto-reply disarm from the kill-all-agents gesture.",
    );
  return o.join(`

`);
}
/**
 * 把数据库读写提示词改写为合并后 artifact 工具写法的替换表（read_db/write_db 改为按 action 区分）。
 */
//@ chunk-cqgek8qx.js:16198-16499 placement
var DATA_PROMPT_REWRITES = [
  [
    'these actions read and write it as the user. Pass `action: "read_db"` with the artifact\'s `url` and `db_op`:',
    "this tool reads and writes it as the user; every call takes the artifact's `url`. To read, pass `action`:",
  ],
  ['Pass `action: "write_db"` with `db_op`:', "To write, pass `action`:"],
];
/**
 * 生成 ArtifactData 工具的提示词：说明它是页面共享数据库，附改写后的数据库操作段落与 profiles 段落。
 */
//@ chunk-cqgek8qx.js:16499-16674 placement
function buildDataToolPrompt(e) {
  return [
    `The artifact itself is published and read with the \`${ARTIFACT_TOOL_NAME}\` tool; this tool is its page's shared database.`,
    liftPromptParagraphs(dbPromptParagraph(e.dbStrReplaceOn), DATA_PROMPT_REWRITES),
    DB_PROFILES_PROMPT_PARAGRAPH,
  ].join(`

`);
}
/**
 * 生成 ArtifactCheck 工具的提示词：按 preview/verify 开关说明发布前预览（本地或模拟器）与发布后校验。
 */
//@ chunk-cqgek8qx.js:16674-16904 placement
function buildCheckToolPrompt(e) {
  return [
    `Check a page ${e.previewOn && e.verifyOn ? "before or after" : e.previewOn ? "before" : "after"} publishing it with the \`${ARTIFACT_TOOL_NAME}\` tool.`,
    ...(e.previewOn
      ? [previewEngineKind() === "emulator" ? EMULATOR_PREVIEW_PROMPT_PARAGRAPH : PREVIEW_PROMPT_PARAGRAPH]
      : []),
    ...(e.verifyOn ? [VERIFY_PROMPT_PARAGRAPH] : []),
  ].join(`

`);
}
//@ chunk-cqgek8qx.js:16904-17153 placement
function getAddonSearchHint(e) {
  let mapped = Object.entries(ADDON_OF_LEGACY_ACTION)
      .filter(([l, t]) => t === e.addon && (e.offersLegacyVerb?.(l) ?? !0))
      .map(([l]) => l),
    i = typeof e.searchHint === "function" ? e.searchHint() : e.searchHint;
  return mapped.length === 0 ? i : `${i} (formerly the ${ARTIFACT_TOOL_NAME} tool's ${mapped.join(", ")})`;
}
//@ chunk-cqgek8qx.js:17153-17283 placement
function runWithEngine(e, o) {
  if (!e.runEngine) throw Error("Artifact: this member needs the executor (call.runEngine)");
  return e.runEngine(o, {});
}
/**
 * 用 Artifact 主工具的实现包装出一个 addon 工具（comments/data/check）：输入先转成主工具输入，权限检查、校验、调用、摘要、分类器输入等全部委托主工具，错误消息改写成本工具的动作名；不可用旧动作时给出拼写提示。
 */
//@ chunk-cqgek8qx.js:17283-19830 placement
function buildArtifactAddonTool(spec) {
  let toParentInput = (t) => toParentArtifactInput(spec.addon, t),
    fromParentInput = (t) => fromParentArtifactInput(spec.addon, t),
    tool = buildTool({
      name: spec.name,
      get searchHint() {
        return getAddonSearchHint(spec);
      },
      shouldDefer: !0,
      briefStandalone: ARTIFACT_TOOL_HEAD.briefStandalone,
      familyParentToolName: ARTIFACT_TOOL_NAME,
      mintsArtifactKeys: () => !0,
      toFamilyParentInput: (t) => toParentInput(t),
      ruleContentField: ARTIFACT_TOOL_HEAD.ruleContentField,
      getPath: (t) => a().getPath(toParentInput(t)),
      backgrounding: "never",
      maxResultSizeChars: ARTIFACT_TOOL_HEAD.maxResultSizeChars,
      persistenceThresholdCeiling: ARTIFACT_TOOL_HEAD.persistenceThresholdCeiling,
      skipAggregateToolResultBudget: ARTIFACT_TOOL_HEAD.skipAggregateToolResultBudget,
      preserveToolUseResultInSubagents: ARTIFACT_TOOL_HEAD.preserveToolUseResultInSubagents,
      stripToolUseResultAtCreation: ARTIFACT_TOOL_HEAD.stripToolUseResultAtCreation,
      stripForStorage: (...t) => a().stripForStorage(...t),
      userFacingName: () => ARTIFACT_TOOL_NAME,
      get inputSchema() {
        return spec.inputSchema();
      },
      get outputSchema() {
        return a().outputSchema;
      },
      isEnabled: () => vZe(spec.addon) && !isBuiltInArtifactHiddenForMcp(),
      isConcurrencySafe: (t) => a().isConcurrencySafe(toParentInput(t)),
      isReadOnly: (t) => a().isReadOnly(toParentInput(t)),
      isDestructive: (t) => a().isDestructive(toParentInput(t)),
      ignoresWholeToolAllowRule: (t) => a().ignoresWholeToolAllowRule(toParentInput(t)),
      suppressesAlwaysAllowRule: (t) => a().suppressesAlwaysAllowRule(toParentInput(t)),
      permissionCard: askCardFor,
      create() {
        return {
          permissionCheckFailureDecision: (t, n) =>
            runWithEngine(n, ({ toolUseContext: toolUseContext }) => {
              let r = toParentInput(t);
              return mapUpdatedInput(
                legacyCheckPermissions(
                  spec.name,
                  () => a().permissionCheckFailureDecision(r, toolUseContext),
                  r,
                  r,
                  toolUseContext,
                  h().artifactRuleTargetInput,
                ),
                fromParentInput,
              );
            }),
          checkPermissions: (t, n) =>
            runWithEngine(n, async ({ toolUseContext: toolUseContext }) => {
              let r = toParentInput(t);
              return mapUpdatedInput(
                await applyAskRuleOverride(
                  await a().checkPermissions(r, toolUseContext),
                  legacyAskRule(toolUseContext, r, h().artifactRuleTargetInput),
                  () => a().description(r),
                ),
                fromParentInput,
              );
            }),
          validateInput: (t, n) =>
            runWithEngine(n, async ({ toolUseContext: toolUseContext }) => {
              let r = spec.contradiction?.(t);
              if (r !== void 0) return { result: !1, message: r, errorCode: 8 };
              let validateInput = await a().validateInput(toParentInput(t), toolUseContext);
              return validateInput.result
                ? validateInput
                : { ...validateInput, message: p(spec.addon, validateInput.message) };
            }),
          call: (t, n) =>
            runWithEngine(n, async ({ toolUseContext: toolUseContext, canUseTool: canUseTool }) => {
              let c = [toolUseContext, canUseTool, n.parentMessage, n.onProgress];
              try {
                return await a().call(toParentInput(t), ...c);
              } catch (error) {
                if (error instanceof ArtifactInputError) error.message = p(spec.addon, error.message);
                throw error;
              }
            }),
        };
      },
      toAutoClassifierInput: (t) => a().toAutoClassifierInput(toParentInput(t)),
      staleServerClassifierContext: (t, n, s) => a().staleServerClassifierContext(toParentInput(t), n, s),
      description: (t, ...n) => a().description(toParentInput(t), ...n),
      getToolUseSummary: (t) => a().getToolUseSummary(toParentInput(t)),
      prompt: async () => spec.prompt(artifactSchemaGates()),
      validationErrorSteer(t) {
        let n = t?.action,
          s = LEGACY_VERB_STEERS[spec.addon],
          r = typeof n === "string" && Object.hasOwn(s, n) ? s[n] : void 0;
        return r === void 0 ? null : `action "${n}" is spelled ${r} in this tool.`;
      },
      mapToolResultToToolResultBlockParam: (...t) => a().mapToolResultToToolResultBlockParam(...t),
      restoreTransientForRemap: (...t) => a().restoreTransientForRemap(...t),
    });
  return withAskDecisionRecording(tool);
}
/**
 * 三个 Artifact addon 工具实例：ArtifactComments（读/答评论、监听重发布，watch 时 on:false 与 replies:true 互斥）、ArtifactData（共享数据库读写）、ArtifactCheck（预览/运行时诊断）；ARTIFACT_ADDON_TOOLS 为三者列表。
 */
//@ chunk-cqgek8qx.js:19830-20590 placement
var ARTIFACT_COMMENTS_TOOL = buildArtifactAddonTool({
    addon: "comments",
    name: ARTIFACT_COMMENTS_TOOL_NAME,
    searchHint: "read and reply to comment threads on a published artifact; watch it for republishes",
    inputSchema: e0s,
    prompt: buildCommentsToolPrompt,
    contradiction: (e) =>
      e.action === "watch" && e.on === !1 && e.replies === !0
        ? "watch: `on: false` stops the watch and `replies: true` resumes automatic replies on it \u2014 pass one, not both"
        : void 0,
  }),
  ARTIFACT_DATA_TOOL = buildArtifactAddonTool({
    addon: "data",
    name: ARTIFACT_DATA_TOOL_NAME,
    searchHint: "read and write a published artifact's shared database",
    inputSchema: t0s,
    prompt: buildDataToolPrompt,
  }),
  ARTIFACT_CHECK_TOOL = buildArtifactAddonTool({
    addon: "check",
    name: ARTIFACT_CHECK_TOOL_NAME,
    searchHint: () =>
      [
        isArtifactPreviewEnabled()
          ? previewEngineKind() === "emulator"
            ? "look at a page in the artifact viewer"
            : "preview a page locally"
          : "",
        isArtifactVerifyEnabled() ? "read viewers' runtime diagnostics" : "",
      ]
        .filter(Boolean)
        .join(" and "),
    inputSchema: n0s,
    prompt: buildCheckToolPrompt,
    offersLegacyVerb: (e) => (e === "verify" ? isArtifactVerifyEnabled() : isArtifactPreviewEnabled()),
  }),
  ARTIFACT_ADDON_TOOLS = [ARTIFACT_COMMENTS_TOOL, ARTIFACT_DATA_TOOL, ARTIFACT_CHECK_TOOL];
