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
import { u, T, o, zodStrictObject, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { RS, escapeAngleBrackets } from "../../utils/sanitization.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { safeParseJSON } from "../../utils/json.js";
import { isHostPersonOnlyCircuitBreaker } from "../../types/permissions.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-3kqfccv7.js:616-651 placement
var CALLER_ASKS_KEY = "anthropic/permissionAsks";
//@ chunk-3kqfccv7.js:651-701 placement
function holdsSafetyAsksCapability() {
  return { experimental: { [CALLER_ASKS_KEY]: { v: 1 } } };
}
//@ chunk-3kqfccv7.js:701-837 placement
var callerAsksCapabilitySchema = DoctorLazy(() =>
    u({ experimental: u({ [CALLER_ASKS_KEY]: u({ v: T(1) }) }) }),
  ),
  ANTHROPIC_PERMISSIONQUESTION = "anthropic/permissionQuestion",
  MAX_ASK_REASONS = 32,
  MAX_QUESTION_CHARS = 2000,
  MAX_REASON_CHARS = 1024,
  SEPARATOR_RUN_REGEX = new RegExp(`[${RS}]+`, "gu");
//@ chunk-3kqfccv7.js:837-886 placement
function asShownOnACard(n) {
  return escapeAngleBrackets(n.replace(SEPARATOR_RUN_REGEX, "\uFFFD"));
}
/**
 * permissionAsks 元数据 schema
 */
//@ chunk-3kqfccv7.js:886-1227 placement
var permissionAskSchemas = DoctorLazy(() => o().regex(/^[0-9a-f]{64}$/)),
  z = DoctorLazy(() =>
    zodStrictObject({
      v: T(1),
      approved: zodStrictObject({ ask_digest: permissionAskSchemas(), attested: M() }).optional(),
    }),
  ),
  Z = DoctorLazy(() =>
    zodStrictObject({
      v: T(1),
      outcome: T("needs_approval"),
      ask_digest: permissionAskSchemas(),
      reasons: A(
        zodStrictObject({
          reason: o().min(1).max(MAX_QUESTION_CHARS),
          classifier_approvable: M(),
          circuit_breaker: o().max(64).optional(),
          also: A(o().max(64)).max(MAX_ASK_REASONS).optional(),
        }),
      )
        .min(1)
        .max(MAX_ASK_REASONS),
    }),
  );
//@ chunk-3kqfccv7.js:1227-1564 placement
function readCallerAsks(n) {
  let e = isPlainObject(n) ? n[CALLER_ASKS_KEY] : void 0;
  if (e === void 0) return { kind: "absent" };
  if (typeof e !== "string" || e.length > MAX_REASON_CHARS) return { kind: "unreadable" };
  let r = z().safeParse(safeParseJSON(e, !1)).data;
  if (r === void 0) return { kind: "unreadable" };
  return r.approved === void 0
    ? { kind: "can_ask" }
    : { kind: "approved", askDigest: r.approved.ask_digest, attested: r.approved.attested };
}
//@ chunk-3kqfccv7.js:1564-1757 placement
function toPermissionQuestionReason(n, e, r = !0) {
  return {
    reason: asShownOnACard(n.reason),
    classifier_approvable: e && !(r && isHostPersonOnlyCircuitBreaker(n)),
    ...(n.circuitBreaker !== void 0 && { circuit_breaker: n.circuitBreaker }),
    ...(n.also !== void 0 && { also: [...n.also] }),
  };
}
//@ chunk-3kqfccv7.js:1757-1910 placement
function collectSafetyReasons(n) {
  if (n?.type === "safetyCheck") return [n];
  return n?.type === "subcommandResults"
    ? [...n.reasons.values()].flatMap((e) => collectSafetyReasons(e.decisionReason))
    : [];
}
/**
 * 收集 ask 规则与决策理由
 */
//@ chunk-3kqfccv7.js:1910-2206 placement
function collectAskReasons({ matchedAskRule: matchedAskRule, decisionReason: decisionReason }) {
  return [
    ...(matchedAskRule?.ruleBehavior === "ask" ? [permissionRuleAskReason(matchedAskRule)] : []),
    ...(decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask"
      ? [permissionRuleAskReason(decisionReason.rule)]
      : []),
    ...(decisionReason?.type === "other" ? [S(decisionReason.reason)] : []),
    ...(decisionReason?.type === "subcommandResults"
      ? [...decisionReason.reasons.values()].flatMap((r) =>
          r.behavior === "ask" ? collectAskReasons(r) : [],
        )
      : []),
  ];
}
//@ chunk-3kqfccv7.js:2206-2321 placement
function permissionRuleAskReason(n) {
  return S(
    `A permission rule says to ask a person before a call like this one: '${formatPermissionRule(n.ruleValue)}'`,
  );
}
//@ chunk-3kqfccv7.js:2321-2395 placement
function S(n) {
  return { type: "safetyCheck", reason: n, classifierApprovable: !1 };
}
//@ chunk-3kqfccv7.js:2395-2495 placement
function permissionQuestionDigest(n, e, { path: path, identity: identity }, t) {
  return createHash("sha256")
    .update(jsonStringify([n, e, path, identity ?? null, t]))
    .digest("hex");
}
/**
 * 生成需人工批准的问题与理由
 */
//@ chunk-3kqfccv7.js:2495-2915 placement
function buildPermissionQuestion(n, e, r, c) {
  let t = (a) => toPermissionQuestionReason(a, a.classifierApprovable),
    mapped = collectSafetyReasons(r.decisionReason).map(t),
    mapped_2 = collectAskReasons(r).map(t),
    m =
      mapped_2.length === 0
        ? mapped
        : [
            ...mapped.toSorted((a, y) => Number(a.classifier_approvable) - Number(y.classifier_approvable)),
            ...mapped_2,
          ].map((a) => ({ ...a, classifier_approvable: !1 })),
    i = Ji(m, jsonStringify);
  if (i.length === 0 || i.length > MAX_ASK_REASONS) return;
  if (i.some((a) => a.reason.length > MAX_QUESTION_CHARS)) return;
  return {
    v: 1,
    outcome: "needs_approval",
    ask_digest: permissionQuestionDigest(n.name, e, c, i),
    reasons: i,
  };
}
/**
 * mcp serve 普通调用的"需要人批准"处理：按 anthropic/permissionAsks 元数据核对问题摘要与批准记录，未经人批准则不执行。
 */
//@ chunk-3kqfccv7.js:2915-4490 placement
async function settlePlainCallAsk(n, e, r, c, t) {
  let s = readCallerAsks(n);
  if (s.kind === "absent") return "as_without_the_key";
  if (t === void 0)
    return s.kind === "approved" ? l(e, "question_changed", ASK_CHANGED_TEXT) : "as_without_the_key";
  if (s.kind === "unreadable")
    return l(
      e,
      "asks_key_unreadable",
      `${t.message} That needs a person's approval, and this server could not read its caller's offer to ask for one, so nobody was asked. Retrying won't help.`,
    );
  let cwd = xo(c).cwd,
    m = {
      path: cwd,
      identity: await Promise.all([realpath(cwd), stat(cwd, { bigint: !0 })]).then(
        ([a, y]) => (a === cwd ? `${y.dev}:${y.ino}` : void 0),
        () => {
          return;
        },
      ),
    };
  if (m.identity === void 0)
    return s.kind === "approved"
      ? l(e, "question_changed", ASK_CHANGED_TEXT)
      : l(
          e,
          "start_folder_unconfirmed",
          `${t.message} That needs a person's approval, and nobody was asked, because the working directory was moved, is gone or cannot be read. Change directory first, then send the call again.`,
        );
  let i = buildPermissionQuestion(e, r, t, m);
  if (i === void 0)
    return l(
      e,
      "question_too_large",
      `${t.message} The permission check's objections are too many, or one is too long, for this server to put to a person, so nobody was asked. Send smaller calls, or use shorter paths.`,
    );
  switch (s.kind) {
    case "can_ask":
      return (
        logFeatureSad("mcp_serve_plain_call", "asked"),
        {
          rejection: `${e.name} was not run: ${t.message} A person has to approve this call, and none did. Tell the user what you wanted to run and why.`,
          meta: { [ANTHROPIC_PERMISSIONQUESTION]: i },
        }
      );
    case "approved":
      if (!s.attested)
        return l(
          e,
          "approval_not_from_person",
          "the approval sent with this call did not come from a person, and only a person's counts. Tell the user what you wanted to run and why.",
        );
      return i.ask_digest === s.askDigest ? "run" : l(e, "question_changed", ASK_CHANGED_TEXT);
  }
}
/**
 * 批准后条件已变的说明
 */
//@ chunk-3kqfccv7.js:4490-4820 placement
var ASK_CHANGED_TEXT =
  "what a person approved is no longer what this call would do: the working directory, or what the permission check found, has changed since, or the working directory was moved, is gone or cannot be read. If it was moved, is gone or cannot be read, change directory first. Then send the call again to have it checked afresh.";
//@ chunk-3kqfccv7.js:4820-4915 placement
function l(n, e, r) {
  return (logFeatureSad("mcp_serve_plain_call", e), { rejection: `${n.name} was not run: ${r}` });
}

export {
  asShownOnACard,
  toPermissionQuestionReason,
  collectSafetyReasons,
  readCallerAsks,
  CALLER_ASKS_KEY,
  settlePlainCallAsk,
};
