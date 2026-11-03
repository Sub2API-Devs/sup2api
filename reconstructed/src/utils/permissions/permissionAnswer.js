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
import { isDeepStrictEqual } from "util";
import { hostOwnedInputFieldSet } from "../plans.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { preprocess, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { bY } from "../../../vendor/zod/v4/core/core.js";
import { logForDebugging } from "../debug.js";
import { permissionUpdateSchema } from "../hooks/hookSpecificOutput.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isObjectLike as isObjectLike_5 } from "../../bootstrap/stateSlices.js";
import { TOOL_PERMISSION_REQUEST_FAILED } from "../../cli/toolPermissionStream.js";
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { applyPermissionUpdates } from "./PermissionUpdate.js";
import { syncRemoteBrowserCardAnswers } from "./toolPermissionContext.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { quotedPrintable } from "../printableName.js";
import { count } from "../collections.js";

//@ chunk-e6aww6q8.js:861172-861345 placement
/**
 * 从对象型工具输入中去掉宿主专属的键（CHt 给出的集合）；不是对象或无此类键时原样返回。
 */
function stripHostOwnedInputKeys(e, n) {
  if (typeof n !== "object" || n === null || Array.isArray(n)) return n;
  let r = hostOwnedInputFieldSet(e, n);
  if (!r || !Object.keys(n).some((key) => r.has(key))) return n;
  return wi(n, (s, h) => r.has(h));
}
//@ chunk-e6aww6q8.js:861345-861608 placement
function stripUnchangedHostOwnedKeys(name, updatedInput, observableInput) {
  if (
    typeof updatedInput !== "object" ||
    updatedInput === null ||
    Array.isArray(updatedInput) ||
    typeof observableInput !== "object" ||
    observableInput === null ||
    Array.isArray(observableInput)
  )
    return updatedInput;
  let s = hostOwnedInputFieldSet(name, observableInput);
  if (!s) return updatedInput;
  let h = (y) => s.has(y) && y in updatedInput && updatedInput[y] === observableInput[y];
  if (!Object.keys(updatedInput).some(h)) return updatedInput;
  return wi(updatedInput, (y, S) => h(S));
}
//@ chunk-e6aww6q8.js:861608-861802 placement
/**
 * 权限回答的更新条目上限、"未读规则"会话级拒绝更新，以及超过上限时的说明文字。
 */
var MAX_PERMISSION_ANSWER_UPDATES = 4096;
var UNREAD_RULES_DENY_UPDATE = {
  type: "addRules",
  rules: [
    {
      toolName: "unread-rules",
    },
  ],
  behavior: "deny",
  destination: "session",
};
var PERMISSION_UPDATES_LIMIT_MESSAGE = `updatedPermissions may hold at most ${MAX_PERMISSION_ANSWER_UPDATES} updates, rules and directories in all.`;
//@ chunk-e6aww6q8.js:861802-862457 placement
/**
 * 按总数上限（更新、规则、目录合计 4096）截断权限更新列表：cut 模式截断最后一条的规则/目录（replaceRules 不截），refused 模式超限返回 undefined。
 */
function capPermissionUpdates(updates, overflowMode) {
  let budget = MAX_PERMISSION_ANSWER_UPDATES;
  let kept = [];
  for (let update of updates) {
    if (budget === 0) return overflowMode === "cut" ? kept : undefined;
    budget--;
    if (typeof update !== "object" || update === null) {
      kept.push(update);
      continue;
    }
    let type = Reflect.get(update, "type");
    let isRuleUpdate = type === "addRules" || type === "replaceRules" || type === "removeRules";
    let items = isRuleUpdate
      ? Reflect.get(update, "rules")
      : type === "addDirectories" || type === "removeDirectories"
        ? Reflect.get(update, "directories")
        : undefined;
    if (!Array.isArray(items)) {
      kept.push(update);
      continue;
    }
    if (items.length <= budget) {
      budget -= items.length;
      kept.push(update);
      continue;
    }
    if (overflowMode === "refused") return;
    if (budget > 0 && type !== "replaceRules") {
      let sliced = items.slice(0, budget);
      let destination = Reflect.get(update, "destination");
      kept.push(
        isRuleUpdate
          ? {
              type,
              rules: sliced,
              behavior: Reflect.get(update, "behavior"),
              destination,
            }
          : {
              type,
              directories: sliced,
              destination,
            },
      );
    }
    return kept;
  }
  return updates;
}
//@ chunk-e6aww6q8.js:862457-862818 placement
/**
 * 权限更新里是否含收紧项：非法条目、deny/ask 规则的 add/replace、或 deny/ask 的目录更新；removeRules 与空规则不算。
 */
