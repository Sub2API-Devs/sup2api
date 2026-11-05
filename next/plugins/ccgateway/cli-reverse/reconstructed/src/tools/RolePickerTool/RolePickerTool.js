/**
 * tools/RolePickerTool/RolePickerTool.ts
 *
 * 2.1.316 新增：显示 Cowork 入门角色选择器的工具；校验角色选择回答等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  objectSchema,
  stringSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  SHOWONBOARDINGROLEPICKER,
  SHOW_ONBOARDING_ROLE_PICKER_DESCRIPTION,
  SHOW_ONBOARDING_ROLE_PICKER_PROMPT,
} from "../ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:18800-18861 placement
/**
 * 构造“工具不可用”的结果（带说明）。
 */
function unavailableResult(message) {
  return {
    data: {
      status: "unavailable",
      message,
    },
  };
}
//@ chunk-fmnbrxwy.js:18861-18872 placement
/**
 * 角色选择结果的最大字符数（10000）。
 */
var MAX_ROLE_PICKER_RESULT_CHARS = 1e4;
//@ chunk-fmnbrxwy.js:18872-19450 placement
/**
 * 校验角色选择回答。
 */
function checkRolePickerAnswer(shownInput, reply) {
  try {
    let prototypeOf = Object.getPrototypeOf(reply);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return roleAnswerRefusal("not_an_object");
    let keys = Object.keys(reply);
    let fieldName = keys[0];
    if (fieldName === undefined || keys.length > 1) return roleAnswerRefusal("unknown_field");
    if (Object.keys(shownInput).length > 0) return roleAnswerRefusal("changed_shown_field");
    let fieldValue = reply[fieldName];
    switch (fieldName) {
      case "role":
        if (typeof fieldValue !== "string") return roleAnswerRefusal("response");
        return fieldValue.length > 9991 || JSON.stringify(fieldValue).length > 9991
          ? roleAnswerRefusal("too_large")
          : {
              kind: "admitted",
              input: {
                role: fieldValue,
              },
            };
      case "dismissed":
        return fieldValue === true
          ? {
              kind: "admitted",
              input: {
                dismissed: true,
              },
            }
          : roleAnswerRefusal("response");
      default:
        return roleAnswerRefusal("unknown_field");
    }
  } catch {
    return roleAnswerRefusal("threw");
  }
}
//@ chunk-fmnbrxwy.js:19450-19495 placement
/**
 * 构造角色选择的拒绝结果 {kind:"refused", rule}。
 */
function roleAnswerRefusal(rule) {
  return {
    kind: "refused",
    rule,
  };
}
//@ chunk-fmnbrxwy.js:19495-19576 placement
/**
 * 角色选择器的输入 schema（空对象）。
 */
var rolePickerInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var rolePickerOutputSchema;
deferInit("chunk-fmnbrxwy.js:19495", () => {
  rolePickerInputSchema = DoctorLazy(() => zodStrictObject({}));
  rolePickerOutputSchema = DoctorLazy(() =>
    objectSchema({
      role: stringSchema().optional(),
      dismissed: booleanSchema().optional(),
    }),
  );
});
//@ chunk-fmnbrxwy.js:19576-19618 placement
/**
 * 判断是否为远程会话（环境变量 CLAUDE_CODE_REMOTE）。
 */
function isRemoteSession() {
  return env.CLAUDE_CODE_REMOTE;
}
//@ chunk-fmnbrxwy.js:19618-20425 placement
/**
 * 显示 Cowork 入门角色选择器的工具。
 */
var RolePickerTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:19618", () => {
  RolePickerTool = buildTool({
    name: SHOWONBOARDINGROLEPICKER,
    searchHint: "show the Cowork onboarding role picker",
    backgrounding: "never",
    maxResultSizeChars: MAX_ROLE_PICKER_RESULT_CHARS,
    get inputSchema() {
      return rolePickerInputSchema();
    },
    get outputSchema() {
      return rolePickerOutputSchema();
    },
    isEnabled: isRemoteSession,
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    requiresUserInteraction() {
      return true;
    },
    admitCardAnswer: checkRolePickerAnswer,
    async description() {
      return SHOW_ONBOARDING_ROLE_PICKER_DESCRIPTION;
    },
    async prompt() {
      return SHOW_ONBOARDING_ROLE_PICKER_PROMPT;
    },
    toAutoClassifierInput() {
      return "show onboarding role picker";
    },
    create() {
      return {
        async checkPermissions(input) {
          return {
            behavior: "ask",
            message: "Pick your role?",
            updatedInput: {},
          };
        },
        async call(input) {
          let { role, dismissed } = input;
          return {
            data: {
              ...(typeof role === "string" &&
                role.trim() !== "" && {
                  role,
                }),
              ...(typeof dismissed === "boolean" && {
                dismissed,
              }),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: jsonStringify(result),
      };
    },
    renderToolUseMessage() {
      return null;
    },
  });
});
//@ chunk-fmnbrxwy.js:20425-20861 placement
/**
 * 校验 Chrome 设置回答。
 */
function checkChromeSetupAnswer(shownFields, answer) {
  try {
    let prototypeOf = Object.getPrototypeOf(answer);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return chromeAnswerRefusal("not_an_object");
    let admitted = {};
    for (let key of Object.keys(shownFields)) {
      if (!Object.hasOwn(answer, key) || answer[key] !== shownFields[key])
        return chromeAnswerRefusal("changed_shown_field");
      admitted[key] = shownFields[key];
    }
    for (let key of Object.keys(answer)) {
      if (Object.hasOwn(shownFields, key)) continue;
      if (key !== "outcome") return chromeAnswerRefusal("unknown_field");
      if (answer[key] === "connected") admitted.outcome = "connected";
    }
    return {
      kind: "admitted",
      input: admitted,
    };
  } catch {
    return chromeAnswerRefusal("threw");
  }
}
//@ chunk-fmnbrxwy.js:20861-20906 placement
/**
 * 构造 Chrome 设置回答的拒绝结果 {kind:"refused", rule}。
 */
function chromeAnswerRefusal(rule) {
  return {
    kind: "refused",
    rule,
  };
}
export { RolePickerTool, unavailableResult, checkChromeSetupAnswer };
