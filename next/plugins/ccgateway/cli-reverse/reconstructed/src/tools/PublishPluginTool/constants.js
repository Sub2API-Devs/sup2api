/**
 * tools/PublishPluginTool/constants.ts
 *
 * 2.1.316 新增：PublishPlugin 工具的常量、冻结的提示文本与参数说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-crzaj3q3.js (39)
 * attribution: placement 39
 */
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  policyDenyKind,
  isPolicyDeniedByRefusedCacheHint,
  isPolicyAllowedInResponse,
} from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PLUGIN_PUBLISH_KEY } from "../../services/plugins/publish/publishGate.js";
import { getComplianceTaints } from "../../services/policyLimits/complianceTaints.js";
import { formatFileSize } from "../../utils/format.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";
import { printableName } from "../../utils/printableName.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  _enum,
  array,
  numberSchema,
  booleanSchema,
  zodStrictObject,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-crzaj3q3.js:764-799 placement
/**
 * 构造拒绝详情对象 {kind, details}。
 */
var refusalDetail = (kind, details) => ({
  kind,
  details,
});
//@ chunk-crzaj3q3.js:799-851 placement
/**
 * 构造拒绝结果 {kind:"refused", refusal}。
 */
var refusalResult = (kind, details = []) => ({
  kind: "refused",
  refusal: refusalDetail(kind, details),
});
//@ chunk-crzaj3q3.js:851-1049 placement
var CLOUD_SESSION_PUBLISH_TEXT =
  "Publishing from a cloud session isn't offered yet, and the plugin's files are in this cloud session, where the Claude app or a terminal on your computer can't reach them. Nothing was sent.";
//@ chunk-crzaj3q3.js:1049-1092 placement
/**
 * 交互式会话且未禁用登录命令时才能提示 claude.ai 登录。
 */
var canOfferClaudeAiSignIn = () => !getIsNonInteractiveSession() && !env.DISABLE_LOGIN_COMMAND;
//@ chunk-crzaj3q3.js:1092-1230 placement
var isPolicyUnloaded = () => {
  let denyKind = policyDenyKind(ALLOW_PLUGIN_PUBLISH_KEY);
  return (
    (denyKind === "cache_miss" || denyKind === "route_missing") &&
    !isPolicyDeniedByRefusedCacheHint(ALLOW_PLUGIN_PUBLISH_KEY) &&
    isPolicyAllowedInResponse(
      {
        restrictions: {},
        compliance_taints: [],
      },
      ALLOW_PLUGIN_PUBLISH_KEY,
      getComplianceTaints(),
    )
  );
};
//@ chunk-crzaj3q3.js:1230-1413 placement
var POLICY_UNLOADED_TEXT =
  "Claude Code couldn't load your organization's policy, so publishing from here is off for now: try again in a moment, or publish this plugin from claude.ai. Nothing was sent.";
//@ chunk-crzaj3q3.js:1413-1430 placement
/**
 * 发布插件的大小上限（50 MiB）。
 */
var MAX_PUBLISH_BYTES = 52428800;
//@ chunk-crzaj3q3.js:1430-1442 placement
/**
 * 发布插件的文件数上限（10000）。
 */
