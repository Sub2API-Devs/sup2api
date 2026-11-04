/**
 * utils/envFlagValues.ts
 *
 * 2.1.316 新增：环境变量开关取值
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { antEnv } from "./env.js";
import { getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";

//@ chunk-e6aww6q8.js:4644313-4644347 placement
/**
 * 读取"编辑移除是否可见"的会话设置值。
 */
function editRemovalVisibilityValue() {
  return editRemovalVisibilitySetting().value;
}
//@ chunk-e6aww6q8.js:4644347-4644574 placement
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
//@ chunk-e6aww6q8.js:4644574-4644587 placement
var DEFAULT_EDIT_REMOVAL_CAP_MS = 3000;
//@ chunk-e6aww6q8.js:4644587-4644621 placement
/**
 * 读取"编辑移除上限"的会话设置值。
 */
function editRemovalCapValue() {
  return editRemovalCapSetting().value;
}
//@ chunk-e6aww6q8.js:4644621-4644843 placement
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