function hasTighteningUpdate(e) {
  return e.some((n) => {
    if (typeof n !== "object" || n === null) return typeof n === "string" && n !== "";
    let r = Reflect.get(n, "type");
    if (typeof r !== "string") return true;
    let s = Reflect.get(n, "behavior");
    let h = Reflect.get(n, "rules");
    if (r === "removeRules" || (Array.isArray(h) && h.length === 0)) return false;
    return r === "addRules" || r === "replaceRules" ? s !== "allow" : s === "deny" || s === "ask";
  });
}
//@ chunk-e6aww6q8.js:862818-863355 placement
function capPermissionUpdates_2(overflowMode, n) {
  return preprocess(
    (updates, s) => {
      if (!Array.isArray(updates)) return updates;
      let h = capPermissionUpdates(updates, overflowMode);
      if (h === updates) return updates;
      let y = `updatedPermissions holds over ${MAX_PERMISSION_ANSWER_UPDATES} updates, rules and directories in all`;
      if (h === undefined) {
        s.issues.push({
          code: "custom",
          message: y,
          input: undefined,
        });
        return bY;
      }
      logForDebugging(`${y}: the rest is not read`, {
        level: "warn",
      });
      return [...h, UNREAD_RULES_DENY_UPDATE];
    },
    array(permissionUpdateSchema())
      .optional()
      .catch((error) => {
        logForDebugging(
          `Malformed updatedPermissions from ${n} ignored: ${error.error.issues[0]?.message ?? "unknown"}`,
          {
            level: "warn",
          },
        );
        return overflowMode === "cut" &&
          hasTighteningUpdate(Array.isArray(error.input) ? error.input : [error.input])
          ? [UNREAD_RULES_DENY_UPDATE]
          : undefined;
      }),
  );
}
//@ chunk-e6aww6q8.js:863398-863431 placement
/**
 * MAX_ANSWER_DEPTH：权限回答输入的最大深度；MAX_ANSWER_VALUES：权限回答输入的最大值个数；MAX_ANSWER_CHARS：权限回答输入的最大字符数（同一声明共 3 个绑定）。
 */
var MAX_ANSWER_DEPTH = 64;
var MAX_ANSWER_VALUES = 20000;
var MAX_ANSWER_CHARS = 1048576;
//@ chunk-e6aww6q8.js:863431-863679 placement
/**
 * 比较权限回答的输入与原输入是否深度相等（经 JSON 往返）；输入超出回答大小限制时记警告并返回 false。
 */
