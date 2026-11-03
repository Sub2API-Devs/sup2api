/**
 * utils/permissions/permissionAnswer.ts
 *
 * 2.1.316 新增：权限回答应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (29)
 * attribution: placement 29
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { CHt } from "../plans.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Ka, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { freeze as freeze_27 } from "../../../vendor/zod/v4/core/core.js";
import { logForDebugging } from "../debug.js";
import { permissionUpdateSchema } from "../hooks/hookSpecificOutput.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { dco } from "../../bootstrap/stateSlices.js";
import { TOOL_PERMISSION_REQUEST_FAILED } from "../../cli/toolPermissionStream.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { applyPermissionUpdates } from "./PermissionUpdate.js";
import { syncRemoteBrowserCardAnswers } from "./toolPermissionContext.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { quotedPrintable } from "../printableName.js";
import { count } from "../collections.js";

/**
 * 从对象型工具输入中去掉宿主专属的键（CHt 给出的集合）；不是对象或无此类键时原样返回。
 */
//@ chunk-e6aww6q8.js:861172-861345 placement
function stripHostOwnedInputKeys(e, n) {
  if (typeof n !== "object" || n === null || Array.isArray(n)) return n;
  let r = CHt(e, n);
  if (!r || !Object.keys(n).some((s) => r.has(s))) return n;
  return wi(n, (s, h) => r.has(h));
}
//@ chunk-e6aww6q8.js:861345-861608 placement
function stripUnchangedHostOwnedKeys(e, n, r) {
  if (
    typeof n !== "object" ||
    n === null ||
    Array.isArray(n) ||
    typeof r !== "object" ||
    r === null ||
    Array.isArray(r)
  )
    return n;
  let s = CHt(e, r);
  if (!s) return n;
  let h = (y) => s.has(y) && y in n && n[y] === r[y];
  if (!Object.keys(n).some(h)) return n;
  return wi(n, (y, S) => h(S));
}
/**
 * 权限回答的更新条目上限、"未读规则"会话级拒绝更新，以及超过上限时的说明文字。
 */
//@ chunk-e6aww6q8.js:861608-861802 placement
var MAX_PERMISSION_ANSWER_UPDATES = 4096,
  UNREAD_RULES_DENY_UPDATE = {
    type: "addRules",
    rules: [{ toolName: "unread-rules" }],
    behavior: "deny",
    destination: "session",
  },
  PERMISSION_UPDATES_LIMIT_MESSAGE = `updatedPermissions may hold at most ${MAX_PERMISSION_ANSWER_UPDATES} updates, rules and directories in all.`;
/**
 * 按总数上限（更新、规则、目录合计 4096）截断权限更新列表：cut 模式截断最后一条的规则/目录（replaceRules 不截），refused 模式超限返回 undefined。
 */
//@ chunk-e6aww6q8.js:861802-862457 placement
function capPermissionUpdates(updates, overflowMode) {
  let budget = MAX_PERMISSION_ANSWER_UPDATES,
    kept = [];
  for (let h of updates) {
    if (budget === 0) return overflowMode === "cut" ? kept : void 0;
    if ((budget--, typeof h !== "object" || h === null)) {
      kept.push(h);
      continue;
    }
    let type = Reflect.get(h, "type"),
      isRuleUpdate = type === "addRules" || type === "replaceRules" || type === "removeRules",
      items = isRuleUpdate
        ? Reflect.get(h, "rules")
        : type === "addDirectories" || type === "removeDirectories"
          ? Reflect.get(h, "directories")
          : void 0;
    if (!Array.isArray(items)) {
      kept.push(h);
      continue;
    }
    if (items.length <= budget) {
      ((budget -= items.length), kept.push(h));
      continue;
    }
    if (overflowMode === "refused") return;
    if (budget > 0 && type !== "replaceRules") {
      let sliced = items.slice(0, budget),
        q = Reflect.get(h, "destination");
      kept.push(
        isRuleUpdate
          ? { type: type, rules: sliced, behavior: Reflect.get(h, "behavior"), destination: q }
          : { type: type, directories: sliced, destination: q },
      );
    }
    return kept;
  }
  return updates;
}
/**
 * 权限更新里是否含收紧项：非法条目、deny/ask 规则的 add/replace、或 deny/ask 的目录更新；removeRules 与空规则不算。
 */
