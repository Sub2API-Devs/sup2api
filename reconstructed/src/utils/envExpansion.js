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
  let e = new Set([...childScrubbedCredentialKeys().map((n) => n.toUpperCase()), ...CREDENTIAL_ENV_VARS_2]);
  return {
    plain: e,
    remoteSink: new Set([...e, ...SECRET_ENV_VARS]),
  };
}
//@ chunk-e6aww6q8.js:595922-596026 placement
function isBlockedForExpansion(varName, n, r) {
  let upper = varName.toUpperCase();
  return (
    (r ?? scrubbedEnvKeys()).remoteSink.has(upper) ||
    isCredentialEnvVar(upper) ||
    isBaseUrlWithCredential(upper, n) ||
    shouldScrubEnvEntry(varName, n)
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
  e,
  n,
  r,
  { remoteSink: s = false, blankAsLive: h = false, blankList: y } = {},
) {
  if (typeof e === "string" && !e.includes("${"))
    return {
      expanded: e,
      missingVars: [],
      wildcardVars: [],
      blankedVars: [],
    };
  let S = [];
  let w = [];
  let L = [];
  let G = n ?? process.env;
  let q = n === undefined || h;
  let Z = q ? (y ?? scrubbedEnvKeys()) : undefined;
  let Se = Z === undefined ? EXTRA_CREDENTIAL_ENV_VARS : s ? Z.remoteSink : Z.plain;
  let expanded = e.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?)\}/g, (we, Ee) => {
    let index = Ee.indexOf(":-");
    let Ie = index === -1 ? Ee : Ee.slice(0, index);
    let Me = index === -1 ? undefined : Ee.slice(index + 2);
    let We = G[Ie];
    let upper = Ie.toUpperCase();
    let Je =
      (Se.has(upper) ||
        (q && shouldScrubEnvEntry(Ie, We)) ||
        (s && (isCredentialEnvVar(upper) || isBaseUrlWithCredential(upper, We)))) &&
      (We !== undefined || s);
    if (Je && We !== undefined) L.push(Ie);
    let nt = Je ? "" : We;
    if (typeof nt === "string") {
      if (containsWildcard(nt)) w.push(Ie);
      return nt;
    }
    if (Me !== undefined) return Me;
    let pt = r?.[Ie];
    if (typeof pt === "string") {
      if (
        Se.has(upper) ||
        (q && (isChildScrubbedCredentialFamily(upper) || shouldScrubEnvEntry(Ie, pt))) ||
        (s && (isCredentialEnvVar(upper) || isBaseUrlWithCredential(upper, pt)))
      ) {
        L.push(Ie);
        return "";
      }
      if (containsWildcard(pt)) w.push(Ie);
      return pt;
    }
    S.push(Ie);
    return we;
  });
  if (s && !n && L.length > 0)
    logForDebugging(
      `MCP server config references credential variable(s) that are never expanded toward a remote server: ${L.join(", ")} (read as empty)`,
      {
        level: "warn",
      },
    );
  return {
    expanded,
    missingVars: S,
    wildcardVars: w,
    blankedVars: L,
  };
}
export { scrubbedEnvKeys, expandMcpCredentialEnvVars, isBlockedForExpansion_2, isBlockedForExpansion };
