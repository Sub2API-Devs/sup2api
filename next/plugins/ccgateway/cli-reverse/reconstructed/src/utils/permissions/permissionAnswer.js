/**
 * utils/permissions/permissionAnswer.ts
 *
 * 2.1.316 新增：权限回答应用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (30)
 * attribution: placement 29, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { hostOwnedInputFieldSet } from "../plans.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { preprocess, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { INVALID } from "../../../vendor/zod/v4/core/core.js";
import { logForDebugging } from "../debug.js";
import { permissionUpdateSchema } from "../hooks/hookSpecificOutput.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isObjectLike as isObjectLike_5 } from "../../bootstrap/stateSlices.js";
import { TOOL_PERMISSION_REQUEST_FAILED } from "../../cli/toolPermissionStream.js";
import {
  permissionRuleValueFromString as permissionRuleValueFromString_2,
  parseRuleString,
} from "./permissionRuleParser.js";
import { applyPermissionUpdates } from "./PermissionUpdate.js";
import { syncRemoteBrowserCardAnswers } from "./toolPermissionContext.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { quotedPrintable } from "../printableName.js";
import { countWhere } from "../collections.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:868652-868825 placement
/**
 * 从对象型工具输入中去掉宿主专属的键（CHt 给出的集合）；不是对象或无此类键时原样返回。
 */
function stripHostOwnedInputKeys(toolName, input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return input;
  let ownedFields = hostOwnedInputFieldSet(toolName, input);
  if (!ownedFields || !Object.keys(input).some((key) => ownedFields.has(key))) return input;
  return import_reject(input, (value, key) => ownedFields.has(key));
}
//@ chunk-5xgkngpb.js:868825-869088 placement
function stripUnchangedHostOwnedKeys(toolName, updatedInput, observableInput) {
  if (
    typeof updatedInput !== "object" ||
    updatedInput === null ||
    Array.isArray(updatedInput) ||
    typeof observableInput !== "object" ||
    observableInput === null ||
    Array.isArray(observableInput)
  )
    return updatedInput;
  let ownedFields = hostOwnedInputFieldSet(toolName, observableInput);
  if (!ownedFields) return updatedInput;
  let isUnchangedOwned = (key) =>
    ownedFields.has(key) && key in updatedInput && updatedInput[key] === observableInput[key];
  if (!Object.keys(updatedInput).some(isUnchangedOwned)) return updatedInput;
  return import_reject(updatedInput, (value, key) => isUnchangedOwned(key));
}
//@ chunk-5xgkngpb.js:869088-869282 placement
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
//@ chunk-5xgkngpb.js:869282-869937 placement
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
//@ chunk-5xgkngpb.js:869937-870298 placement
/**
 * 权限更新里是否含收紧项：非法条目、deny/ask 规则的 add/replace、或 deny/ask 的目录更新；removeRules 与空规则不算。
 */
