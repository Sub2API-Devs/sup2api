/**
 * utils/envFlagValues.ts
 *
 * 2.1.316 新增：环境变量开关取值
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { antEnv } from "./env.js";
import { getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";

//@ chunk-5xgkngpb.js:4752898-4752932 placement
/**
 * 读取"编辑移除是否可见"的会话设置值。
 */
function editRemovalVisibilityValue() {
  return editRemovalVisibilitySetting().value;
}
//@ chunk-5xgkngpb.js:4752932-4753159 placement
function editRemovalVisibilitySetting() {
  let CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL = antEnv.CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL;
  if (CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL,
      src: "env",
    };
  let autoModeConfigOrDefault = getAutoModeConfigOrDefault();
  return typeof autoModeConfigOrDefault?.editRemovalVisibility === "boolean"
    ? {
        value: autoModeConfigOrDefault.editRemovalVisibility,
        src: "gb",
      }
    : {
        value: false,
        src: "default",
      };
}
//@ chunk-5xgkngpb.js:4753159-4753172 placement
var DEFAULT_EDIT_REMOVAL_CAP_MS = 3000;
//@ chunk-5xgkngpb.js:4753172-4753206 placement
/**
 * 读取"编辑移除上限"的会话设置值。
 */
function editRemovalCapValue() {
  return editRemovalCapSetting().value;
}
//@ chunk-5xgkngpb.js:4753206-4753428 placement
function editRemovalCapSetting() {
  let CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP = antEnv.CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP;
  if (CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP,
      src: "env",
    };
  let editRemovalCap = getAutoModeConfigOrDefault()?.editRemovalCap;
  return typeof editRemovalCap === "number" && Number.isFinite(editRemovalCap)
    ? {
        value: editRemovalCap,
        src: "gb",
      }
    : {
        value: DEFAULT_EDIT_REMOVAL_CAP_MS,
        src: "default",
      };
}
export { editRemovalCapValue, editRemovalVisibilityValue };