//@ chunk-e6aww6q8.js:862457-862818 placement
function hasTighteningUpdate(e) {
  return e.some((n) => {
    if (typeof n !== "object" || n === null) return typeof n === "string" && n !== "";
    let r = Reflect.get(n, "type");
    if (typeof r !== "string") return !0;
    let s = Reflect.get(n, "behavior"),
      h = Reflect.get(n, "rules");
    if (r === "removeRules" || (Array.isArray(h) && h.length === 0)) return !1;
    return r === "addRules" || r === "replaceRules" ? s !== "allow" : s === "deny" || s === "ask";
  });
}
//@ chunk-e6aww6q8.js:862818-863355 placement
function capPermissionUpdates_2(e, n) {
  return Ka(
    (r, s) => {
      if (!Array.isArray(r)) return r;
      let h = capPermissionUpdates(r, e);
      if (h === r) return r;
      let y = `updatedPermissions holds over ${MAX_PERMISSION_ANSWER_UPDATES} updates, rules and directories in all`;
      if (h === void 0) return (s.issues.push({ code: "custom", message: y, input: void 0 }), freeze_27);
      return (
        logForDebugging(`${y}: the rest is not read`, { level: "warn" }),
        [...h, UNREAD_RULES_DENY_UPDATE]
      );
    },
    A(permissionUpdateSchema())
      .optional()
      .catch(
        (r) => (
          logForDebugging(
            `Malformed updatedPermissions from ${n} ignored: ${r.error.issues[0]?.message ?? "unknown"}`,
            { level: "warn" },
          ),
          e === "cut" && hasTighteningUpdate(Array.isArray(r.input) ? r.input : [r.input])
            ? [UNREAD_RULES_DENY_UPDATE]
            : void 0
        ),
      ),
  );
}
//@ chunk-e6aww6q8.js:863398-863431 placement
var iFo = 64,
  aFo = 20000,
  lFo = 1048576;
/**
 * 比较权限回答的输入与原输入是否深度相等（经 JSON 往返）；输入超出回答大小限制时记警告并返回 false。
 */
//@ chunk-e6aww6q8.js:863431-863679 placement
function isSameAnswerInput(e, n) {
  let r = measureAnswerBounds(e);
  if (!r.within)
    return (
      logForDebugging(
        `a permission answer's input is past the answer bounds (${r.values} values, depth ${r.depth}, ${r.chars} string characters when the walk stopped)`,
        { level: "warn" },
      ),
      !1
    );
  return isDeepStrictEqual_7(jsonParse(jsonStringify(e)), jsonParse(jsonStringify(n)));
}
/**
 * 迭代遍历值，统计值数、深度与字符数，判断是否在权限回答的大小限制内。
 */
//@ chunk-e6aww6q8.js:863679-863988 placement
function measureAnswerBounds(e) {
  let n = { values: 0, depth: 0, chars: 0 },
    r = [],
    s = countAnswerValue(e, 0, 1, n, r);
  while (s && r.length > 0) {
    let { container: container, level: level } = r.pop();
    if (Array.isArray(container)) {
      for (let S = 0; s && S < container.length; S++) s = countAnswerValue(container[S], 0, level + 1, n, r);
      continue;
    }
    for (let key in container) {
      if (!s) break;
      if (Object.hasOwn(container, key)) s = countAnswerValue(container[key], key.length, level + 1, n, r);
    }
  }
  return { within: s, ...n };
}
//@ chunk-e6aww6q8.js:863988-864184 placement
function countAnswerValue(e, n, r, s, h) {
  if ((s.values++, (s.chars += n + (typeof e === "string" ? e.length : 0)), dco(e)))
    ((s.depth = Math.max(s.depth, r)), h.push({ container: e, level: r }));
  return s.values <= aFo && s.depth <= iFo && s.chars <= lFo;
}
//@ chunk-e6aww6q8.js:864184-864816 placement
var applyPermissionAnswerChanges = Object.freeze({ kind: "launcher" }),
  JRo =
    "The permission answer changed the tool call, and this session runs a call only as it was asked. Nothing ran.",
  ZRo =
    "The call was not run. The permission answer allowed it and also asked for changes to the permission rules. This session could not apply them all, so a deny or ask rule among them may not be in force. Nothing that the answer allowed is in force either. Tell the person so. A new call can be allowed by an answer that changes fewer rules, or none.",
  xHt = ["session", "localSettings", "projectSettings", "userSettings"],
  Lge = ["alwaysDenyRules", "alwaysAskRules", "alwaysAllowRules"];