var MAX_PUBLISH_FILES = 1e4;
//@ chunk-crzaj3q3.js:1442-6560 placement
var PUBLISH_UNAVAILABLE_TEXTS; // deferred: uses formatFileSize (../../utils/format.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-crzaj3q3.js:1442", () => {
  PUBLISH_UNAVAILABLE_TEXTS = Object.freeze({
    "flag-off": "Publishing plugins isn't available in this session. Nothing was sent.",
    "third-party":
      "Publishing goes through claude.ai, and this session uses another provider. Nothing was sent.",
    bare: "Publishing is off under --bare. Nothing was sent.",
    "traffic-off":
      "Publishing is off while nonessential traffic is disabled (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC). Nothing was sent.",
    policy:
      "Your organization's policy doesn't allow publishing from Claude Code: publish this plugin from claude.ai. Nothing was sent.",
    "cloud-session":
      "Publishing from a cloud session isn't offered yet. Publish from the Claude app or from a terminal on your own computer. Nothing was sent.",
    "signed-out": "Publishing needs a claude.ai sign-in. Sign in with /login, then publish again.",
    "no-organization":
      "This session is signed in by the app that started it, which didn't say which organization that is. Publish this plugin from claude.ai, or ask Claude in a terminal session signed in to claude.ai. Nothing was sent.",
    "nobody-to-ask":
      "Publishing waits for your answer, and this session has nobody to ask. Ask Claude to publish it in a session of your own. Nothing was sent.",
    "other-question":
      "The answer that came back was to another question than the one this session asked, so nothing was sent. Ask Claude to publish again.",
    "network-path":
      "That path names a place on the network, which publishing does not open. Nothing was read or sent.",
    "read-denied":
      "This session's permissions don't allow reading that folder, or a file in it that would be sent. Nothing was sent.",
    "write-denied":
      "This session's permissions don't allow writing the manifest this publish would add to the folder. Nothing was written or sent.",
    "no-folder": "No folder at that path. Nothing was sent.",
    "not-a-plugin":
      "That folder holds no plugin: no manifest, commands, skills, agents or hooks. Nothing was sent.",
    findings: "The plugin didn't pass validation. Fix these, then publish again. Nothing was sent.",
    "too-many-files": `The plugin has more than ${MAX_PUBLISH_FILES} files to send. Name what isn't part of it in .gitignore. Nothing was sent.`,
    "too-large": `The plugin is larger than ${formatFileSize(MAX_PUBLISH_BYTES)}, the most publishing sends. Nothing was published.`,
    unreadable: "Part of the folder couldn't be read, so nothing was sent.",
    changed: "The folder changed while it was being published, so nothing was sent. Publish again.",
    unwritten: "The manifest couldn't be written to .claude-plugin/plugin.json, so nothing was sent.",
    stopped: "Publishing was stopped.",
    failed: "Publishing ran into an error and stopped.",
    "not-served":
      "claude.ai doesn't offer publishing from Claude Code for your organization yet. Nothing was sent.",
    "publishing-off":
      "Your organization doesn't accept member submissions. The upload is on your own shelf on claude.ai (My Uploads), where only you see it and where you can remove it. An administrator chooses a publishing policy in the organization settings.",
    "creation-off":
      "Your organization has plugin creation turned off. An administrator turns it on in the organization settings on claude.ai.",
    exists: "A plugin of this name is already in your uploads on claude.ai, and it was not replaced.",
    invalid: "claude.ai didn't take the plugin: it failed validation.",
    "shelf-full": "Your uploads on claude.ai are full. Remove one there, then publish again.",
    scan: "The plugin didn't pass the security scan on claude.ai, so it wasn't submitted. It is on your own shelf, where only you see it.",
    "scan-pending": "The security scan of the plugin is still running. Publish again in a few minutes.",
    "not-current":
      "The new version is saved to your uploads on claude.ai, but it isn't the plugin's current version there, so nothing was sent to your organization. Open the plugin on claude.ai, make the new version current, and publish it from there.",
    "already-pending":
      "Your earlier submission of this plugin is still waiting for review. To send this version instead, withdraw that submission from the plugin's page on claude.ai, then publish again.",
    "installs-for-members":
      "A plugin published under this name may be installed automatically for some or all of your organization's members, so it can only be published from claude.ai. Nothing was sent to your organization. Publish it from your uploads on claude.ai.",
    "nothing-new": "This version is already in your organization's library.",
    "in-progress":
      "An earlier submission of this plugin is being published. Publish again once it is in the library.",
    "needs-admin": "This update needs an administrator: ask one to publish it from claude.ai.",
    "needs-org-settings":
      "This update needs a change to the organization's settings on claude.ai first. Ask an administrator.",
    "name-conflict":
      "An item with this name is already in your organization's library. Rename yours and publish again.",
    "library-full": "Your organization's library is full. An administrator makes room on claude.ai.",
    legal:
      "Your organization requires an attestation with each submission. Publish this plugin from claude.ai.",
    busy: "claude.ai was busy with this plugin or did not answer. Publish again in a moment.",
    other: "claude.ai didn't take the plugin.",
  });
});
//@ chunk-crzaj3q3.js:6560-6755 placement
var NO_CLAUDE_AI_SIGNIN_TEXT =
  "Publishing needs a claude.ai sign-in, and this session has none it can publish on. Publish this plugin from claude.ai, or ask Claude to publish it from a session signed in to claude.ai.";
