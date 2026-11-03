/**
 * tools/RolePickerTool/RolePickerTool.ts
 *
 * 2.1.316 新增：显示 Cowork 入门角色选择器的工具；校验角色选择回答等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  SHOWONBOARDINGROLEPICKER,
  SHOW_ONBOARDING_ROLE_PICKER_DESCRIPTION,
  SHOW_ONBOARDING_ROLE_PICKER_PROMPT,
} from "../ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-kxyd0g16.js:11581-11642 placement
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
//@ chunk-kxyd0g16.js:11642-11653 placement
/**
 * 角色选择结果的最大字符数（10000）。
 */
var MAX_ROLE_PICKER_RESULT_CHARS = 1e4;
//@ chunk-kxyd0g16.js:11653-12231 placement
/**
 * 校验角色选择回答。
 */
function checkRolePickerAnswer(e, r) {
  try {
    let prototypeOf = Object.getPrototypeOf(r);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return roleAnswerRefusal("not_an_object");
    let keys = Object.keys(r);
    let f = keys[0];
    if (f === undefined || keys.length > 1) return roleAnswerRefusal("unknown_field");
    if (Object.keys(e).length > 0) return roleAnswerRefusal("changed_shown_field");
    let h = r[f];
    switch (f) {
      case "role":
        if (typeof h !== "string") return roleAnswerRefusal("response");
        return h.length > 9991 || JSON.stringify(h).length > 9991
          ? roleAnswerRefusal("too_large")
          : {
              kind: "admitted",
              input: {
                role: h,
              },
            };
      case "dismissed":
        return h === true
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
//@ chunk-kxyd0g16.js:12231-12276 placement
/**
 * 构造角色选择的拒绝结果 {kind:"refused", rule}。
 */
function roleAnswerRefusal(rule) {
  return {
    kind: "refused",
    rule,
  };
}
//@ chunk-kxyd0g16.js:12276-12357 placement
/**
 * 角色选择器的输入 schema（空对象）。
 */
var rolePickerInputSchema = DoctorLazy(() => zodStrictObject({}));
var rolePickerOutputSchema = DoctorLazy(() =>
  u({
    role: string().optional(),
    dismissed: M().optional(),
  }),
);
//@ chunk-kxyd0g16.js:12357-12399 placement
/**
 * 判断是否为远程会话（环境变量 CLAUDE_CODE_REMOTE）。
 */
function isRemoteSession() {
  return env.CLAUDE_CODE_REMOTE;
}
//@ chunk-kxyd0g16.js:12399-13206 placement
/**
 * 显示 Cowork 入门角色选择器的工具。
 */
var RolePickerTool = buildTool({
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
      async checkPermissions(e) {
        return {
          behavior: "ask",
          message: "Pick your role?",
          updatedInput: {},
        };
      },
      async call(e) {
        let { role, dismissed } = e;
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
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(e),
    };
  },
  renderToolUseMessage() {
    return null;
  },
});
//@ chunk-kxyd0g16.js:13206-13642 placement
/**
 * 校验 Chrome 设置回答。
 */
function checkChromeSetupAnswer(e, r) {
  try {
    let prototypeOf = Object.getPrototypeOf(r);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return chromeAnswerRefusal("not_an_object");
    let s = {};
    for (let key of Object.keys(e)) {
      if (!Object.hasOwn(r, key) || r[key] !== e[key]) return chromeAnswerRefusal("changed_shown_field");
      s[key] = e[key];
    }
    for (let key of Object.keys(r)) {
      if (Object.hasOwn(e, key)) continue;
      if (key !== "outcome") return chromeAnswerRefusal("unknown_field");
      if (r[key] === "connected") s.outcome = "connected";
    }
    return {
      kind: "admitted",
      input: s,
    };
  } catch {
    return chromeAnswerRefusal("threw");
  }
}
//@ chunk-kxyd0g16.js:13642-13687 placement
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
