/**
 * constants/agentProxyPrompt.ts
 *
 * 2.1.316 新增：云会话 GitHub 代理（内置 gh 客户端）相关的系统提示片段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, M, A, o } from "../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

/**
 * 云会话代理的 CLI、CA 路径与环境 schema。
 */
//@ chunk-e6aww6q8.js:92200-92411 placement
var PROXIED_CLIS = ["aws", "bq", "gcloud", "gh", "gsutil"],
  CCR_CA_BUNDLE_PATH = "~/.ccr/ca-bundle.crt",
  ProxyEnvironmentSchema = DoctorLazy(() =>
    u({
      hasReadme: M(),
      installedClis: A(o()).transform((e) => PROXIED_CLIS.filter((n) => e.includes(n))),
    }).transform((e) => ({ ...e, caBundlePath: CCR_CA_BUNDLE_PATH })),
  );
//@ chunk-e6aww6q8.js:92411-92458 placement
function h$o(e) {
  return join(e, "..", "README.md");
}
//@ chunk-e6aww6q8.js:92458-93064 placement
function buildAgentProxyCliSection({
  caBundlePath: caBundlePath,
  hasReadme: hasReadme,
  installedClis: installedClis,
}) {
  let s = hasReadme ? `see ${h$o(caBundlePath)} and ` : "",
    h =
      installedClis.length > 0
        ? ` Installed CLIs preconfigured for the proxy: ${installedClis.join(", ")} \u2014 ` +
          "prefer a skill/MCP tool, then these, over raw curl."
        : "";
  return (
    `Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: ${caBundlePath}). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), ${s}run curl -sS "$HTTPS_PROXY/__agentproxy/status" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY.` +
    h
  );
}
//@ chunk-e6aww6q8.js:93064-93127 placement
class q_t {
  note = void 0;
  ghStandin = void 0;
  setNote(e) {
    this.note = e;
  }
}
//@ chunk-e6aww6q8.js:93127-93154 placement
var Zso = new HostScoped(() => new q_t());
//@ chunk-e6aww6q8.js:93154-93192 placement
function e9() {
  return Zso.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:93192-93224 placement
function q1t(e) {
  e9().setNote(e);
}
//@ chunk-e6aww6q8.js:93224-93292 placement
function K_t() {
  let { note: note } = e9();
  return typeof note === "object" ? buildAgentProxyCliSection(note) : note;
}
//@ chunk-e6aww6q8.js:93292-93360 placement
function sVs() {
  let { note: note } = e9();
  return typeof note === "object" ? note : void 0;
}
//@ chunk-e6aww6q8.js:93360-93439 placement
var BUILTIN_API = "builtin-api",
  ENTERPRISE = "enterprise",
  ANY_HOST = "any-host",
  NO_JQ = "no-jq",
  RUNNER = "runner";
/**
 * 代理提示变体键。
 */
//@ chunk-e6aww6q8.js:93439-93560 placement
function proxyPromptVariant({ enterprise: enterprise, anyHost: anyHost, noJq: noJq, runner: runner }) {
  return [BUILTIN_API, enterprise && ENTERPRISE, anyHost && ANY_HOST, noJq && NO_JQ, runner && RUNNER]
    .filter(Boolean)
    .join("+");
}
/**
 * 生成云会话 GitHub 代理说明：gh 是内置客户端、已经通过会话代理认证，可配合 --hostname 访问 GHE。
 */
//@ chunk-e6aww6q8.js:93560-95249 placement
function buildAgentProxyGhPrompt(e) {
  let [n, ...r] = e.split("+");
  if (n !== BUILTIN_API) return;
  let included = r.includes(ENTERPRISE);
  return (
    "`gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com" +
    (included
      ? " and, with `--hostname <host>`, the GitHub Enterprise Server hosts this session's GitHub proxy serves"
      : "") +
    (r.includes(RUNNER)
      ? ", already authenticated through this session's GitHub proxy (run `gh api --help` for its flags)."
      : (r.includes(ANY_HOST)
          ? ", or against the GitHub Enterprise host of this checkout's remote (or `--hostname <host>`), through this session's GitHub proxy, which supplies the credential for the hosts and repositories this session is connected to"
          : (included ? ", through that proxy," : " through this session's GitHub proxy,") +
            " which supplies the credential for the repositories this session can reach") +
        " (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it.") +
    " Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form)." +
    (r.includes(NO_JQ)
      ? " `--jq` is unavailable because jq is not installed: run without it and pipe the output to a JSON tool that is installed."
      : "") +
    (r.includes(RUNNER)
      ? " Do not install a GitHub CLI to get other gh commands: one installed during the session is not routed through this proxy and has no GitHub credentials unless the runner's operator provides them."
      : "")
  );
}
//@ chunk-e6aww6q8.js:95249-95282 placement
function KUr(e) {
  e9().ghStandin = e;
}
//@ chunk-e6aww6q8.js:95282-95319 placement
function J_t() {
  return e9().ghStandin;
}

export {
  ProxyEnvironmentSchema,
  K_t,
  buildAgentProxyCliSection,
  buildAgentProxyGhPrompt,
  q1t,
  KUr,
  h$o,
  proxyPromptVariant,
  PROXIED_CLIS,
  J_t,
  sVs,
};