//@ chunk-crzaj3q3.js:6755-6891 placement
function publishRefusalText(kind) {
  if (kind === "signed-out" && !canOfferClaudeAiSignIn()) return NO_CLAUDE_AI_SIGNIN_TEXT;
  if (kind === "policy" && isPolicyUnloaded()) return POLICY_UNLOADED_TEXT;
  if (kind === "cloud-session" && isRemoteCowork()) return CLOUD_SESSION_PUBLISH_TEXT;
  return PUBLISH_UNAVAILABLE_TEXTS[kind];
}
//@ chunk-crzaj3q3.js:6891-7129 placement
function sharePublishedLines(result) {
  return result.kind === "published"
    ? [
        "Send colleagues this link to add it: " + printableName(result.link),
        "In Claude Code, they can also add the organization library under " +
          "/plugin \u2192 Marketplaces, then run /plugin install " +
          printableName(result.install),
      ]
    : [];
}
//@ chunk-crzaj3q3.js:7129-7210 placement
/**
 * 生成 claude.ai 上插件管理页的链接。
 */
var pluginCustomizeUrl = (pluginId) =>
  `${getOauthConfig().CLAUDE_AI_ORIGIN}/customize/plugins/` + encodeURIComponent(pluginId);
//@ chunk-crzaj3q3.js:7210-7708 placement
var PUBLISH_OUTCOME_TEXTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-crzaj3q3.js:7210", () => {
  PUBLISH_OUTCOME_TEXTS = Object.freeze({
    published: "published to your organization's library.",
    "in-review":
      "uploaded to your shelf and sent to your organization for an administrator's review. It reaches the library once approved.",
    publishing: "uploaded to your shelf and approved. It is on its way into your organization's library.",
    "on-shelf":
      "uploaded to your own shelf on claude.ai, and not submitted yet: its scan was still running when the wait for it ended. Submit it from claude.ai once the scan has passed.",
  });
});
//@ chunk-crzaj3q3.js:7708-7718 placement
/**
 * 安全扫描结论的最大展示字符数（40）。
 */
var MAX_SCAN_VERDICT_CHARS = 40;
//@ chunk-crzaj3q3.js:7718-7813 placement
/**
 * 把扫描结论渲染成“Security scan on claude.ai: …”行。
 */
var securityScanLines = (outcome) =>
  [outcome.verdict ?? ""]
    .filter(Boolean)
    .map((verdict) => "Security scan on claude.ai: " + printableName(verdict, MAX_SCAN_VERDICT_CHARS));
//@ chunk-crzaj3q3.js:7813-8111 placement
var publishOutcomeLines = (outcome) => [
  PUBLISH_OUTCOME_TEXTS[outcome.kind],
  ...[outcome].flatMap((outcome) => ("verdict" in outcome ? [outcome] : [])).flatMap(securityScanLines),
  ...[outcome]
    .filter((outcome) => "isUnscanned" in outcome && outcome.isUnscanned)
    .map(() => "claude.ai didn't run a security scan on this plugin."),
  ...sharePublishedLines(outcome),
  ...[outcome]
    .flatMap((outcome) => ("id" in outcome ? [outcome.id] : []))
    .map((pluginId) => `Follow it on claude.ai: ${pluginCustomizeUrl(pluginId)}`),
];
//@ chunk-crzaj3q3.js:8111-8173 placement
/**
 * 把插件名与版本拼成展示名。
 */
