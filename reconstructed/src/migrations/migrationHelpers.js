/**
 * migrations/migrationHelpers.ts
 *
 * 2.1.316 新增：迁移公用辅助（读取设置、校验枚举值）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (3)
 * attribution: placement 3
 */
import { PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS } from "../types/permissions.js";
import { InvalidArgumentError } from "../../vendor/commander/esm.mjs";

/**
 * 列出 commander 中来源为命令行（getOptionValueSource==="cli"）的选项，含 --no-* 取反形式；remote-control/desktop 据此拒绝不兼容的根选项。
 */
//@ chunk-cjydagjy.js:4751-5048 placement
function getCliSuppliedOptions(e) {
  let r = new Map();
  for (let option of e.options) {
    let attributeName = option.attributeName();
    if (r.has(attributeName) || e.getOptionValueSource(attributeName) !== "cli") continue;
    let optionValue = e.getOptionValue(attributeName),
      y =
        e.options.find(
          (option) => option.attributeName() === attributeName && option.negate === (optionValue === !1),
        ) ?? option;
    r.set(attributeName, { flag: y.long ?? y.flags, key: attributeName, value: optionValue });
  }
  return [...r.values()];
}
//@ chunk-cjydagjy.js:5137-5190 placement
var mapped = PERMISSION_MODES.map((e) => (e === "default" ? PERMISSION_MODE_MANUAL_ALIAS : e)),
  To = [...PERMISSION_MODES, PERMISSION_MODE_MANUAL_ALIAS];
//@ chunk-cjydagjy.js:5190-5288 placement
function parsePermissionModeOption(e) {
  if (!To.includes(e)) throw new InvalidArgumentError(`Allowed choices are ${mapped.join(", ")}.`);
  return e;
}

export { getCliSuppliedOptions, mapped, parsePermissionModeOption };
