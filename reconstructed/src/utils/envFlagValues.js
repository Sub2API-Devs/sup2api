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
function Yfn() {
  return editRemovalVisibilitySetting().value;
}
//@ chunk-e6aww6q8.js:4644347-4644574 placement
function editRemovalVisibilitySetting() {
  let CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL = antEnv.CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL;
  if (CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL, src: "env" };
  let n = getAutoModeConfigOrDefault();
  return typeof n?.editRemovalVisibility === "boolean"
    ? { value: n.editRemovalVisibility, src: "gb" }
    : { value: !1, src: "default" };
}
//@ chunk-e6aww6q8.js:4644574-4644587 placement
var TTs = 3000;
//@ chunk-e6aww6q8.js:4644587-4644621 placement
function T1r() {
  return editRemovalCapSetting().value;
}
//@ chunk-e6aww6q8.js:4644621-4644843 placement
function editRemovalCapSetting() {
  let CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP = antEnv.CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP;
  if (CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_EDIT_REMOVAL_CAP, src: "env" };
  let r = getAutoModeConfigOrDefault()?.editRemovalCap;
  return typeof r === "number" && Number.isFinite(r)
    ? { value: r, src: "gb" }
    : { value: TTs, src: "default" };
}

export { T1r, Yfn };