var pluginNameLine = (manifest) => printableName([manifest.name, manifest.version].filter(Boolean).join(" "));
//@ chunk-crzaj3q3.js:8173-8249 placement
/**
 * 说明版本号来自插件自身而非库。
 */
var OWN_VERSION_NOTE = " (the plugin's own version; the library numbers its copies itself)";
//@ chunk-crzaj3q3.js:8249-8286 placement
/**
 * 插件名加版本说明，作为发布结果首行的前缀。
 */
var pluginNameWithNote = (manifest) => pluginNameLine(manifest) + (manifest.version ? OWN_VERSION_NOTE : "");
//@ chunk-crzaj3q3.js:8286-8439 placement
/**
 * 把插件发布结果转为展示行：被拒时给出拒绝原因说明与细节；否则按结果种类给出状态、扫描结论、未扫描提示、分享链接与 claude.ai 跟踪链接，首行前缀插件名。
 */
function publishResultLines(result) {
  return result.kind === "refused"
    ? [
        publishRefusalText(result.refusal.kind),
        ...result.refusal.details.map((detail) => printableName(detail)),
      ]
    : publishOutcomeLines(result).map(
        (line, lineIndex) => (lineIndex === 0 ? `${pluginNameWithNote(result.manifest)}: ` : "") + line,
      );
}
//@ chunk-crzaj3q3.js:8439-8477 placement
/**
 * 构造 {type:"other", reason} 形式的拒绝原因。
 */
var denialReason = (reason) => ({
  type: "other",
  reason,
});
//@ chunk-crzaj3q3.js:8477-8540 placement
/**
 * 构造 behavior=deny 的权限结果。
 */
var denyWithMessage = (reason) => ({
  behavior: "deny",
  message: reason,
  decisionReason: denialReason(reason),
});
//@ chunk-crzaj3q3.js:8540-8585 placement
/**
 * 把发布拒绝结果转成带展示文本的 deny 权限结果。
 */
var publishRefusalDenial = (kind, details = []) =>
  denyWithMessage(
    publishResultLines(refusalResult(kind, details)).join(`
`),
  );
//@ chunk-crzaj3q3.js:8585-8597 placement
/**
 * 发布审批问题里步骤文本的最大长度（300）。
 */
var MAX_PUBLISH_STEPS = 300;
//@ chunk-crzaj3q3.js:8597-8609 placement
/**
 * 单个写入文本的最大字符数（4000）。
 */
var MAX_PUBLISH_WRITE_TEXT_CHARS = 4000;
//@ chunk-crzaj3q3.js:8609-8620 placement
/**
 * 路径字段的额外字符余量。
 */
var MAX_PATH_EXTRA_CHARS = 128;
//@ chunk-crzaj3q3.js:8620-8633 placement
/**
 * 单个路径字段的基础上限（4096）。
 */
var MAX_PUBLISH_PATH_CHARS = 4096;
//@ chunk-crzaj3q3.js:8633-8650 placement
/**
 * 单个路径字段的最大字符数（2*4096+128）。
 */
var MAX_PUBLISH_META_CHARS = 2 * MAX_PUBLISH_PATH_CHARS + MAX_PATH_EXTRA_CHARS;
//@ chunk-crzaj3q3.js:8650-8662 placement
/**
 * 审批问题中各列表的最大条目数（500）。
 */
var MAX_PUBLISH_LIST_ITEMS = 500;
//@ chunk-crzaj3q3.js:8662-10431 placement
/**
 * 发布插件审批问题的数据结构：确认所绑定的摘要、组织、插件、目标文件夹、新建/替换、步骤、警告、写入的 manifest、发送的文件清单与大小、留在本机的条目及原因、完整清单文件。
 */