//@ chunk-e6aww6q8.js:864816-864869 placement
function d0e(e, n) {
  return PHt(e) || (e !== void 0 && isSameAnswerInput(e, n));
}
//@ chunk-e6aww6q8.js:864869-865459 placement
function admitCardAnswer(e, n, r) {
  if (d0e(e, n)) return PHt(e) ? stripHostOwnedInputKeys(r.name, n) : n;
  if (e === void 0 || r.admitCardAnswer === void 0) return;
  let s;
  try {
    s = r.admitCardAnswer(n, e);
  } catch {
    logForDebugging(`${r.name}'s card-answer admitter threw: the answer is refused`, { level: "warn" });
    return;
  }
  switch (s.kind) {
    case "refused":
      logForDebugging(`a permission answer for ${r.name} broke its card-answer rules: ${s.rule}`, {
        level: "warn",
      });
      return;
    case "admitted": {
      let { input: input } = s;
      if (!Object.keys(n).every((y) => Object.hasOwn(input, y) && input[y] === n[y])) {
        logForDebugging(
          `${r.name}'s card-answer admitter changed a field the card showed: the answer is refused`,
          { level: "warn" },
        );
        return;
      }
      return input;
    }
  }
}
//@ chunk-e6aww6q8.js:865459-865469 placement
var eCo = 3;
/**
 * 宿主提供卡片表单时，校验 MCP 工具权限回答的输入恰好是某个表单：超限、无表单或不匹配时通过 onRefused 计数并拒绝；宿主回调抛错时记日志。
 */
//@ chunk-e6aww6q8.js:865469-866024 placement
function matchCardFormAnswer(host, answerInput, context, tool) {
  if (tool.mcpInfo === void 0) return;
  let { within: within } = measureAnswerBounds(answerInput),
    cardForms;
  try {
    cardForms = host.cardForms(tool, context);
  } catch {
    logForDebugging(`the host's cardForms threw for ${tool.name}: the answer is refused`, { level: "error" });
    return;
  }
  if (cardForms === void 0) return;
  let { forms: forms, onRefused: onRefused } = cardForms,
    reportRefused = (q) => {
      try {
        onRefused(q);
      } catch {
        logForDebugging(`the host's count of refused card answers threw for ${tool.name} (${q})`, {
          level: "error",
        });
      }
    };
  if (!within) {
    reportRefused("too_large");
    return;
  }
  if (forms.length === 0 || forms.length > eCo) {
    reportRefused("no_form");
    return;
  }
  let found = forms.find((q) => Object.keys(q).length > 0 && isSameAnswerInput(answerInput, q));
  if (found === void 0) {
    reportRefused("not_a_form");
    return;
  }
  return { input: found, onRefused: reportRefused };
}
/**
 * 权限回答改动了调用输入时生成拒绝决定并记警告。
 */
//@ chunk-e6aww6q8.js:866024-866298 placement
function denyChangedAnswerInput(e, n) {
  return (
    logForDebugging(`refused a permission answer for ${e}: it changed the call's input`, { level: "warn" }),
    {
      behavior: "deny",
      message: JRo,
      ...(n !== void 0 && { toolUseID: n }),
      decisionReason: { type: "other", reason: "the permission answer changed the call" },
      decideLocation: "ask-path",
    }
  );
}
/**
 * 权限回答加入（或可能加入）的 deny/ask 规则没能进入会话规则时生成拒绝决定并记警告。
 */
