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
  XBe,
  ZBe,
  PROTECTED_ENV_VARS,
  EXTRA_CREDENTIAL_ENV_VARS,
  containsWildcard,
} from "./credentialEnvVars.js";
import { logForDebugging } from "./debug.js";

/**
 * 展开时屏蔽的凭证变量集合。
 */
//@ chunk-e6aww6q8.js:595799-595922 placement
function scrubbedEnvKeys() {
  let e = new Set([...childScrubbedCredentialKeys().map((n) => n.toUpperCase()), ...CREDENTIAL_ENV_VARS_2]);
  return { plain: e, remoteSink: new Set([...e, ...SECRET_ENV_VARS]) };
}
//@ chunk-e6aww6q8.js:595922-596026 placement
function isBlockedForExpansion(e, n, r) {
  let upper = e.toUpperCase();
  return (
    (r ?? scrubbedEnvKeys()).remoteSink.has(upper) || isCredentialEnvVar(upper) || XBe(upper, n) || ZBe(e, n)
  );
}
//@ chunk-e6aww6q8.js:596026-596074 placement
function ADt(e) {
  return PROTECTED_ENV_VARS.has(e.toUpperCase());
}
/**
 * 展开 MCP 配置中的环境变量；引用凭据变量但读不到时按空值处理并警告。
 */
//@ chunk-e6aww6q8.js:596433-597526 placement
function expandMcpCredentialEnvVars(e, n, r, { remoteSink: s = !1, blankAsLive: h = !1, blankList: y } = {}) {
  if (typeof e === "string" && !e.includes("${"))
    return { expanded: e, missingVars: [], wildcardVars: [], blankedVars: [] };
  let S = [],
    w = [],
    L = [],
    G = n ?? process.env,
    q = n === void 0 || h,
    Z = q ? (y ?? scrubbedEnvKeys()) : void 0,
    Se = Z === void 0 ? EXTRA_CREDENTIAL_ENV_VARS : s ? Z.remoteSink : Z.plain,
    replaced = e.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?)\}/g, (we, Ee) => {
      let index = Ee.indexOf(":-"),
        Ie = index === -1 ? Ee : Ee.slice(0, index),
        Me = index === -1 ? void 0 : Ee.slice(index + 2),
        We = G[Ie],
        upper = Ie.toUpperCase(),
        Je =
          (Se.has(upper) || (q && ZBe(Ie, We)) || (s && (isCredentialEnvVar(upper) || XBe(upper, We)))) &&
          (We !== void 0 || s);
      if (Je && We !== void 0) L.push(Ie);
      let nt = Je ? "" : We;
      if (typeof nt === "string") {
        if (containsWildcard(nt)) w.push(Ie);
        return nt;
      }
      if (Me !== void 0) return Me;
      let pt = r?.[Ie];
      if (typeof pt === "string") {
        if (
          Se.has(upper) ||
          (q && (isChildScrubbedCredentialFamily(upper) || ZBe(Ie, pt))) ||
          (s && (isCredentialEnvVar(upper) || XBe(upper, pt)))
        )
          return (L.push(Ie), "");
        if (containsWildcard(pt)) w.push(Ie);
        return pt;
      }
      return (S.push(Ie), we);
    });
  if (s && !n && L.length > 0)
    logForDebugging(
      `MCP server config references credential variable(s) that are never expanded toward a remote server: ${L.join(", ")} (read as empty)`,
      { level: "warn" },
    );
  return { expanded: replaced, missingVars: S, wildcardVars: w, blankedVars: L };
}

export { scrubbedEnvKeys, expandMcpCredentialEnvVars, ADt, isBlockedForExpansion };