var PUBLISH_QUESTION_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-crzaj3q3.js:8662", () => {
  PUBLISH_QUESTION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      digest: stringSchema()
        .regex(SHA256_HEX_RE)
        .describe("What a yes binds to: the publish is of this, or refused."),
      title: stringSchema().max(MAX_PUBLISH_META_CHARS),
      organization: objectSchema({
        id: stringSchema().max(MAX_PUBLISH_META_CHARS),
        name: stringSchema().max(MAX_PUBLISH_META_CHARS).optional(),
      }),
      plugin: objectSchema({
        name: stringSchema().max(MAX_PUBLISH_META_CHARS),
        version: stringSchema().max(MAX_PUBLISH_META_CHARS).optional(),
      }),
      folder: stringSchema().max(MAX_PUBLISH_META_CHARS),
      mode: _enum(["new", "replace"]).describe("Whether a plugin of this name on the shelf is replaced."),
      steps: array(stringSchema().max(MAX_PUBLISH_META_CHARS))
        .max(MAX_PUBLISH_LIST_ITEMS)
        .describe("What a yes sets off, a sentence each, in order."),
      warnings: array(stringSchema().max(MAX_PUBLISH_META_CHARS))
        .max(MAX_PUBLISH_LIST_ITEMS)
        .describe(
          "What the person is warned of, a sentence each: a file sent although its name is one a secret hides under, and that other entries stay behind unnamed.",
        ),
      writes: objectSchema({
        path: stringSchema().max(MAX_PUBLISH_META_CHARS),
        text: stringSchema().max(MAX_PUBLISH_WRITE_TEXT_CHARS),
      })
        .optional()
        .describe("The manifest a yes writes into the folder first, if any."),
      sends: objectSchema({
        files: numberSchema(),
        bytes: numberSchema(),
      }).describe("The whole count and size of what is sent."),
      files: array(
        objectSchema({
          path: stringSchema().max(MAX_PUBLISH_META_CHARS),
          bytes: numberSchema(),
          sha256: stringSchema().regex(SHA256_HEX_RE),
          runs: booleanSchema().describe("Whether it is sent as runnable."),
        }),
      )
        .max(MAX_PUBLISH_LIST_ITEMS)
        .describe("The files sent, in the order of their paths."),
      staying: numberSchema().describe("How many entries stay on the machine and are counted here."),
      stays: array(
        objectSchema({
          path: stringSchema().max(MAX_PUBLISH_META_CHARS),
          why: _enum([
            "link",
            "hard-link",
            "ignored",
            "secret",
            "never",
            "generated",
            "special",
            "backslash",
          ]),
          words: stringSchema().max(MAX_PUBLISH_META_CHARS),
        }),
      )
        .max(MAX_PUBLISH_LIST_ITEMS)
        .describe("The entries that stay and are named, each with why."),
      list: objectSchema({
        sha256: stringSchema().regex(SHA256_HEX_RE),
        path: stringSchema().max(MAX_PUBLISH_META_CHARS).optional(),
      }).describe(
        "The list, a line each, of every file sent and every entry that stays and is named, and a last line saying so where entries stay unnamed: its sha256, and the file that holds it.",
      ),
      unnamed: objectSchema({
        files: numberSchema(),
        stays: numberSchema(),
      })
        .optional()
        .describe(
          "Present only when the lists are over the bound: how many files and entries they do not name. The list file names them.",
        ),
    }),
  );
});
//@ chunk-crzaj3q3.js:10431-10443 placement
/**
 * 单条文件说明的最大字符数（1024）。
 */
var MAX_PUBLISH_FILE_NOTE_CHARS = 1024;
//@ chunk-crzaj3q3.js:10443-10454 placement
/**
 * shown 字段的最大长度。
 */
var MAX_PUBLISH_SHOWN_CHARS = MAX_PUBLISH_META_CHARS;
//@ chunk-crzaj3q3.js:10454-10465 placement
/**
 * 审批问题文本的额外长度余量（100）。
 */