//@ chunk-e6aww6q8.js:866298-866652 placement
function denyLostTightening(e, n) {
  return (
    logForDebugging(
      `refused a permission answer for ${e}: a deny or ask rule that the answer added, or may have added, is not among the session's rules`,
      { level: "warn" },
    ),
    {
      behavior: "deny",
      message: ZRo,
      ...(n !== void 0 && { toolUseID: n }),
      decisionReason: { type: "other", reason: "a deny or ask rule of the answer may not be in force" },
      decideLocation: "ask-path",
    }
  );
}
/**
 * 按权限请求方式格式化请求失败信息：launcher 模式带上原因，strict 模式记录日志后只返回固定文字。
 */
//@ chunk-e6aww6q8.js:866652-866810 placement
function formatPermissionRequestFailure(e, n, r) {
  switch (e.kind) {
    case "launcher":
      return `${TOOL_PERMISSION_REQUEST_FAILED}: ${n}`;
    case "strict":
      return (
        logForDebugging(`permission request for ${r} failed: ${n}`, { level: "error" }),
        TOOL_PERMISSION_REQUEST_FAILED
      );
  }
}
/**
 * 应用权限回答中的规则更新（添加、替换），处理收紧与放宽。
 */
//@ chunk-e6aww6q8.js:866810-867988 placement
function applyPermissionAnswer(e, n) {
  let r = e ?? [],
    perAnswer = n.perAnswer,
    h = { tightening: 0, allow: 0 },
    y = { tightening: 0, allow: 0 },
    S = [];
  for (let G of ["tightening", "allow"])
    for (let [q, Z] of r.entries()) {
      if (Z.type !== "addRules" && Z.type !== "replaceRules") continue;
      let Se = Z.behavior === "deny" || Z.behavior === "ask";
      if (Se !== (G === "tightening") || (Z.type === "replaceRules" && !Se)) continue;
      h[G] += Z.rules.length;
      let sliced = Z.rules
        .filter((rule) => formatPermissionRule(rule).length <= n.ruleLength)
        .slice(0, perAnswer);
      ((perAnswer -= sliced.length), (y[G] += sliced.length), (S[q] = sliced));
    }
  let w = 0,
    flattened = r.flatMap((G, q) => {
      switch (G.type) {
        case "addRules":
        case "replaceRules": {
          let Z = S[q];
          if (Z === void 0) return (w++, []);
          return Z.length === 0 ? [] : [{ ...G, type: "addRules", rules: Z, destination: "session" }];
        }
        case "setMode":
          return [{ ...G, destination: "session" }];
        case "removeRules":
        case "addDirectories":
        case "removeDirectories":
          return (w++, []);
        default: {
          let Z = G;
          return (
            w++,
            logForDebugging(
              `a permission answer carried an update of unknown type ${String(Z.type)}: dropped`,
              { level: "warn" },
            ),
            []
          );
        }
      }
    });
  if (y.tightening < h.tightening || y.allow < h.allow || w > 0)
    logForDebugging(
      `a permission answer was capped: ${h.tightening - y.tightening} of ${h.tightening} added deny and ask rules and ${h.allow - y.allow} of ${h.allow} added allow rules dropped, ${w} other updates dropped`,
    );
  return flattened;
}
/**
 * 应用权限回答里的更新：被否决时不做；先按限制裁剪、再经 strip 过滤，然后写入会话上下文并统计丢失的收紧规则数。
 */
//@ chunk-e6aww6q8.js:867988-868287 placement
function applyAnswerPermissionUpdates(e, n, r) {
  if (r.vetoed()) return { applied: [], lostTightenings: 0 };
  let strip = r.strip(applyPermissionAnswer(n, e.limits)),
    h = { toolName: r.toolName, input: r.input },
    y = applyUpdatesToSessionContext(
      { ...e, mayAddAllowRule: (S) => e.mayAddAllowRule(S, h) },
      strip,
      r.toolName,
      r.setContext,
      listAnswerTighteningRules(n, e.limits.ruleLength),
      r.suggested,
    );
  return { applied: strip, lostTightenings: y };
}
//@ chunk-e6aww6q8.js:868287-868378 placement
function tCo(e) {
  return (e.type === "addRules" || e.type === "replaceRules") && e.behavior !== "allow";
}
/**
 * 列出权限回答里 deny/ask 规则对应的 [规则表名, 规则串]，过长规则用 unread-rules 占位。
 */