function hasTighteningUpdate(updates) {
  return updates.some((update) => {
    if (typeof update !== "object" || update === null) return typeof update === "string" && update !== "";
    let type = Reflect.get(update, "type");
    if (typeof type !== "string") return true;
    let behavior = Reflect.get(update, "behavior");
    let rules = Reflect.get(update, "rules");
    if (type === "removeRules" || (Array.isArray(rules) && rules.length === 0)) return false;
    return type === "addRules" || type === "replaceRules"
      ? behavior !== "allow"
      : behavior === "deny" || behavior === "ask";
  });
}
//@ chunk-5xgkngpb.js:870298-870835 placement
function capPermissionUpdates_2(overflowMode, sourceLabel) {
  return preprocess(
    (updates, ctx) => {
      if (!Array.isArray(updates)) return updates;
      let capped = capPermissionUpdates(updates, overflowMode);
      if (capped === updates) return updates;
      let overflowMessage = `updatedPermissions holds over ${MAX_PERMISSION_ANSWER_UPDATES} updates, rules and directories in all`;
      if (capped === undefined) {
        ctx.issues.push({
          code: "custom",
          message: overflowMessage,
          input: undefined,
        });
        return INVALID;
      }
      logForDebugging(`${overflowMessage}: the rest is not read`, {
        level: "warn",
      });
      return [...capped, UNREAD_RULES_DENY_UPDATE];
    },
    array(permissionUpdateSchema())
      .optional()
      .catch((error) => {
        logForDebugging(
          `Malformed updatedPermissions from ${sourceLabel} ignored: ${error.error.issues[0]?.message ?? "unknown"}`,
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
//@ chunk-5xgkngpb.js:870878-870911 placement
/**
 * MAX_ANSWER_DEPTH：权限回答输入的最大深度；MAX_ANSWER_VALUES：权限回答输入的最大值个数；MAX_ANSWER_CHARS：权限回答输入的最大字符数（同一声明共 3 个绑定）。
 */
var MAX_ANSWER_DEPTH = 64;
var MAX_ANSWER_VALUES = 20000;
var MAX_ANSWER_CHARS = 1048576;
//@ chunk-5xgkngpb.js:870911-871159 placement
/**
 * 比较权限回答的输入与原输入是否深度相等（经 JSON 往返）；输入超出回答大小限制时记警告并返回 false。
 */
function isSameAnswerInput(left, right) {
  let bounds = measureAnswerBounds(left);
  if (!bounds.within) {
    logForDebugging(
      `a permission answer's input is past the answer bounds (${bounds.values} values, depth ${bounds.depth}, ${bounds.chars} string characters when the walk stopped)`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return isDeepStrictEqual(jsonParse(jsonStringify(left)), jsonParse(jsonStringify(right)));
}
//@ chunk-5xgkngpb.js:871159-871468 placement
/**
 * 迭代遍历值，统计值数、深度与字符数，判断是否在权限回答的大小限制内。
 */
function measureAnswerBounds(value) {
  let totals = {
    values: 0,
    depth: 0,
    chars: 0,
  };
  let stack = [];
  let within = countAnswerValue(value, 0, 1, totals, stack);
  while (within && stack.length > 0) {
    let { container, level } = stack.pop();
    if (Array.isArray(container)) {
      for (let idx = 0; within && idx < container.length; idx++)
        within = countAnswerValue(container[idx], 0, level + 1, totals, stack);
      continue;
    }
    for (let key in container) {
      if (!within) break;
      if (Object.hasOwn(container, key))
        within = countAnswerValue(container[key], key.length, level + 1, totals, stack);
    }
  }
  return {
    within,
    ...totals,
  };
}
//@ chunk-5xgkngpb.js:871468-871664 placement
function countAnswerValue(value, keyLength, level, totals, stack) {
  totals.values++;
  totals.chars += keyLength + (typeof value === "string" ? value.length : 0);
  if (isObjectLike_5(value)) {
    totals.depth = Math.max(totals.depth, level);
    stack.push({
      container: value,
      level,
    });
  }
  return (
    totals.values <= MAX_ANSWER_VALUES && totals.depth <= MAX_ANSWER_DEPTH && totals.chars <= MAX_ANSWER_CHARS
  );
}
//@ chunk-5xgkngpb.js:871664-872296 placement
/**
 * ANSWER_CHANGED_INPUT_MESSAGE：回答改写了调用时的说明；ANSWER_RULES_UNAPPLIED_MESSAGE：规则未能全部应用时的说明；RULE_TABLE_NAMES：四个规则表名（同一声明共 4 个绑定）。
 */
var applyPermissionAnswerChanges; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANSWER_CHANGED_INPUT_MESSAGE;
var ANSWER_RULES_UNAPPLIED_MESSAGE;
var RULE_TABLE_NAMES;
var RULE_TABLE_KEYS;
deferInit("chunk-5xgkngpb.js:871664", () => {
  applyPermissionAnswerChanges = Object.freeze({
    kind: "launcher",
  });
  ANSWER_CHANGED_INPUT_MESSAGE =
    "The permission answer changed the tool call, and this session runs a call only as it was asked. Nothing ran.";
  ANSWER_RULES_UNAPPLIED_MESSAGE =
    "The call was not run. The permission answer allowed it and also asked for changes to the permission rules. This session could not apply them all, so a deny or ask rule among them may not be in force. Nothing that the answer allowed is in force either. Tell the person so. A new call can be allowed by an answer that changes fewer rules, or none.";
  RULE_TABLE_NAMES = ["session", "localSettings", "projectSettings", "userSettings"];
  RULE_TABLE_KEYS = ["alwaysDenyRules", "alwaysAskRules", "alwaysAllowRules"];
});
//@ chunk-5xgkngpb.js:872296-872349 placement
/**
 * isUnchangedAnswerInput：输入为空或与原输入相同。
 */
function isUnchangedAnswerInput(updatedInput, observableInput) {
  return (
    isAbsentOrEmptyObject(updatedInput) ||
    (updatedInput !== undefined && isSameAnswerInput(updatedInput, observableInput))
  );
}
//@ chunk-5xgkngpb.js:872349-873020 placement
function admitCardAnswer(updatedInput, observableInput, tool, setter) {
  if (isUnchangedAnswerInput(updatedInput, observableInput))
    return isAbsentOrEmptyObject(updatedInput)
      ? stripHostOwnedInputKeys(tool.name, observableInput)
      : observableInput;
  if (updatedInput === undefined || tool.admitCardAnswer === undefined) return;
  let verdict;
  try {
    verdict = tool.admitCardAnswer(observableInput, updatedInput);
  } catch {
    logForDebugging(`${tool.name}'s card-answer admitter threw: the answer is refused`, {
      level: "warn",
    });
    setAnswerNotAdmitted(setter, tool.name, "threw");
    return;
  }
  switch (verdict.kind) {
    case "refused":
      logForDebugging(`a permission answer for ${tool.name} broke its card-answer rules: ${verdict.rule}`, {
        level: "warn",
      });
      setAnswerNotAdmitted(setter, tool.name, verdict.rule);
      return;
    case "admitted": {
      let { input } = verdict;
      if (
        !Object.keys(observableInput).every(
          (key) => Object.hasOwn(input, key) && input[key] === observableInput[key],
        )
      ) {
        logForDebugging(
          `${tool.name}'s card-answer admitter changed a field the card showed: the answer is refused`,
          {
            level: "warn",
          },
        );
        setAnswerNotAdmitted(setter, tool.name, "changed_by_admitter");
        return;
      }
      return input;
    }
  }
}
//@ chunk-5xgkngpb.js:873020-873030 placement
var MAX_CARD_FORMS = 3;
//@ chunk-5xgkngpb.js:873030-873585 placement
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
  let reportRefused = (reason) => {
    try {
      onRefused(reason);
    } catch {
      logForDebugging(`the host's count of refused card answers threw for ${tool.name} (${reason})`, {
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
//@ chunk-5xgkngpb.js:873585-873859 placement
/**
 * 权限回答改动了调用输入时生成拒绝决定并记警告。
 */
function denyChangedAnswerInput(name, toolUseId) {
  logForDebugging(`refused a permission answer for ${name}: it changed the call's input`, {
    level: "warn",
  });
  return {
    behavior: "deny",
    message: ANSWER_CHANGED_INPUT_MESSAGE,
    ...(toolUseId !== undefined && {
      toolUseID: toolUseId,
    }),
    decisionReason: {
      type: "other",
      reason: "the permission answer changed the call",
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-5xgkngpb.js:873859-874213 placement
/**
 * 权限回答加入（或可能加入）的 deny/ask 规则没能进入会话规则时生成拒绝决定并记警告。
 */
function denyLostTightening(name, toolUseId) {
  logForDebugging(
    `refused a permission answer for ${name}: a deny or ask rule that the answer added, or may have added, is not among the session's rules`,
    {
      level: "warn",
    },
  );
  return {
    behavior: "deny",
    message: ANSWER_RULES_UNAPPLIED_MESSAGE,
    ...(toolUseId !== undefined && {
      toolUseID: toolUseId,
    }),
    decisionReason: {
      type: "other",
      reason: "a deny or ask rule of the answer may not be in force",
    },
    decideLocation: "ask-path",
  };
}
//@ chunk-5xgkngpb.js:874213-874371 placement
/**
 * 按权限请求方式格式化请求失败信息：launcher 模式带上原因，strict 模式记录日志后只返回固定文字。
 */
function formatPermissionRequestFailure(mode, error, name) {
  switch (mode.kind) {
    case "launcher":
      return `${TOOL_PERMISSION_REQUEST_FAILED}: ${error}`;
    case "strict":
      logForDebugging(`permission request for ${name} failed: ${error}`, {
        level: "error",
      });
      return TOOL_PERMISSION_REQUEST_FAILED;
  }
}
//@ chunk-5xgkngpb.js:874371-875563 placement
/**
 * 应用权限回答中的规则更新（添加、替换），处理收紧与放宽。
 */
function applyPermissionAnswer(updates, limits) {
  let list = updates ?? [];
  let perAnswer = limits.perAnswer;
  let declared = {
    tightening: 0,
    allow: 0,
  };
  let kept = {
    tightening: 0,
    allow: 0,
  };
  let keptRulesByIndex = [];
  for (let bucket of ["tightening", "allow"])
    for (let [index, update] of list.entries()) {
      if (update.type !== "addRules" && update.type !== "replaceRules") continue;
      let isTightening = update.behavior === "deny" || update.behavior === "ask";
      if (isTightening !== (bucket === "tightening") || (update.type === "replaceRules" && !isTightening))
        continue;
      declared[bucket] += update.rules.length;
      let sliced = update.rules
        .filter((rule) => permissionRuleValueFromString_2(rule).length <= limits.ruleLength)
        .slice(0, perAnswer);
      perAnswer -= sliced.length;
      kept[bucket] += sliced.length;
      keptRulesByIndex[index] = sliced;
    }
  let droppedCount = 0;
  let flattened = list.flatMap((update, index) => {
    switch (update.type) {
      case "addRules":
      case "replaceRules": {
        let keptRules = keptRulesByIndex[index];
        if (keptRules === undefined) {
          droppedCount++;
          return [];
        }
        return keptRules.length === 0
          ? []
          : [
              {
                ...update,
                type: "addRules",
                rules: keptRules,
                destination: "session",
              },
            ];
      }
      case "setMode":
        return [
          {
            ...update,
            destination: "session",
          },
        ];
      case "removeRules":
      case "addDirectories":
      case "removeDirectories":
        droppedCount++;
        return [];
      default: {
        let unknownUpdate = update;
        droppedCount++;
        logForDebugging(
          `a permission answer carried an update of unknown type ${String(unknownUpdate.type)}: dropped`,
          {
            level: "warn",
          },
        );
        return [];
      }
    }
  });
  if (kept.tightening < declared.tightening || kept.allow < declared.allow || droppedCount > 0)
    logForDebugging(
      `a permission answer was capped: ${declared.tightening - kept.tightening} of ${declared.tightening} added deny and ask rules and ${declared.allow - kept.allow} of ${declared.allow} added allow rules dropped, ${droppedCount} other updates dropped`,
    );
  return flattened;
}
//@ chunk-5xgkngpb.js:875563-875862 placement
/**
 * 应用权限回答里的更新：被否决时不做；先按限制裁剪、再经 strip 过滤，然后写入会话上下文并统计丢失的收紧规则数。
 */
function applyAnswerPermissionUpdates(answerPolicy, updates, options) {
  if (options.vetoed())
    return {
      applied: [],
      lostTightenings: 0,
    };
  let applied = options.strip(applyPermissionAnswer(updates, answerPolicy.limits));
  let toolInfo = {
    toolName: options.toolName,
    input: options.input,
  };
  let lostTightenings = applyUpdatesToSessionContext(
    {
      ...answerPolicy,
      mayAddAllowRule: (ruleValue) => answerPolicy.mayAddAllowRule(ruleValue, toolInfo),
    },
    applied,
    options.toolName,
    options.setContext,
    listAnswerTighteningRules(updates, answerPolicy.limits.ruleLength),
    options.suggested,
  );
  return {
    applied,
    lostTightenings,
  };
}
//@ chunk-5xgkngpb.js:875862-875953 placement
function tightensRules(update) {
  return (update.type === "addRules" || update.type === "replaceRules") && update.behavior !== "allow";
}
//@ chunk-5xgkngpb.js:875953-876166 placement
/**
 * 列出权限回答里 deny/ask 规则对应的 [规则表名, 规则串]，过长规则用 unread-rules 占位。
 */
function listAnswerTighteningRules(updates, ruleLength) {
  return (updates ?? []).flatMap((update) =>
    tightensRules(update)
      ? update.rules.map((rule) => [
          update.behavior === "deny" ? "alwaysDenyRules" : "alwaysAskRules",
          rule.toolName.length + (rule.ruleContent?.length ?? 0) > ruleLength
            ? UNREAD_RULES_DENY_UPDATE.rules[0].toolName
            : permissionRuleValueFromString_2(parseRuleString(permissionRuleValueFromString_2(rule))),
        ])
      : [],
  );
}
//@ chunk-5xgkngpb.js:876166-876585 placement
/**
 * 把权限更新应用到会话上下文：经托管规则过滤（记录被收窄的部分），模式变化且无丢失时另外切换模式；返回丢失的收紧规则数。
 */
function applyUpdatesToSessionContext(
  answerPolicy,
  updates,
  toolName,
  setContext,
  tighteningRules,
  isAllowedTool,
) {
  if (updates.length === 0 && tighteningRules.length === 0) return 0;
  let modeToSet;
  let lost = tighteningRules.length;
  setContext((context) => {
    let nextContext = applyPermissionUpdates(context, updates);
    let {
      context: context_2,
      offered,
      kept,
      lost: lost_2,
    } = filterManagedPermissionRules(
      context,
      nextContext,
      toolName,
      answerPolicy,
      tighteningRules,
      isAllowedTool,
    );
    lost = lost_2;
    modeToSet = lost_2 === 0 && nextContext.mode !== context.mode ? nextContext.mode : undefined;
    let changedTables = listChangedRuleTables(context_2, nextContext);
    if (changedTables.length > 0)
      logForDebugging(
        `a permission answer's changes were narrowed to this session's own rules (${changedTables.join(", ")}): kept ${kept} of ${offered} added rules`,
      );
    return syncRemoteBrowserCardAnswers(context, context_2);
  });
  if (modeToSet !== undefined) answerPolicy.setMode(modeToSet);
  return lost;
}
//@ chunk-5xgkngpb.js:876585-878445 placement
/**
 * 过滤托管设置中的 always deny/ask 规则，忽略无效规则。
 */
function filterManagedPermissionRules(
  context,
  previousContext,
  toolName,
  answerPolicy,
  newRules,
  isAllowedTool,
) {
  let { limits } = answerPolicy;
  let ruleTables =
    newRules.length === 0
      ? undefined
      : {
          alwaysDenyRules: collectRuleTables(context.alwaysDenyRules),
          alwaysAskRules: collectRuleTables(context.alwaysAskRules),
        };
  let mapped = RULE_TABLE_KEYS.map((field) =>
    findRulesMissingFromContext(context[field], previousContext[field]),
  );
  let mapped_2 = mapped.map((rules, index) => {
    let field = RULE_TABLE_KEYS[index];
    return rules.filter((ruleString) => {
      if (ruleString.length > limits.ruleLength || ruleString === UNREAD_RULES_DENY_UPDATE.rules[0].toolName)
        return false;
      if (field === "alwaysDenyRules" || field === "alwaysAskRules") {
        if (!PATH_RULE_CARVE_OUT_RE.test(ruleString)) return true;
        logForDebugging(
          `Ignoring ${field === "alwaysDenyRules" ? "deny" : "ask"} rule "${quotedPrintable(ruleString)}" from a permission answer: a path that starts with "!" takes paths out of earlier rules, and an answer may only add restrictions. Send the rule without the exception.`,
          {
            level: "warn",
          },
        );
        return false;
      }
      let ruleValue = parseRuleString(ruleString);
      return (
        (ruleValue.toolName === toolName || isAllowedTool?.(ruleValue) === true) &&
        answerPolicy.mayAddAllowRule(ruleValue)
      );
    });
  });
  let reduced = RULE_TABLE_KEYS.reduce((acc, field) => acc + (context[field].session?.length ?? 0), 0);
  let max = Math.max(0, Math.min(limits.perAnswer, limits.perSession - reduced));
  let dedupeDenyRule = answerPolicy.denyRuleToAdd(context.alwaysDenyRules.session ?? [], toolName);
  let lostCount = 0;
  let mapped_3 = mapped_2.map((rules, index) => {
    let field = RULE_TABLE_KEYS[index];
    let kept = [];
    let overBudget = false;
    if (field === "alwaysAllowRules") {
      lostCount =
        ruleTables === undefined
          ? 0
          : countWhere(
              newRules,
              ([ruleField, ruleString]) =>
                ruleString === UNREAD_RULES_DENY_UPDATE.rules[0].toolName ||
                (!ruleTables[ruleField].has(ruleString) && !PATH_RULE_CARVE_OUT_RE.test(ruleString)),
            );
      if (lostCount > 0) return kept;
    }
    for (let ruleString of rules) {
      let {
        add: ruleToAdd,
        why,
        covered,
      } = field === "alwaysDenyRules"
        ? dedupeDenyRule(ruleString)
        : {
            add: ruleString,
          };
      if (ruleToAdd !== undefined && kept.length === max) {
        overBudget = true;
        continue;
      }
      if (ruleToAdd !== undefined) kept.push(ruleToAdd);
      if (ruleToAdd !== ruleString && (ruleToAdd !== undefined || (covered === true && !overBudget)))
        ruleTables?.alwaysDenyRules.add(ruleString);
      if (ruleToAdd !== ruleString)
        logForDebugging(
          `${ruleToAdd === undefined ? "Ignoring" : `Adding "${quotedPrintable(ruleToAdd)}" in place of`} deny rule "${quotedPrintable(ruleString)}" from a permission answer: ${why}`,
          {
            level: "warn",
          },
        );
    }
    max -= kept.length;
    if (field === "alwaysDenyRules" || field === "alwaysAskRules")
      for (let keptRule of kept) ruleTables?.[field].add(keptRule);
    return kept;
  });
  let offered = mapped.reduce((acc, rules) => acc + rules.length, 0);
  let reduced_2 = mapped_3.reduce((acc, rules) => acc + rules.length, 0);
  if (reduced_2 === 0)
    return {
      context,
      offered,
      kept: 0,
      lost: lostCount,
    };
  return {
    context: {
      ...context,
      alwaysAllowRules: appendSessionRules(context.alwaysAllowRules, mapped_3[2] ?? []),
      alwaysDenyRules: appendSessionRules(context.alwaysDenyRules, mapped_3[0] ?? []),
      alwaysAskRules: appendSessionRules(context.alwaysAskRules, mapped_3[1] ?? []),
    },
    offered,
    kept: reduced_2,
    lost: lostCount,
  };
}
//@ chunk-5xgkngpb.js:878445-878504 placement
function collectRuleTables(permissionTable) {
  return new Set(RULE_TABLE_NAMES.flatMap((tableName) => permissionTable[tableName] ?? []));
}
//@ chunk-5xgkngpb.js:878504-878619 placement
function findRulesMissingFromContext(context, previousContext) {
  let ruleTables = collectRuleTables(context);
  let missing = new Set();
  for (let field of RULE_TABLE_NAMES)
    for (let ruleString of previousContext[field] ?? [])
      if (!ruleTables.has(ruleString)) missing.add(ruleString);
  return [...missing];
}
//@ chunk-5xgkngpb.js:878619-878698 placement
function appendSessionRules(rulesBySource, rules) {
  return rules.length === 0
    ? rulesBySource
    : {
        ...rulesBySource,
        session: [...(rulesBySource.session ?? []), ...rules],
      };
}
//@ chunk-5xgkngpb.js:878698-878759 placement
function isAbsentOrEmptyObject(input) {
  return input === undefined || Object.keys(input).length === 0;
}
//@ chunk-5xgkngpb.js:878759-879077 placement
/**
 * 比较两份权限上下文，列出发生变化的规则表（allow/deny/ask 规则、附加目录）。
 */
function listChangedRuleTables(context, nextContext) {
  let tables = {
    "allow rules": [context.alwaysAllowRules, nextContext.alwaysAllowRules],
    "deny rules": [context.alwaysDenyRules, nextContext.alwaysDenyRules],
    "ask rules": [context.alwaysAskRules, nextContext.alwaysAskRules],
    directories: [context.additionalWorkingDirectories, nextContext.additionalWorkingDirectories],
  };
  return Object.entries(tables).flatMap(([key, [before, after]]) =>
    isDeepStrictEqual(before, after) ? [] : [key],
  );
}
//@ chunk-5xgkngpb.js:879077-879126 sole-consumer
function setAnswerNotAdmitted(setter, name, value) {
  try {
    setter(name, value);
  } catch (error) {
    logError(toError(error));
  }
}
export {
  isSameAnswerInput,
  isUnchangedAnswerInput,
  denyChangedAnswerInput,
  applyAnswerPermissionUpdates,
  denyLostTightening,
  applyPermissionAnswerChanges,
  stripHostOwnedInputKeys,
  capPermissionUpdates_2,
  PERMISSION_UPDATES_LIMIT_MESSAGE,
  admitCardAnswer,
  matchCardFormAnswer,
  formatPermissionRequestFailure,
  applyUpdatesToSessionContext,
  applyPermissionAnswer,
  listAnswerTighteningRules,
  measureAnswerBounds,
  stripUnchangedHostOwnedKeys,
  MAX_ANSWER_VALUES,
  MAX_ANSWER_DEPTH,
  MAX_ANSWER_CHARS,
};
