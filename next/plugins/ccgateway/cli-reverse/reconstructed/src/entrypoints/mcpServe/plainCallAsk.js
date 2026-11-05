/**
 * entrypoints/mcpServe/plainCallAsk.ts
 *
 * 2.1.316 新增。mcp serve 普通调用的"需要人批准"处理：按 anthropic/permissionAsks 元数据核对问题摘要与批准记录，未经人批准则不执行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsbhp6w8.js (16)
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
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tsbhp6w8.js:649-684 placement
var CALLER_ASKS_KEY = "anthropic/permissionAsks";
//@ chunk-tsbhp6w8.js:684-734 placement
function holdsSafetyAsksCapability() {
  return {
    experimental: {
      [CALLER_ASKS_KEY]: {
        v: 1,
      },
    },
  };
}
//@ chunk-tsbhp6w8.js:734-870 placement
var callerAsksCapabilitySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ANTHROPIC_PERMISSIONQUESTION;
var MAX_ASK_REASONS;
var MAX_QUESTION_CHARS;
var MAX_REASON_CHARS;
var SEPARATOR_RUN_REGEX;
deferInit("chunk-tsbhp6w8.js:734", () => {
  callerAsksCapabilitySchema = DoctorLazy(() =>
    objectSchema({
      experimental: objectSchema({
        [CALLER_ASKS_KEY]: objectSchema({
          v: literal(1),
        }),
      }),
    }),
  );
  ANTHROPIC_PERMISSIONQUESTION = "anthropic/permissionQuestion";
  MAX_ASK_REASONS = 32;
  MAX_QUESTION_CHARS = 2000;
  MAX_REASON_CHARS = 1024;
  SEPARATOR_RUN_REGEX = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]+`, "gu");
});
//@ chunk-tsbhp6w8.js:870-919 placement
function asShownOnACard(text) {
  return escapeAngleBrackets(text.replace(SEPARATOR_RUN_REGEX, "\uFFFD"));
}
//@ chunk-tsbhp6w8.js:919-1260 placement
/**
 * permissionAsks 元数据 schema
 */
var permissionAskSchemas; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PlainCallAskApprovalSchema;
var PlainCallAskResultSchema;
deferInit("chunk-tsbhp6w8.js:919", () => {
  permissionAskSchemas = DoctorLazy(() => stringSchema().regex(/^[0-9a-f]{64}$/));
  PlainCallAskApprovalSchema = DoctorLazy(() =>
    zodStrictObject({
      v: literal(1),
      approved: zodStrictObject({
        ask_digest: permissionAskSchemas(),
        attested: booleanSchema(),
      }).optional(),
    }),
  );
  PlainCallAskResultSchema = DoctorLazy(() =>
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
});
//@ chunk-tsbhp6w8.js:1260-1597 placement
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
//@ chunk-tsbhp6w8.js:1597-1790 placement
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
//@ chunk-tsbhp6w8.js:1790-1943 placement
function collectSafetyReasons(decisionReason) {
  if (decisionReason?.type === "safetyCheck") return [decisionReason];
  return decisionReason?.type === "subcommandResults"
    ? [...decisionReason.reasons.values()].flatMap((reason) => collectSafetyReasons(reason.decisionReason))
    : [];
}
//@ chunk-tsbhp6w8.js:1943-2239 placement
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
//@ chunk-tsbhp6w8.js:2239-2354 placement
function permissionRuleAskReason(rule) {
  return safetyCheckReason(
    `A permission rule says to ask a person before a call like this one: '${permissionRuleValueFromString(rule.ruleValue)}'`,
  );
}
//@ chunk-tsbhp6w8.js:2354-2428 placement
function safetyCheckReason(reason) {
  return {
    type: "safetyCheck",
    reason,
    classifierApprovable: false,
  };
}
//@ chunk-tsbhp6w8.js:2428-2528 placement
function permissionQuestionDigest(name, args, { path, identity }, reasons) {
  return createHash("sha256")
    .update(jsonStringify([name, args, path, identity ?? null, reasons]))
    .digest("hex");
}
//@ chunk-tsbhp6w8.js:2528-2948 placement
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
//@ chunk-tsbhp6w8.js:2948-4523 placement
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
//@ chunk-tsbhp6w8.js:4523-4853 placement
/**
 * 批准后条件已变的说明
 */
var ASK_CHANGED_TEXT =
  "what a person approved is no longer what this call would do: the working directory, or what the permission check found, has changed since, or the working directory was moved, is gone or cannot be read. If it was moved, is gone or cannot be read, change directory first. Then send the call again to have it checked afresh.";
//@ chunk-tsbhp6w8.js:4853-4948 placement
function rejectionResult(tool, code, text) {
  logFeatureSad("mcp_serve_plain_call", code);
  return {
    rejection: `${tool.name} was not run: ${text}`,
  };
}
export {
  readCallerAsks,
  CALLER_ASKS_KEY,
  settlePlainCallAsk,
  asShownOnACard,
  toPermissionQuestionReason,
  collectSafetyReasons,
  holdsSafetyAsksCapability,
};