//@ chunk-e6aww6q8.js:868378-868591 placement
function listAnswerTighteningRules(e, n) {
  return (e ?? []).flatMap((r) =>
    tCo(r)
      ? r.rules.map((rule) => [
          r.behavior === "deny" ? "alwaysDenyRules" : "alwaysAskRules",
          rule.toolName.length + (rule.ruleContent?.length ?? 0) > n
            ? UNREAD_RULES_DENY_UPDATE.rules[0].toolName
            : formatPermissionRule(permissionRuleValueFromString(formatPermissionRule(rule))),
        ])
      : [],
  );
}
/**
 * 把权限更新应用到会话上下文：经托管规则过滤（记录被收窄的部分），模式变化且无丢失时另外切换模式；返回丢失的收紧规则数。
 */
//@ chunk-e6aww6q8.js:868591-869008 placement
function applyUpdatesToSessionContext(e, n, r, s, h, y) {
  if (n.length === 0 && h.length === 0) return 0;
  let S,
    w = h.length;
  if (
    (s((L) => {
      let G = applyPermissionUpdates(L, n),
        {
          context: context,
          offered: offered,
          kept: kept,
          lost: lost,
        } = filterManagedPermissionRules(L, G, r, e, h, y);
      ((w = lost), (S = lost === 0 && G.mode !== L.mode ? G.mode : void 0));
      let we = listChangedRuleTables(context, G);
      if (we.length > 0)
        logForDebugging(
          `a permission answer's changes were narrowed to this session's own rules (${we.join(", ")}): kept ${kept} of ${offered} added rules`,
        );
      return syncRemoteBrowserCardAnswers(L, context);
    }),
    S !== void 0)
  )
    e.setMode(S);
  return w;
}
/**
 * 过滤托管设置中的 always deny/ask 规则，忽略无效规则。
 */