function isSameAnswerInput(e, n) {
  let r = measureAnswerBounds(e);
  if (!r.within) {
    logForDebugging(
      `a permission answer's input is past the answer bounds (${r.values} values, depth ${r.depth}, ${r.chars} string characters when the walk stopped)`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return isDeepStrictEqual(jsonParse(jsonStringify(e)), jsonParse(jsonStringify(n)));
}
//@ chunk-e6aww6q8.js:863679-863988 placement
/**
 * 迭代遍历值，统计值数、深度与字符数，判断是否在权限回答的大小限制内。
 */
function measureAnswerBounds(e) {
  let n = {
    values: 0,
    depth: 0,
    chars: 0,
  };
  let r = [];
  let s = countAnswerValue(e, 0, 1, n, r);
  while (s && r.length > 0) {
    let { container, level } = r.pop();
    if (Array.isArray(container)) {
      for (let idx = 0; s && idx < container.length; idx++)
        s = countAnswerValue(container[idx], 0, level + 1, n, r);
      continue;
    }
    for (let key in container) {
      if (!s) break;
      if (Object.hasOwn(container, key)) s = countAnswerValue(container[key], key.length, level + 1, n, r);
    }
  }
  return {
    within: s,
    ...n,
  };
}
//@ chunk-e6aww6q8.js:863988-864184 placement
function countAnswerValue(e, n, r, s, h) {
  s.values++;
  s.chars += n + (typeof e === "string" ? e.length : 0);
  if (isObjectLike_5(e)) {
    s.depth = Math.max(s.depth, r);
    h.push({
      container: e,
      level: r,
    });
  }
  return s.values <= MAX_ANSWER_VALUES && s.depth <= MAX_ANSWER_DEPTH && s.chars <= MAX_ANSWER_CHARS;
}
//@ chunk-e6aww6q8.js:864184-864816 placement
/**
 * ANSWER_CHANGED_INPUT_MESSAGE：回答改写了调用时的说明；ANSWER_RULES_UNAPPLIED_MESSAGE：规则未能全部应用时的说明；RULE_TABLE_NAMES：四个规则表名（同一声明共 4 个绑定）。
 */
var applyPermissionAnswerChanges = Object.freeze({
  kind: "launcher",
});
var ANSWER_CHANGED_INPUT_MESSAGE =
  "The permission answer changed the tool call, and this session runs a call only as it was asked. Nothing ran.";
var ANSWER_RULES_UNAPPLIED_MESSAGE =
  "The call was not run. The permission answer allowed it and also asked for changes to the permission rules. This session could not apply them all, so a deny or ask rule among them may not be in force. Nothing that the answer allowed is in force either. Tell the person so. A new call can be allowed by an answer that changes fewer rules, or none.";
var RULE_TABLE_NAMES = ["session", "localSettings", "projectSettings", "userSettings"];
var RULE_TABLE_KEYS = ["alwaysDenyRules", "alwaysAskRules", "alwaysAllowRules"];
//@ chunk-e6aww6q8.js:864816-864869 placement
/**
 * isUnchangedAnswerInput：输入为空或与原输入相同。
 */
function isUnchangedAnswerInput(updatedInput, n) {
  return (
    isAbsentOrEmptyObject(updatedInput) || (updatedInput !== undefined && isSameAnswerInput(updatedInput, n))
  );
}
//@ chunk-e6aww6q8.js:864869-865459 placement
function admitCardAnswer(updatedInput, n, tool) {
  if (isUnchangedAnswerInput(updatedInput, n))
    return isAbsentOrEmptyObject(updatedInput) ? stripHostOwnedInputKeys(tool.name, n) : n;
  if (updatedInput === undefined || tool.admitCardAnswer === undefined) return;
  let s;
  try {
    s = tool.admitCardAnswer(n, updatedInput);
  } catch {
    logForDebugging(`${tool.name}'s card-answer admitter threw: the answer is refused`, {
      level: "warn",
    });
    return;
  }
  switch (s.kind) {
    case "refused":
      logForDebugging(`a permission answer for ${tool.name} broke its card-answer rules: ${s.rule}`, {
        level: "warn",
      });
      return;
    case "admitted": {
      let { input } = s;
      if (!Object.keys(n).every((key) => Object.hasOwn(input, key) && input[key] === n[key])) {
        logForDebugging(
          `${tool.name}'s card-answer admitter changed a field the card showed: the answer is refused`,
          {
            level: "warn",
          },
        );
        return;
      }
      return input;
    }
  }
}
//@ chunk-e6aww6q8.js:865459-865469 placement
var MAX_CARD_FORMS = 3;
//@ chunk-e6aww6q8.js:865469-866024 placement
/**
 * 宿主提供卡片表单时，校验 MCP 工具权限回答的输入恰好是某个表单：超限、无表单或不匹配时通过 onRefused 计数并拒绝；宿主回调抛错时记日志。
 */
function matchCardFormAnswer(host, answerInput, context, tool) {
  if (tool.mcpInfo === undefined) return;
  let { within } = measureAnswerBounds(answerInput);
  let cardForms;
  try {
    cardForms = host.cardForms(tool, context);
  } catch {
    logForDebugging(`the host's cardForms threw for ${tool.name}: the answer is refused`, {
      level: "error",
    });
    return;
  }
  if (cardForms === undefined) return;
  let { forms, onRefused } = cardForms;
  let reportRefused = (q) => {
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
  if (forms.length === 0 || forms.length > MAX_CARD_FORMS) {
    reportRefused("no_form");
    return;
  }
  let found = forms.find((form) => Object.keys(form).length > 0 && isSameAnswerInput(answerInput, form));
  if (found === undefined) {
    reportRefused("not_a_form");
    return;
  }
  return {
    input: found,
    onRefused: reportRefused,
  };
}
//@ chunk-e6aww6q8.js:866024-866298 placement
/**
 * 权限回答改动了调用输入时生成拒绝决定并记警告。
 */
function denyChangedAnswerInput(name, n) {
  logForDebugging(`refused a permission answer for ${name}: it changed the call's input`, {
    level: "warn",
  });
  return {
    behavior: "deny",
    message: ANSWER_CHANGED_INPUT_MESSAGE,
    ...(n !== undefined && {
      toolUseID: n,
    }),
    decisionReason: {
      type: "other",
      reason: "the permission answer changed the call",
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-e6aww6q8.js:866298-866652 placement
/**
 * 权限回答加入（或可能加入）的 deny/ask 规则没能进入会话规则时生成拒绝决定并记警告。
 */
function denyLostTightening(name, n) {
  logForDebugging(
    `refused a permission answer for ${name}: a deny or ask rule that the answer added, or may have added, is not among the session's rules`,
    {
      level: "warn",
    },
  );
  return {
    behavior: "deny",
    message: ANSWER_RULES_UNAPPLIED_MESSAGE,
    ...(n !== undefined && {
      toolUseID: n,
    }),
    decisionReason: {
      type: "other",
      reason: "a deny or ask rule of the answer may not be in force",
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-e6aww6q8.js:866652-866810 placement
/**
 * 按权限请求方式格式化请求失败信息：launcher 模式带上原因，strict 模式记录日志后只返回固定文字。
 */
function formatPermissionRequestFailure(e, error, name) {
  switch (e.kind) {
    case "launcher":
      return `${TOOL_PERMISSION_REQUEST_FAILED}: ${error}`;
    case "strict":
      logForDebugging(`permission request for ${name} failed: ${error}`, {
        level: "error",
      });
      return TOOL_PERMISSION_REQUEST_FAILED;
  }
}
//@ chunk-e6aww6q8.js:866810-867988 placement
/**
 * 应用权限回答中的规则更新（添加、替换），处理收紧与放宽。
 */
function applyPermissionAnswer(e, limits) {
  let r = e ?? [];
  let perAnswer = limits.perAnswer;
  let h = {
    tightening: 0,
    allow: 0,
  };
  let y = {
    tightening: 0,
    allow: 0,
  };
  let S = [];
  for (let G of ["tightening", "allow"])
    for (let [q, Z] of r.entries()) {
      if (Z.type !== "addRules" && Z.type !== "replaceRules") continue;
      let Se = Z.behavior === "deny" || Z.behavior === "ask";
      if (Se !== (G === "tightening") || (Z.type === "replaceRules" && !Se)) continue;
      h[G] += Z.rules.length;
      let sliced = Z.rules
        .filter((rule) => formatPermissionRule(rule).length <= limits.ruleLength)
        .slice(0, perAnswer);
      perAnswer -= sliced.length;
      y[G] += sliced.length;
      S[q] = sliced;
    }
  let w = 0;
  let flattened = r.flatMap((G, q) => {
    switch (G.type) {
      case "addRules":
      case "replaceRules": {
        let Z = S[q];
        if (Z === undefined) {
          w++;
          return [];
        }
        return Z.length === 0
          ? []
          : [
              {
                ...G,
                type: "addRules",
                rules: Z,
                destination: "session",
              },
            ];
      }
      case "setMode":
        return [
          {
            ...G,
            destination: "session",
          },
        ];
      case "removeRules":
      case "addDirectories":
      case "removeDirectories":
        w++;
        return [];
      default: {
        let Z = G;
        w++;
        logForDebugging(`a permission answer carried an update of unknown type ${String(Z.type)}: dropped`, {
          level: "warn",
        });
        return [];
      }
    }
  });
  if (y.tightening < h.tightening || y.allow < h.allow || w > 0)
    logForDebugging(
      `a permission answer was capped: ${h.tightening - y.tightening} of ${h.tightening} added deny and ask rules and ${h.allow - y.allow} of ${h.allow} added allow rules dropped, ${w} other updates dropped`,
    );
  return flattened;
}
//@ chunk-e6aww6q8.js:867988-868287 placement
/**
 * 应用权限回答里的更新：被否决时不做；先按限制裁剪、再经 strip 过滤，然后写入会话上下文并统计丢失的收紧规则数。
 */
function applyAnswerPermissionUpdates(e, n, r) {
  if (r.vetoed())
    return {
      applied: [],
      lostTightenings: 0,
    };
  let s = r.strip(applyPermissionAnswer(n, e.limits));
  let h = {
    toolName: r.toolName,
    input: r.input,
  };
  let lostTightenings = applyUpdatesToSessionContext(
    {
      ...e,
      mayAddAllowRule: (S) => e.mayAddAllowRule(S, h),
    },
    s,
    r.toolName,
    r.setContext,
    listAnswerTighteningRules(n, e.limits.ruleLength),
    r.suggested,
  );
  return {
    applied: s,
    lostTightenings,
  };
}
//@ chunk-e6aww6q8.js:868287-868378 placement
function tightensRules(e) {
  return (e.type === "addRules" || e.type === "replaceRules") && e.behavior !== "allow";
}
//@ chunk-e6aww6q8.js:868378-868591 placement
/**
 * 列出权限回答里 deny/ask 规则对应的 [规则表名, 规则串]，过长规则用 unread-rules 占位。
 */
function listAnswerTighteningRules(updatedPermissions, ruleLength) {
  return (updatedPermissions ?? []).flatMap((r) =>
    tightensRules(r)
      ? r.rules.map((rule) => [
          r.behavior === "deny" ? "alwaysDenyRules" : "alwaysAskRules",
          rule.toolName.length + (rule.ruleContent?.length ?? 0) > ruleLength
            ? UNREAD_RULES_DENY_UPDATE.rules[0].toolName
            : formatPermissionRule(permissionRuleValueFromString(formatPermissionRule(rule))),
        ])
      : [],
  );
}
//@ chunk-e6aww6q8.js:868591-869008 placement
/**
 * 把权限更新应用到会话上下文：经托管规则过滤（记录被收窄的部分），模式变化且无丢失时另外切换模式；返回丢失的收紧规则数。
 */
function applyUpdatesToSessionContext(e, n, r, s, h, suggested) {
  if (n.length === 0 && h.length === 0) return 0;
  let S;
  let w = h.length;
  s((L) => {
    let G = applyPermissionUpdates(L, n);
    let { context, offered, kept, lost } = filterManagedPermissionRules(L, G, r, e, h, suggested);
    w = lost;
    S = lost === 0 && G.mode !== L.mode ? G.mode : undefined;
    let we = listChangedRuleTables(context, G);
    if (we.length > 0)
      logForDebugging(
        `a permission answer's changes were narrowed to this session's own rules (${we.join(", ")}): kept ${kept} of ${offered} added rules`,
      );
    return syncRemoteBrowserCardAnswers(L, context);
  });
  if (S !== undefined) e.setMode(S);
  return w;
}
//@ chunk-e6aww6q8.js:869008-870865 placement
/**
 * 过滤托管设置中的 always deny/ask 规则，忽略无效规则。
 */
function filterManagedPermissionRules(e, n, r, s, h, y) {
  let { limits } = s;
  let w =
    h.length === 0
      ? undefined
      : {
          alwaysDenyRules: collectRuleTables(e.alwaysDenyRules),
          alwaysAskRules: collectRuleTables(e.alwaysAskRules),
        };
  let mapped = RULE_TABLE_KEYS.map((Ie) => findRulesMissingFromContext(e[Ie], n[Ie]));
  let mapped_2 = mapped.map((Ie, Me) => {
    let We = RULE_TABLE_KEYS[Me];
    return Ie.filter((ze) => {
      if (ze.length > limits.ruleLength || ze === UNREAD_RULES_DENY_UPDATE.rules[0].toolName) return false;
      if (We === "alwaysDenyRules" || We === "alwaysAskRules") {
        if (!PATH_RULE_CARVE_OUT_RE.test(ze)) return true;
        logForDebugging(
          `Ignoring ${We === "alwaysDenyRules" ? "deny" : "ask"} rule "${quotedPrintable(ze)}" from a permission answer: a path that starts with "!" takes paths out of earlier rules, and an answer may only add restrictions. Send the rule without the exception.`,
          {
            level: "warn",
          },
        );
        return false;
      }
      let lt = permissionRuleValueFromString(ze);
      return (lt.toolName === r || y?.(lt) === true) && s.mayAddAllowRule(lt);
    });
  });
  let reduced = RULE_TABLE_KEYS.reduce((acc, Me) => acc + (e[Me].session?.length ?? 0), 0);
  let max = Math.max(0, Math.min(limits.perAnswer, limits.perSession - reduced));
  let Se = s.denyRuleToAdd(e.alwaysDenyRules.session ?? [], r);
  let ke = 0;
  let mapped_3 = mapped_2.map((Ie, Me) => {
    let We = RULE_TABLE_KEYS[Me];
    let ze = [];
    let lt = false;
    if (We === "alwaysAllowRules") {
      ke =
        w === undefined
          ? 0
          : count(
              h,
              ([Je, nt]) =>
                nt === UNREAD_RULES_DENY_UPDATE.rules[0].toolName ||
                (!w[Je].has(nt) && !PATH_RULE_CARVE_OUT_RE.test(nt)),
            );
      if (ke > 0) return ze;
    }
    for (let Je of Ie) {
      let {
        add: nt,
        why,
        covered,
      } = We === "alwaysDenyRules"
        ? Se(Je)
        : {
            add: Je,
          };
      if (nt !== undefined && ze.length === max) {
        lt = true;
        continue;
      }
      if (nt !== undefined) ze.push(nt);
      if (nt !== Je && (nt !== undefined || (covered === true && !lt))) w?.alwaysDenyRules.add(Je);
      if (nt !== Je)
        logForDebugging(
          `${nt === undefined ? "Ignoring" : `Adding "${quotedPrintable(nt)}" in place of`} deny rule "${quotedPrintable(Je)}" from a permission answer: ${why}`,
          {
            level: "warn",
          },
        );
    }
    max -= ze.length;
    if (We === "alwaysDenyRules" || We === "alwaysAskRules") for (let Je of ze) w?.[We].add(Je);
    return ze;
  });
  let offered = mapped.reduce((acc, Me) => acc + Me.length, 0);
  let reduced_2 = mapped_3.reduce((acc, Me) => acc + Me.length, 0);
  if (reduced_2 === 0)
    return {
      context: e,
      offered,
      kept: 0,
      lost: ke,
    };
  return {
    context: {
      ...e,
      alwaysAllowRules: appendSessionRules(e.alwaysAllowRules, mapped_3[2] ?? []),
      alwaysDenyRules: appendSessionRules(e.alwaysDenyRules, mapped_3[0] ?? []),
      alwaysAskRules: appendSessionRules(e.alwaysAskRules, mapped_3[1] ?? []),
    },
    offered,
    kept: reduced_2,
    lost: ke,
  };
}
//@ chunk-e6aww6q8.js:870865-870924 placement
function collectRuleTables(e) {
  return new Set(RULE_TABLE_NAMES.flatMap((n) => e[n] ?? []));
}
//@ chunk-e6aww6q8.js:870924-871039 placement
function findRulesMissingFromContext(e, n) {
  let ruleTables = collectRuleTables(e);
  let s = new Set();
  for (let h of RULE_TABLE_NAMES) for (let y of n[h] ?? []) if (!ruleTables.has(y)) s.add(y);
  return [...s];
}
//@ chunk-e6aww6q8.js:871039-871118 placement
function appendSessionRules(e, n) {
  return n.length === 0
    ? e
    : {
        ...e,
        session: [...(e.session ?? []), ...n],
      };
}
//@ chunk-e6aww6q8.js:871118-871179 placement
function isAbsentOrEmptyObject(e) {
  return e === undefined || Object.keys(e).length === 0;
}
//@ chunk-e6aww6q8.js:871179-871497 placement
/**
 * 比较两份权限上下文，列出发生变化的规则表（allow/deny/ask 规则、附加目录）。
 */
function listChangedRuleTables(context, n) {
  let r = {
    "allow rules": [context.alwaysAllowRules, n.alwaysAllowRules],
    "deny rules": [context.alwaysDenyRules, n.alwaysDenyRules],
    "ask rules": [context.alwaysAskRules, n.alwaysAskRules],
    directories: [context.additionalWorkingDirectories, n.additionalWorkingDirectories],
  };
  return Object.entries(r).flatMap(([key, [h, y]]) => (isDeepStrictEqual(h, y) ? [] : [key]));
}
export {
  isSameAnswerInput,
  isUnchangedAnswerInput,
  denyChangedAnswerInput,
  applyAnswerPermissionUpdates,
  denyLostTightening,
  applyPermissionAnswerChanges,
  capPermissionUpdates_2,
  PERMISSION_UPDATES_LIMIT_MESSAGE,
  MAX_ANSWER_VALUES,
  MAX_ANSWER_DEPTH,
  MAX_ANSWER_CHARS,
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
