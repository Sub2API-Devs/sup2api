/**
 * tools/PowerShellTool/commonParameters.ts
 *
 * PowerShell 通用参数（-Verbose/-ErrorAction/-OutVariable 等）及别名表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/commonParameters.ts
 * pieces: chunk-e0skvs33.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-e0skvs33.js:2056-2387 fingerprint (2.1.88 match: COMMON_VALUE_PARAMS, 0.647)
/**
 * PowerShell 通用参数表：开关 -Verbose/-Debug，带值参数 -ErrorAction/-WarningAction/…/-OutVariable/-PipelineVariable/-OutBuffer 及别名；O 为全集。被只读校验、路径校验等使用。
 */
var COMMON_SWITCHES = ["-verbose", "-debug"];
var COMMON_ACTION_PARAMS = ["-erroraction", "-warningaction", "-informationaction", "-progressaction"];
var COMMON_ACTION_PARAM_ALIASES = ["-ea", "-wa", "-infa", "-proga"];
var COMMON_VARIABLE_PARAMS = [
  "-errorvariable",
  "-warningvariable",
  "-informationvariable",
  "-outvariable",
  "-pipelinevariable",
];
var COMMON_VARIABLE_PARAM_ALIASES = ["-ev", "-wv", "-iv", "-ov", "-pv"];
var COMMON_VALUE_PARAMS = [
  ...COMMON_ACTION_PARAMS,
  ...COMMON_VARIABLE_PARAMS,
  "-outbuffer",
  ...COMMON_ACTION_PARAM_ALIASES,
];
var COMMON_PARAMETERS = new Set([...COMMON_SWITCHES, ...COMMON_VALUE_PARAMS]);
export {
  COMMON_SWITCHES,
  COMMON_VALUE_PARAMS,
  COMMON_ACTION_PARAM_ALIASES,
  COMMON_ACTION_PARAMS,
  COMMON_VARIABLE_PARAM_ALIASES,
  COMMON_VARIABLE_PARAMS,
  COMMON_PARAMETERS,
};
