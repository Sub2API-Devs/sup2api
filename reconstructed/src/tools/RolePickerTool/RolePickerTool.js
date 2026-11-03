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
import { zodStrictObject, u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  SHOWONBOARDINGROLEPICKER,
  asi,
  lsi,
} from "../ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-kxyd0g16.js:11581-11642 placement
function ge(e) {
  return { data: { status: "unavailable", message: e } };
}
//@ chunk-kxyd0g16.js:11642-11653 placement
var Yt = 1e4;
/**
 * 校验角色选择回答。
 */
//@ chunk-kxyd0g16.js:11653-12231 placement
function checkRolePickerAnswer(e, r) {
  try {
    let prototypeOf = Object.getPrototypeOf(r);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return ce("not_an_object");
    let keys = Object.keys(r),
      f = keys[0];
    if (f === void 0 || keys.length > 1) return ce("unknown_field");
    if (Object.keys(e).length > 0) return ce("changed_shown_field");
    let h = r[f];
    switch (f) {
      case "role":
        if (typeof h !== "string") return ce("response");
        return h.length > 9991 || JSON.stringify(h).length > 9991
          ? ce("too_large")
          : { kind: "admitted", input: { role: h } };
      case "dismissed":
        return h === !0 ? { kind: "admitted", input: { dismissed: !0 } } : ce("response");
      default:
        return ce("unknown_field");
    }
  } catch {
    return ce("threw");
  }
}
//@ chunk-kxyd0g16.js:12231-12276 placement
function ce(e) {
  return { kind: "refused", rule: e };
}
//@ chunk-kxyd0g16.js:12276-12357 placement
var Dn = DoctorLazy(() => zodStrictObject({})),
  Ln = DoctorLazy(() => u({ role: o().optional(), dismissed: M().optional() }));
//@ chunk-kxyd0g16.js:12357-12399 placement
function Mn() {
  return env.CLAUDE_CODE_REMOTE;
}
/**
 * 显示 Cowork 入门角色选择器的工具。
 */
//@ chunk-kxyd0g16.js:12399-13206 placement
var RolePickerTool = buildTool({
  name: SHOWONBOARDINGROLEPICKER,
  searchHint: "show the Cowork onboarding role picker",
  backgrounding: "never",
  maxResultSizeChars: Yt,
  get inputSchema() {
    return Dn();
  },
  get outputSchema() {
    return Ln();
  },
  isEnabled: Mn,
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  requiresUserInteraction() {
    return !0;
  },
  admitCardAnswer: checkRolePickerAnswer,
  async description() {
    return asi;
  },
  async prompt() {
    return lsi;
  },
  toAutoClassifierInput() {
    return "show onboarding role picker";
  },
  create() {
    return {
      async checkPermissions(e) {
        return { behavior: "ask", message: "Pick your role?", updatedInput: {} };
      },
      async call(e) {
        let { role: role, dismissed: dismissed } = e;
        return {
          data: {
            ...(typeof role === "string" && role.trim() !== "" && { role: role }),
            ...(typeof dismissed === "boolean" && { dismissed: dismissed }),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, r) {
    return { tool_use_id: r, type: "tool_result", content: jsonStringify(e) };
  },
  renderToolUseMessage() {
    return null;
  },
});
/**
 * 校验 Chrome 设置回答。
 */
//@ chunk-kxyd0g16.js:13206-13642 placement
function checkChromeSetupAnswer(e, r) {
  try {
    let prototypeOf = Object.getPrototypeOf(r);
    if (prototypeOf !== Object.prototype && prototypeOf !== null) return Me("not_an_object");
    let s = {};
    for (let f of Object.keys(e)) {
      if (!Object.hasOwn(r, f) || r[f] !== e[f]) return Me("changed_shown_field");
      s[f] = e[f];
    }
    for (let f of Object.keys(r)) {
      if (Object.hasOwn(e, f)) continue;
      if (f !== "outcome") return Me("unknown_field");
      if (r[f] === "connected") s.outcome = "connected";
    }
    return { kind: "admitted", input: s };
  } catch {
    return Me("threw");
  }
}
//@ chunk-kxyd0g16.js:13642-13687 placement
function Me(e) {
  return { kind: "refused", rule: e };
}

export { RolePickerTool, ge, checkChromeSetupAnswer };
