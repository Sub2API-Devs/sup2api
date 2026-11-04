/**
 * entrypoints/mcpServe/plainCallAsk.ts
 *
 * 2.1.316 新增。mcp serve 普通调用的"需要人批准"处理：按 anthropic/permissionAsks 元数据核对问题摘要与批准记录，未经人批准则不执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3kqfccv7.js (16)
 * attribution: placement 16
 */
import { createHash } from "crypto";
import { realpath, stat } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  zodStrictObject,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { INVISIBLE_CHAR_CLASS_SOURCE, escapeAngleBrackets } from "../../utils/sanitization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { safeParseJSON } from "../../utils/json.js";
import { isHostPersonOnlyCircuitBreaker } from "../../types/permissions.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-3kqfccv7.js:616-651 placement
var CALLER_ASKS_KEY = "anthropic/permissionAsks";
//@ chunk-3kqfccv7.js:651-701 placement
function holdsSafetyAsksCapability() {
  return {
    experimental: {
      [CALLER_ASKS_KEY]: {
        v: 1,
      },
    },
  };
}
//@ chunk-3kqfccv7.js:701-837 placement
var callerAsksCapabilitySchema = DoctorLazy(() =>
  objectSchema({
    experimental: objectSchema({
      [CALLER_ASKS_KEY]: objectSchema({
        v: literal(1),
      }),
    }),
  }),
);
var ANTHROPIC_PERMISSIONQUESTION = "anthropic/permissionQuestion";
var MAX_ASK_REASONS = 32;
var MAX_QUESTION_CHARS = 2000;
var MAX_REASON_CHARS = 1024;
var SEPARATOR_RUN_REGEX = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]+`, "gu");
//@ chunk-3kqfccv7.js:837-886 placement
function asShownOnACard(text) {
  return escapeAngleBrackets(text.replace(SEPARATOR_RUN_REGEX, "\uFFFD"));
}
//@ chunk-3kqfccv7.js:886-1227 placement
/**
 * permissionAsks 元数据 schema
 */
var permissionAskSchemas = DoctorLazy(() => stringSchema().regex(/^[0-9a-f]{64}$/));
var PlainCallAskApprovalSchema = DoctorLazy(() =>
  zodStrictObject({
    v: literal(1),
    approved: zodStrictObject({
      ask_digest: permissionAskSchemas(),
      attested: booleanSchema(),
    }).optional(),
  }),
);
var PlainCallAskResultSchema = DoctorLazy(() =>
  zodStrictObject({
    v: literal(1),
    outcome: literal("needs_approval"),
    ask_digest: permissionAskSchemas(),
    reasons: array(
      zodStrictObject({
        reason: stringSchema().min(1).max(MAX_QUESTION_CHARS),
        classifier_approvable: booleanSchema(),
        circuit_breaker: stringSchema().max(64).optional(),
        also: array(stringSchema().max(64)).max(MAX_ASK_REASONS).optional(),
      }),
    )
      .min(1)
      .max(MAX_ASK_REASONS),
  }),
);
//@ chunk-3kqfccv7.js:1227-1564 placement
function readCallerAsks(args) {
  let raw = isPlainObject(args) ? args[CALLER_ASKS_KEY] : undefined;
  if (raw === undefined)
    return {
      kind: "absent",
    };
  if (typeof raw !== "string" || raw.length > MAX_REASON_CHARS)
    return {
      kind: "unreadable",
    };
  let parsed = PlainCallAskApprovalSchema().safeParse(safeParseJSON(raw, false)).data;
  if (parsed === undefined)
    return {
      kind: "unreadable",
    };
  return parsed.approved === undefined
    ? {
        kind: "can_ask",
      }
    : {
        kind: "approved",
        askDigest: parsed.approved.ask_digest,
        attested: parsed.approved.attested,
      };
}
//@ chunk-3kqfccv7.js:1564-1757 placement
function toPermissionQuestionReason(reason, classifierApprovable, isHostPersonOnly = true) {
  return {
    reason: asShownOnACard(reason.reason),
    classifier_approvable:
      classifierApprovable && !(isHostPersonOnly && isHostPersonOnlyCircuitBreaker(reason)),
    ...(reason.circuitBreaker !== undefined && {
      circuit_breaker: reason.circuitBreaker,
    }),
    ...(reason.also !== undefined && {
      also: [...reason.also],
    }),
  };
}
//@ chunk-3kqfccv7.js:1757-1910 placement
function collectSafetyReasons(decisionReason) {
  if (decisionReason?.type === "safetyCheck") return [decisionReason];
  return decisionReason?.type === "subcommandResults"
    ? [...decisionReason.reasons.values()].flatMap((reason) => collectSafetyReasons(reason.decisionReason))
    : [];
}
//@ chunk-3kqfccv7.js:1910-2206 placement
/**
 * 收集 ask 规则与决策理由
 */
function collectAskReasons({ matchedAskRule, decisionReason }) {
  return [
    ...(matchedAskRule?.ruleBehavior === "ask" ? [permissionRuleAskReason(matchedAskRule)] : []),
    ...(decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask"
      ? [permissionRuleAskReason(decisionReason.rule)]
      : []),
    ...(decisionReason?.type === "other" ? [safetyCheckReason(decisionReason.reason)] : []),
    ...(decisionReason?.type === "subcommandResults"
      ? [...decisionReason.reasons.values()].flatMap((reason) =>
          reason.behavior === "ask" ? collectAskReasons(reason) : [],
        )
      : []),
  ];
}
//@ chunk-3kqfccv7.js:2206-2321 placement
function permissionRuleAskReason(rule) {
  return safetyCheckReason(
    `A permission rule says to ask a person before a call like this one: '${formatPermissionRule(rule.ruleValue)}'`,
  );
}
//@ chunk-3kqfccv7.js:2321-2395 placement
function safetyCheckReason(reason) {
  return {
    type: "safetyCheck",
    reason,
    classifierApprovable: false,
  };
}
//@ chunk-3kqfccv7.js:2395-2495 placement
function permissionQuestionDigest(name, args, { path, identity }, reasons) {
  return createHash("sha256")
    .update(jsonStringify([name, args, path, identity ?? null, reasons]))
    .digest("hex");
}
//@ chunk-3kqfccv7.js:2495-2915 placement
/**
 * 生成需人工批准的问题与理由
 */
function buildPermissionQuestion(tool, args, permissionResult, workspace) {
  let toReason = (item) => toPermissionQuestionReason(item, item.classifierApprovable);
  let mapped = collectSafetyReasons(permissionResult.decisionReason).map(toReason);
  let mapped_2 = collectAskReasons(permissionResult).map(toReason);
  let reasons =
    mapped_2.length === 0
      ? mapped
      : [
          ...mapped.toSorted(
            (leftReason, b) => Number(leftReason.classifier_approvable) - Number(b.classifier_approvable),
          ),
          ...mapped_2,
        ].map((reason) => ({
          ...reason,
          classifier_approvable: false,
        }));
  let deduped = uniqByExport(reasons, jsonStringify);
  if (deduped.length === 0 || deduped.length > MAX_ASK_REASONS) return;
  if (deduped.some((reason) => reason.reason.length > MAX_QUESTION_CHARS)) return;
  return {
    v: 1,
    outcome: "needs_approval",
    ask_digest: permissionQuestionDigest(tool.name, args, workspace, deduped),
    reasons: deduped,
  };
}
//@ chunk-3kqfccv7.js:2915-4490 placement
/**
 * mcp serve 普通调用的"需要人批准"处理：按 anthropic/permissionAsks 元数据核对问题摘要与批准记录，未经人批准则不执行。
 */
async function settlePlainCallAsk(args, tool, permissionResult, session, denial) {
  let callerAsks = readCallerAsks(args);
  if (callerAsks.kind === "absent") return "as_without_the_key";
  if (denial === undefined)
    return callerAsks.kind === "approved"
      ? rejectionResult(tool, "question_changed", ASK_CHANGED_TEXT)
      : "as_without_the_key";
  if (callerAsks.kind === "unreadable")
    return rejectionResult(
      tool,
      "asks_key_unreadable",
      `${denial.message} That needs a person's approval, and this server could not read its caller's offer to ask for one, so nobody was asked. Retrying won't help.`,
    );
  let cwd = getSessionProject(session).cwd;
  let workspace = {
    path: cwd,
    identity: await Promise.all([
      realpath(cwd),
      stat(cwd, {
        bigint: true,
      }),
    ]).then(
      ([realCwd, stats]) => (realCwd === cwd ? `${stats.dev}:${stats.ino}` : undefined),
      () => {
        return;
      },
    ),
  };
  if (workspace.identity === undefined)
    return callerAsks.kind === "approved"
      ? rejectionResult(tool, "question_changed", ASK_CHANGED_TEXT)
      : rejectionResult(
          tool,
          "start_folder_unconfirmed",
          `${denial.message} That needs a person's approval, and nobody was asked, because the working directory was moved, is gone or cannot be read. Change directory first, then send the call again.`,
        );
  let permissionQuestion = buildPermissionQuestion(tool, permissionResult, denial, workspace);
  if (permissionQuestion === undefined)
    return rejectionResult(
      tool,
      "question_too_large",
      `${denial.message} The permission check's objections are too many, or one is too long, for this server to put to a person, so nobody was asked. Send smaller calls, or use shorter paths.`,
    );
  switch (callerAsks.kind) {
    case "can_ask":
      logFeatureSad("mcp_serve_plain_call", "asked");
      return {
        rejection: `${tool.name} was not run: ${denial.message} A person has to approve this call, and none did. Tell the user what you wanted to run and why.`,
        meta: {
          [ANTHROPIC_PERMISSIONQUESTION]: permissionQuestion,
        },
      };
    case "approved":
      if (!callerAsks.attested)
        return rejectionResult(
          tool,
          "approval_not_from_person",
          "the approval sent with this call did not come from a person, and only a person's counts. Tell the user what you wanted to run and why.",
        );
      return permissionQuestion.ask_digest === callerAsks.askDigest
        ? "run"
        : rejectionResult(tool, "question_changed", ASK_CHANGED_TEXT);
  }
}
//@ chunk-3kqfccv7.js:4490-4820 placement
/**
 * 批准后条件已变的说明
 */
var ASK_CHANGED_TEXT =
  "what a person approved is no longer what this call would do: the working directory, or what the permission check found, has changed since, or the working directory was moved, is gone or cannot be read. If it was moved, is gone or cannot be read, change directory first. Then send the call again to have it checked afresh.";
//@ chunk-3kqfccv7.js:4820-4915 placement
function rejectionResult(tool, code, text) {
  logFeatureSad("mcp_serve_plain_call", code);
  return {
    rejection: `${tool.name} was not run: ${text}`,
  };
}
export {
  asShownOnACard,
  toPermissionQuestionReason,
  collectSafetyReasons,
  readCallerAsks,
  CALLER_ASKS_KEY,
  settlePlainCallAsk,
  holdsSafetyAsksCapability,
};