//@ chunk-e6aww6q8.js:869008-870865 placement
function filterManagedPermissionRules(e, n, r, s, h, y) {
  let { limits: limits } = s,
    w =
      h.length === 0
        ? void 0
        : { alwaysDenyRules: GWe(e.alwaysDenyRules), alwaysAskRules: GWe(e.alwaysAskRules) },
    mapped = Lge.map((Ie) => findRulesMissingFromContext(e[Ie], n[Ie])),
    mapped_2 = mapped.map((Ie, Me) => {
      let We = Lge[Me];
      return Ie.filter((ze) => {
        if (ze.length > limits.ruleLength || ze === UNREAD_RULES_DENY_UPDATE.rules[0].toolName) return !1;
        if (We === "alwaysDenyRules" || We === "alwaysAskRules") {
          if (!PATH_RULE_CARVE_OUT_RE.test(ze)) return !0;
          return (
            logForDebugging(
              `Ignoring ${We === "alwaysDenyRules" ? "deny" : "ask"} rule "${quotedPrintable(ze)}" from a permission answer: a path that starts with "!" takes paths out of earlier rules, and an answer may only add restrictions. Send the rule without the exception.`,
              { level: "warn" },
            ),
            !1
          );
        }
        let lt = permissionRuleValueFromString(ze);
        return (lt.toolName === r || y?.(lt) === !0) && s.mayAddAllowRule(lt);
      });
    }),
    reduced = Lge.reduce((Ie, Me) => Ie + (e[Me].session?.length ?? 0), 0),
    max = Math.max(0, Math.min(limits.perAnswer, limits.perSession - reduced)),
    denyRuleToAdd = s.denyRuleToAdd(e.alwaysDenyRules.session ?? [], r),
    ke = 0,
    mapped_3 = mapped_2.map((Ie, Me) => {
      let We = Lge[Me],
        ze = [],
        lt = !1;
      if (We === "alwaysAllowRules") {
        if (
          ((ke =
            w === void 0
              ? 0
              : count(
                  h,
                  ([Je, nt]) =>
                    nt === UNREAD_RULES_DENY_UPDATE.rules[0].toolName ||
                    (!w[Je].has(nt) && !PATH_RULE_CARVE_OUT_RE.test(nt)),
                )),
          ke > 0)
        )
          return ze;
      }
      for (let Je of Ie) {
        let {
          add: nt,
          why: why,
          covered: covered,
        } = We === "alwaysDenyRules" ? denyRuleToAdd(Je) : { add: Je };
        if (nt !== void 0 && ze.length === max) {
          lt = !0;
          continue;
        }
        if (nt !== void 0) ze.push(nt);
        if (nt !== Je && (nt !== void 0 || (covered === !0 && !lt))) w?.alwaysDenyRules.add(Je);
        if (nt !== Je)
          logForDebugging(
            `${nt === void 0 ? "Ignoring" : `Adding "${quotedPrintable(nt)}" in place of`} deny rule "${quotedPrintable(Je)}" from a permission answer: ${why}`,
            { level: "warn" },
          );
      }
      if (((max -= ze.length), We === "alwaysDenyRules" || We === "alwaysAskRules"))
        for (let Je of ze) w?.[We].add(Je);
      return ze;
    }),
    reduced_2 = mapped.reduce((Ie, Me) => Ie + Me.length, 0),
    reduced_3 = mapped_3.reduce((Ie, Me) => Ie + Me.length, 0);
  if (reduced_3 === 0) return { context: e, offered: reduced_2, kept: 0, lost: ke };
  return {
    context: {
      ...e,
      alwaysAllowRules: WWe(e.alwaysAllowRules, mapped_3[2] ?? []),
      alwaysDenyRules: WWe(e.alwaysDenyRules, mapped_3[0] ?? []),
      alwaysAskRules: WWe(e.alwaysAskRules, mapped_3[1] ?? []),
    },
    offered: reduced_2,
    kept: reduced_3,
    lost: ke,
  };
}
//@ chunk-e6aww6q8.js:870865-870924 placement
function GWe(e) {
  return new Set(xHt.flatMap((n) => e[n] ?? []));
}
//@ chunk-e6aww6q8.js:870924-871039 placement
function findRulesMissingFromContext(e, n) {
  let r = GWe(e),
    s = new Set();
  for (let h of xHt) for (let y of n[h] ?? []) if (!r.has(y)) s.add(y);
  return [...s];
}
//@ chunk-e6aww6q8.js:871039-871118 placement
function WWe(e, n) {
  return n.length === 0 ? e : { ...e, session: [...(e.session ?? []), ...n] };
}
//@ chunk-e6aww6q8.js:871118-871179 placement
function PHt(e) {
  return e === void 0 || Object.keys(e).length === 0;
}
/**
 * 比较两份权限上下文，列出发生变化的规则表（allow/deny/ask 规则、附加目录）。
 */
//@ chunk-e6aww6q8.js:871179-871497 placement
function listChangedRuleTables(e, n) {
  let r = {
    "allow rules": [e.alwaysAllowRules, n.alwaysAllowRules],
    "deny rules": [e.alwaysDenyRules, n.alwaysDenyRules],
    "ask rules": [e.alwaysAskRules, n.alwaysAskRules],
    directories: [e.additionalWorkingDirectories, n.additionalWorkingDirectories],
  };
  return Object.entries(r).flatMap(([s, [h, y]]) => (isDeepStrictEqual_6(h, y) ? [] : [s]));
}

export {
  isSameAnswerInput,
  d0e,
  denyChangedAnswerInput,
  applyAnswerPermissionUpdates,
  denyLostTightening,
  applyPermissionAnswerChanges,
  capPermissionUpdates_2,
  PERMISSION_UPDATES_LIMIT_MESSAGE,
  aFo,
  iFo,
  lFo,
  measureAnswerBounds,
  stripHostOwnedInputKeys,
  admitCardAnswer,
  matchCardFormAnswer,
  formatPermissionRequestFailure,
  applyUpdatesToSessionContext,
  applyPermissionAnswer,
  listAnswerTighteningRules,
  stripUnchangedHostOwnedKeys,
};
