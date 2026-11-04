/**
 * utils/envExpansion.ts
 *
 * 2.1.316 新增：MCP 配置中的环境变量展开
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { childScrubbedCredentialKeys, isChildScrubbedCredentialFamily } from "./subprocessEnv.js";
import {
  CREDENTIAL_ENV_VARS_2,
  SECRET_ENV_VARS,
  isCredentialEnvVar,
  isBaseUrlWithCredential,
  shouldScrubEnvEntry,
  PROTECTED_ENV_VARS,
  EXTRA_CREDENTIAL_ENV_VARS,
  containsWildcard,
} from "./credentialEnvVars.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:595799-595922 placement
/**
 * 展开时屏蔽的凭证变量集合。
 */
function scrubbedEnvKeys() {
  let plainKeys = new Set([
    ...childScrubbedCredentialKeys().map((key) => key.toUpperCase()),
    ...CREDENTIAL_ENV_VARS_2,
  ]);
  return {
    plain: plainKeys,
    remoteSink: new Set([...plainKeys, ...SECRET_ENV_VARS]),
  };
}
//@ chunk-e6aww6q8.js:595922-596026 placement
function isBlockedForExpansion(varName, liveValue, scrubKeys) {
  let upper = varName.toUpperCase();
  return (
    (scrubKeys ?? scrubbedEnvKeys()).remoteSink.has(upper) ||
    isCredentialEnvVar(upper) ||
    isBaseUrlWithCredential(upper, liveValue) ||
    shouldScrubEnvEntry(varName, liveValue)
  );
}
//@ chunk-e6aww6q8.js:596026-596074 placement
/**
 * 按环境变量名（忽略大小写）判断该变量是否禁止做 ${VAR} 形式的展开。
 */
function isBlockedForExpansion_2(varName) {
  return PROTECTED_ENV_VARS.has(varName.toUpperCase());
}
//@ chunk-e6aww6q8.js:596433-597526 placement
/**
 * 展开 MCP 配置中的环境变量；引用凭据变量但读不到时按空值处理并警告。
 */
function expandMcpCredentialEnvVars(
  text,
  env,
  fallbackEnv,
  { remoteSink = false, blankAsLive = false, blankList } = {},
) {
  if (typeof text === "string" && !text.includes("${"))
    return {
      expanded: text,
      missingVars: [],
      wildcardVars: [],
      blankedVars: [],
    };
  let missingVars = [];
  let wildcardVars = [];
  let blankedVars = [];
  let liveEnv = env ?? process.env;
  let useScrubList = env === undefined || blankAsLive;
  let scrubKeys = useScrubList ? (blankList ?? scrubbedEnvKeys()) : undefined;
  let blockedNames =
    scrubKeys === undefined ? EXTRA_CREDENTIAL_ENV_VARS : remoteSink ? scrubKeys.remoteSink : scrubKeys.plain;
  let expanded = text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?)\}/g, (matchText, varExpr) => {
    let index = varExpr.indexOf(":-");
    let varName = index === -1 ? varExpr : varExpr.slice(0, index);
    let defaultText = index === -1 ? undefined : varExpr.slice(index + 2);
    let liveValue = liveEnv[varName];
    let upper = varName.toUpperCase();
    let shouldBlank =
      (blockedNames.has(upper) ||
        (useScrubList && shouldScrubEnvEntry(varName, liveValue)) ||
        (remoteSink && (isCredentialEnvVar(upper) || isBaseUrlWithCredential(upper, liveValue)))) &&
      (liveValue !== undefined || remoteSink);
    if (shouldBlank && liveValue !== undefined) blankedVars.push(varName);
    let value = shouldBlank ? "" : liveValue;
    if (typeof value === "string") {
      if (containsWildcard(value)) wildcardVars.push(varName);
      return value;
    }
    if (defaultText !== undefined) return defaultText;
    let fallbackValue = fallbackEnv?.[varName];
    if (typeof fallbackValue === "string") {
      if (
        blockedNames.has(upper) ||
        (useScrubList &&
          (isChildScrubbedCredentialFamily(upper) || shouldScrubEnvEntry(varName, fallbackValue))) ||
        (remoteSink && (isCredentialEnvVar(upper) || isBaseUrlWithCredential(upper, fallbackValue)))
      ) {
        blankedVars.push(varName);
        return "";
      }
      if (containsWildcard(fallbackValue)) wildcardVars.push(varName);
      return fallbackValue;
    }
    missingVars.push(varName);
    return matchText;
  });
  if (remoteSink && !env && blankedVars.length > 0)
    logForDebugging(
      `MCP server config references credential variable(s) that are never expanded toward a remote server: ${blankedVars.join(", ")} (read as empty)`,
      {
        level: "warn",
      },
    );
  return {
    expanded,
    missingVars,
    wildcardVars,
    blankedVars,
  };
}
export { scrubbedEnvKeys, expandMcpCredentialEnvVars, isBlockedForExpansion_2, isBlockedForExpansion };
