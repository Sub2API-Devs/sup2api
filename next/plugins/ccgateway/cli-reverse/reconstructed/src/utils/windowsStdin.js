/**
 * utils/windowsStdin.ts
 *
 * Windows 标准输入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hbc24qse.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPlatform } from "./platform.js";
import { CLAUDE_CODE_EXPERIMENTAL_CODE_MODE } from "../constants/codeMode.js";
import { getPreSettingsEnvSnapshot } from "./managedEnvApply.js";

//@ chunk-hbc24qse.js:298-431 placement
/**
 * Windows 下切换一次原始模式以复位标准输入。
 */
function resetWindowsStdinMode() {
  if (getPlatform() !== "windows" || !process.stdin.isTTY) return;
  try {
    process.stdin.setRawMode(true);
    process.stdin.setRawMode(false);
  } catch {}
}
//@ chunk-hbc24qse.js:431-590 placement
/**
 * 空实现的 stdin 复位桩。
 */
function noopStdinReset(env) {
  {
    let isCodeModeVar = (key) => key.toUpperCase() === CLAUDE_CODE_EXPERIMENTAL_CODE_MODE;
    for (let key of Object.keys(env).filter(isCodeModeVar)) delete env[key];
    let preSettingsEnvSnapshot = getPreSettingsEnvSnapshot();
    for (let key of Object.keys(preSettingsEnvSnapshot).filter(isCodeModeVar))
      env[key] = preSettingsEnvSnapshot[key];
  }
}
export { noopStdinReset, resetWindowsStdinMode };
