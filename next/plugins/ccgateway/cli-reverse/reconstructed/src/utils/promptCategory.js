/**
 * utils/promptCategory.ts
 *
 * querySource 标签：代理（agent:builtin:x / agent:custom:x / agent:default）与 REPL 主线程（含输出风格后缀）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/promptCategory.ts
 * pieces: chunk-7z0xhm2s.js (2)
 * attribution: fingerprint 2
 */
import { getSettings_DEPRECATED } from "./settings/settings.js";
import { DEFAULT, OUTPUT_STYLE_CONFIG } from "../constants/outputStyles.js";

//@ chunk-7z0xhm2s.js:266-379 fingerprint (2.1.88 match: getQuerySourceForAgent, 0.85)
/**
 * 代理的 querySource：内置 agent:builtin:类型，自定义 agent:custom:类型，无类型时 agent:default / agent:custom。
 */
function getQuerySourceForAgent(agentType, isBuiltInAgent) {
  if (isBuiltInAgent) return agentType ? `agent:builtin:${agentType}` : "agent:default";
  return agentType ? `agent:custom:${agentType}` : "agent:custom";
}
//@ chunk-7z0xhm2s.js:379-558 fingerprint (2.1.88 match: getQuerySourceForREPL, 1)
/**
 * REPL 主线程 querySource：默认输出风格为 repl_main_thread，否则 repl_main_thread:outputStyle:名字（未知为 custom）。
 */
function getQuerySourceForREPL() {
  let style = getSettings_DEPRECATED()?.outputStyle ?? DEFAULT;
  if (style === DEFAULT) return "repl_main_thread";
  return Object.hasOwn(OUTPUT_STYLE_CONFIG, style)
    ? `repl_main_thread:outputStyle:${style}`
    : "repl_main_thread:outputStyle:custom";
}
export { getQuerySourceForAgent, getQuerySourceForREPL };
