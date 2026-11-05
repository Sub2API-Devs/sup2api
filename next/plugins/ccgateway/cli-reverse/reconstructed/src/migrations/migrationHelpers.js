/**
 * migrations/migrationHelpers.ts
 *
 * 2.1.316 新增：迁移公用辅助（读取设置、校验枚举值）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h61dq9nz.js (3)
 * attribution: placement 3
 */
import { PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } from "../types/permissions.js";
import { InvalidArgumentError } from "../../vendor/commander/esm.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-h61dq9nz.js:4928-5225 placement
/**
 * 列出 commander 中来源为命令行（getOptionValueSource==="cli"）的选项，含 --no-* 取反形式；remote-control/desktop 据此拒绝不兼容的根选项。
 */
function getCliSuppliedOptions(program) {
  let optionsByKey = new Map();
  for (let option of program.options) {
    let attributeName = option.attributeName();
    if (optionsByKey.has(attributeName) || program.getOptionValueSource(attributeName) !== "cli") continue;
    let optionValue = program.getOptionValue(attributeName);
    let matchedOption =
      program.options.find(
        (option) => option.attributeName() === attributeName && option.negate === (optionValue === false),
      ) ?? option;
    optionsByKey.set(attributeName, {
      flag: matchedOption.long ?? matchedOption.flags,
      key: attributeName,
      value: optionValue,
    });
  }
  return [...optionsByKey.values()];
}
//@ chunk-h61dq9nz.js:5314-5367 placement
/**
 * 迁移脚本可接受的目标权限模式列表（default/acceptEdits/plan/bypassPermissions 加 manual 别名）。
 */
var mapped; // deferred: uses EXTERNAL_PERMISSION_MODES (../types/permissions.js) of its import cycle while loading; runs once the cycle is complete
var VALID_PERMISSION_MODE_CHOICES;
deferInit("chunk-h61dq9nz.js:5314", () => {
  mapped = PERMISSION_MODES.map((mode) => (mode === "default" ? PERMISSION_MODE_MANUAL_ALIAS : mode));
  VALID_PERMISSION_MODE_CHOICES = [...PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS];
});
//@ chunk-h61dq9nz.js:5367-5465 placement
function parsePermissionModeOption(mode) {
  if (!VALID_PERMISSION_MODE_CHOICES.includes(mode))
    throw new InvalidArgumentError(`Allowed choices are ${mapped.join(", ")}.`);
  return mode;
}
export { mapped, parsePermissionModeOption, getCliSuppliedOptions };