var MAX_PUBLISH_QUESTION_EXTRA = 100;
//@ chunk-crzaj3q3.js:10465-10481 placement
/**
 * 审批问题整体允许的最大长度。
 */
var MAX_PUBLISH_QUESTION_CHARS = 2 * MAX_PUBLISH_LIST_ITEMS + MAX_PUBLISH_QUESTION_EXTRA;
//@ chunk-crzaj3q3.js:10481-11516 placement
/**
 * PublishPlugin 工具的输入结构：插件目录、发布目标（组织库）、无 manifest 时用的描述、是否替换同名插件，以及由工具自己填写的 shown/question 字段。
 */
var PUBLISH_PLUGIN_INPUT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-crzaj3q3.js:10481", () => {
  PUBLISH_PLUGIN_INPUT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      path: stringSchema()
        .min(1)
        .max(MAX_PUBLISH_FILE_NOTE_CHARS)
        .describe(
          "The plugin's folder on this machine: the one that holds .claude-plugin/plugin.json, or a mod's hooks/ where there is no manifest yet.",
        ),
      destination: literal("organization")
        .optional()
        .describe(
          "Where to publish. The one destination is the library of the organization the session is signed in to.",
        ),
      description: stringSchema()
        .max(MAX_PUBLISH_STEPS)
        .optional()
        .describe(
          "What the plugin does, in a sentence: used only for a manifest written for a folder that has none.",
        ),
      replace: booleanSchema()
        .optional()
        .describe(
          "True only when the person said to replace the plugin of the same name that is already in their uploads on claude.ai.",
        ),
      shown: array(stringSchema().max(MAX_PUBLISH_SHOWN_CHARS))
        .max(MAX_PUBLISH_QUESTION_CHARS)
        .optional()
        .describe(
          "Leave out. The tool fills it for the question the person answers: the organization, the folder, the steps, and the files sent.",
        ),
      question: PUBLISH_QUESTION_SCHEMA()
        .optional()
        .describe(
          "Leave out. The tool fills it with the same question as data, for a surface that draws its own: what a yes binds to, every file sent, and the entries that stay and are named.",
        ),
    }),
  );
});
//@ chunk-crzaj3q3.js:11516-11528 placement
/**
 * 输出展示行的最大长度（4000）。
 */
var MAX_PUBLISH_OUTPUT_LINE_CHARS = 4000;
//@ chunk-crzaj3q3.js:11528-11619 placement
/**
 * 把发布结果转成工具输出对象（状态、拒绝原因与展示行）。
 */
var publishResultToToolOutput = (result) => ({
  state: result.kind,
  refusal: result.kind === "refused" ? result.refusal.kind : undefined,
  lines: publishResultLines(result),
});
//@ chunk-crzaj3q3.js:11619-11744 placement
/**
 * PublishPlugin 工具的输出结构：状态（已发布/审核中/发布中/已上架/被拒）、拒绝原因与展示行。
 */
var PUBLISH_PLUGIN_OUTPUT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-crzaj3q3.js:11619", () => {
  PUBLISH_PLUGIN_OUTPUT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      state: _enum(["published", "in-review", "publishing", "on-shelf", "refused"]),
      refusal: stringSchema().optional(),
      lines: array(stringSchema()),
    }),
  );
});
export {
  MAX_PUBLISH_META_CHARS,
  refusalResult,
  MAX_PUBLISH_PATH_CHARS,
  pluginNameLine,
  MAX_PUBLISH_LIST_ITEMS,
  publishRefusalDenial,
  MAX_PUBLISH_FILES,
  MAX_PUBLISH_STEPS,
  MAX_PUBLISH_BYTES,
  pluginCustomizeUrl,
  securityScanLines,
  PUBLISH_QUESTION_SCHEMA,
  MAX_PUBLISH_OUTPUT_LINE_CHARS,
  PUBLISH_PLUGIN_INPUT_SCHEMA,
  PUBLISH_PLUGIN_OUTPUT_SCHEMA,
  publishResultToToolOutput,
  publishResultLines,
};
