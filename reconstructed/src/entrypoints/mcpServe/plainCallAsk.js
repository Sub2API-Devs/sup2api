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
import { u, literal, string, zodStrictObject, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { INVISIBLE_CHAR_CLASS_SOURCE, escapeAngleBrackets } from "../../utils/sanitization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { safeParseJSON } from "../../utils/json.js";
import { isHostPersonOnlyCircuitBreaker } from "../../types/permissions.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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
  u({
    experimental: u({
      [CALLER_ASKS_KEY]: u({
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
function asShownOnACard(n) {
  return escapeAngleBrackets(n.replace(SEPARATOR_RUN_REGEX, "\uFFFD"));
}
//@ chunk-3kqfccv7.js:886-1227 placement
/**
 * permissionAsks 元数据 schema
 */
var permissionAskSchemas = DoctorLazy(() => string().regex(/^[0-9a-f]{64}$/));
var PlainCallAskApprovalSchema = DoctorLazy(() =>
  zodStrictObject({
    v: literal(1),
    approved: zodStrictObject({
      ask_digest: permissionAskSchemas(),
      attested: M(),
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
        reason: string().min(1).max(MAX_QUESTION_CHARS),
        classifier_approvable: M(),
        circuit_breaker: string().max(64).optional(),
        also: array(string().max(64)).max(MAX_ASK_REASONS).optional(),
      }),
    )
      .min(1)
      .max(MAX_ASK_REASONS),
  }),
);
//@ chunk-3kqfccv7.js:1227-1564 placement
function readCallerAsks(n) {
  let e = isPlainObject(n) ? n[CALLER_ASKS_KEY] : undefined;
  if (e === undefined)
    return {
      kind: "absent",
    };
  if (typeof e !== "string" || e.length > MAX_REASON_CHARS)
    return {
      kind: "unreadable",
    };
  let r = PlainCallAskApprovalSchema().safeParse(safeParseJSON(e, false)).data;
  if (r === undefined)
    return {
      kind: "unreadable",
    };
  return r.approved === undefined
    ? {
        kind: "can_ask",
      }
    : {
        kind: "approved",
        askDigest: r.approved.ask_digest,
        attested: r.approved.attested,
      };
}
//@ chunk-3kqfccv7.js:1564-1757 placement
function toPermissionQuestionReason(n, e, r = true) {
  return {
    reason: asShownOnACard(n.reason),
    classifier_approvable: e && !(r && isHostPersonOnlyCircuitBreaker(n)),
    ...(n.circuitBreaker !== undefined && {
      circuit_breaker: n.circuitBreaker,
    }),
    ...(n.also !== undefined && {
      also: [...n.also],
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
function permissionRuleAskReason(n) {
  return safetyCheckReason(
    `A permission rule says to ask a person before a call like this one: '${formatPermissionRule(n.ruleValue)}'`,
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
function permissionQuestionDigest(name, e, { path, identity }, t) {
  return createHash("sha256")
    .update(jsonStringify([name, e, path, identity ?? null, t]))
    .digest("hex");
}
//@ chunk-3kqfccv7.js:2495-2915 placement
/**
 * 生成需人工批准的问题与理由
 */
function buildPermissionQuestion(n, e, r, c) {
  let t = (a) => toPermissionQuestionReason(a, a.classifierApprovable);
  let mapped = collectSafetyReasons(r.decisionReason).map(t);
  let mapped_2 = collectAskReasons(r).map(t);
  let m =
    mapped_2.length === 0
      ? mapped
      : [
          ...mapped.toSorted((a, y) => Number(a.classifier_approvable) - Number(y.classifier_approvable)),
          ...mapped_2,
        ].map((a) => ({
          ...a,
          classifier_approvable: false,
        }));
  let i = Ji(m, jsonStringify);
  if (i.length === 0 || i.length > MAX_ASK_REASONS) return;
  if (i.some((a) => a.reason.length > MAX_QUESTION_CHARS)) return;
  return {
    v: 1,
    outcome: "needs_approval",
    ask_digest: permissionQuestionDigest(n.name, e, c, i),
    reasons: i,
  };
}
//@ chunk-3kqfccv7.js:2915-4490 placement
/**
 * mcp serve 普通调用的"需要人批准"处理：按 anthropic/permissionAsks 元数据核对问题摘要与批准记录，未经人批准则不执行。
 */
async function settlePlainCallAsk(n, e, r, session, t) {
  let callerAsks = readCallerAsks(n);
  if (callerAsks.kind === "absent") return "as_without_the_key";
  if (t === undefined)
    return callerAsks.kind === "approved"
      ? rejectionResult(e, "question_changed", ASK_CHANGED_TEXT)
      : "as_without_the_key";
  if (callerAsks.kind === "unreadable")
    return rejectionResult(
      e,
      "asks_key_unreadable",
      `${t.message} That needs a person's approval, and this server could not read its caller's offer to ask for one, so nobody was asked. Retrying won't help.`,
    );
  let cwd = getSessionProject(session).cwd;
  let m = {
    path: cwd,
    identity: await Promise.all([
      realpath(cwd),
      stat(cwd, {
        bigint: true,
      }),
    ]).then(
      ([a, y]) => (a === cwd ? `${y.dev}:${y.ino}` : undefined),
      () => {
        return;
      },
    ),
  };
  if (m.identity === undefined)
    return callerAsks.kind === "approved"
      ? rejectionResult(e, "question_changed", ASK_CHANGED_TEXT)
      : rejectionResult(
          e,
          "start_folder_unconfirmed",
          `${t.message} That needs a person's approval, and nobody was asked, because the working directory was moved, is gone or cannot be read. Change directory first, then send the call again.`,
        );
  let permissionQuestion = buildPermissionQuestion(e, r, t, m);
  if (permissionQuestion === undefined)
    return rejectionResult(
      e,
      "question_too_large",
      `${t.message} The permission check's objections are too many, or one is too long, for this server to put to a person, so nobody was asked. Send smaller calls, or use shorter paths.`,
    );
  switch (callerAsks.kind) {
    case "can_ask":
      logFeatureSad("mcp_serve_plain_call", "asked");
      return {
        rejection: `${e.name} was not run: ${t.message} A person has to approve this call, and none did. Tell the user what you wanted to run and why.`,
        meta: {
          [ANTHROPIC_PERMISSIONQUESTION]: permissionQuestion,
        },
      };
    case "approved":
      if (!callerAsks.attested)
        return rejectionResult(
          e,
          "approval_not_from_person",
          "the approval sent with this call did not come from a person, and only a person's counts. Tell the user what you wanted to run and why.",
        );
      return permissionQuestion.ask_digest === callerAsks.askDigest
        ? "run"
        : rejectionResult(e, "question_changed", ASK_CHANGED_TEXT);
  }
}
//@ chunk-3kqfccv7.js:4490-4820 placement
/**
 * 批准后条件已变的说明
 */
var ASK_CHANGED_TEXT =
  "what a person approved is no longer what this call would do: the working directory, or what the permission check found, has changed since, or the working directory was moved, is gone or cannot be read. If it was moved, is gone or cannot be read, change directory first. Then send the call again to have it checked afresh.";
//@ chunk-3kqfccv7.js:4820-4915 placement
function rejectionResult(n, e, r) {
  logFeatureSad("mcp_serve_plain_call", e);
  return {
    rejection: `${n.name} was not run: ${r}`,
  };
}
export {
  asShownOnACard,
  toPermissionQuestionReason,
  collectSafetyReasons,
  readCallerAsks,
  CALLER_ASKS_KEY,
  settlePlainCallAsk,
};
