/**
 * constants/agentProxyPrompt.ts
 *
 * 2.1.316 新增：云会话 GitHub 代理（内置 gh 客户端）相关的系统提示片段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, booleanSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:95005-95216 placement
/**
 * 云会话代理的 CLI、CA 路径与环境 schema。
 */
var PROXIED_CLIS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CCR_CA_BUNDLE_PATH;
var ProxyEnvironmentSchema;
deferInit("chunk-5xgkngpb.js:95005", () => {
  PROXIED_CLIS = ["aws", "bq", "gcloud", "gh", "gsutil"];
  CCR_CA_BUNDLE_PATH = "~/.ccr/ca-bundle.crt";
  ProxyEnvironmentSchema = DoctorLazy(() =>
    objectSchema({
      hasReadme: booleanSchema(),
      installedClis: array(stringSchema()).transform((installedCliList) =>
        PROXIED_CLIS.filter((cliName) => installedCliList.includes(cliName)),
      ),
    }).transform((config) => ({
      ...config,
      caBundlePath: CCR_CA_BUNDLE_PATH,
    })),
  );
});
//@ chunk-5xgkngpb.js:95216-95263 placement
/**
 * 函数 agentProxyReadmePath（代理代理目录的 README 路径）。
 */
function agentProxyReadmePath(caBundlePath) {
  return join(caBundlePath, "..", "README.md");
}
//@ chunk-5xgkngpb.js:95263-95869 placement
function buildAgentProxyCliSection({ caBundlePath, hasReadme, installedClis }) {
  let readmePrefix = hasReadme ? `see ${agentProxyReadmePath(caBundlePath)} and ` : "";
  let installedClisSuffix =
    installedClis.length > 0
      ? ` Installed CLIs preconfigured for the proxy: ${installedClis.join(", ")} \u2014 ` +
        "prefer a skill/MCP tool, then these, over raw curl."
      : "";
  return (
    `Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: ${caBundlePath}). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), ${readmePrefix}run curl -sS "$HTTPS_PROXY/__agentproxy/status" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY.` +
    installedClisSuffix
  );
}
//@ chunk-5xgkngpb.js:95869-95932 placement
class AgentProxyNote {
  note = undefined;
  ghStandin = undefined;
  setNote(note) {
    this.note = note;
  }
}
//@ chunk-5xgkngpb.js:95932-95959 placement
var agentProxyNoteSlot; // deferred: uses AgentProxyNote of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:95932", () => {
  agentProxyNoteSlot = new HostScoped(() => new AgentProxyNote());
});
//@ chunk-5xgkngpb.js:95959-95997 placement
function agentProxyNote() {
  return agentProxyNoteSlot.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:95997-96029 placement
/**
 * 函数 setAgentProxyNote（写入代理说明）。
 */
function setAgentProxyNote(note) {
  agentProxyNote().setNote(note);
}
//@ chunk-5xgkngpb.js:96029-96097 placement
function getAgentProxyNoteText() {
  let { note } = agentProxyNote();
  return typeof note === "object" ? buildAgentProxyCliSection(note) : note;
}
//@ chunk-5xgkngpb.js:96097-96165 placement
/**
 * 函数 getAgentProxyNoteObject（对象形式的代理说明）。
 */
function getAgentProxyNoteObject() {
  let { note } = agentProxyNote();
  return typeof note === "object" ? note : undefined;
}
//@ chunk-5xgkngpb.js:96165-96244 placement
var BUILTIN_API = "builtin-api";
var ENTERPRISE = "enterprise";
var ANY_HOST = "any-host";
var NO_JQ = "no-jq";
var RUNNER = "runner";
//@ chunk-5xgkngpb.js:96244-96365 placement
/**
 * 代理提示变体键。
 */
function proxyPromptVariant({ enterprise, anyHost, noJq, runner }) {
  return [BUILTIN_API, enterprise && ENTERPRISE, anyHost && ANY_HOST, noJq && NO_JQ, runner && RUNNER]
    .filter(Boolean)
    .join("+");
}
//@ chunk-5xgkngpb.js:96365-98054 placement
/**
 * 生成云会话 GitHub 代理说明：gh 是内置客户端、已经通过会话代理认证，可配合 --hostname 访问 GHE。
 */
function buildAgentProxyGhPrompt(githubCli) {
  let [builtinFlavor, ...capabilityFlags] = githubCli.split("+");
  if (builtinFlavor !== BUILTIN_API) return;
  let included = capabilityFlags.includes(ENTERPRISE);
  return (
    "`gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com" +
    (included
      ? " and, with `--hostname <host>`, the GitHub Enterprise Server hosts this session's GitHub proxy serves"
      : "") +
    (capabilityFlags.includes(RUNNER)
      ? ", already authenticated through this session's GitHub proxy (run `gh api --help` for its flags)."
      : (capabilityFlags.includes(ANY_HOST)
          ? ", or against the GitHub Enterprise host of this checkout's remote (or `--hostname <host>`), through this session's GitHub proxy, which supplies the credential for the hosts and repositories this session is connected to"
          : (included ? ", through that proxy," : " through this session's GitHub proxy,") +
            " which supplies the credential for the repositories this session can reach") +
        " (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it.") +
    " Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form)." +
    (capabilityFlags.includes(NO_JQ)
      ? " `--jq` is unavailable because jq is not installed: run without it and pipe the output to a JSON tool that is installed."
      : "") +
    (capabilityFlags.includes(RUNNER)
      ? " Do not install a GitHub CLI to get other gh commands: one installed during the session is not routed through this proxy and has no GitHub credentials unless the runner's operator provides them."
      : "")
  );
}
//@ chunk-5xgkngpb.js:98054-98087 placement
/**
 * 函数 setAgentProxyGhStandin（写入 gh stand-in）。
 */
function setAgentProxyGhStandin(ghStandin) {
  agentProxyNote().ghStandin = ghStandin;
}
//@ chunk-5xgkngpb.js:98087-98124 placement
function getAgentProxyGhStandin() {
  return agentProxyNote().ghStandin;
}
export {
  ProxyEnvironmentSchema,
  getAgentProxyNoteText,
  buildAgentProxyCliSection,
  buildAgentProxyGhPrompt,
  getAgentProxyGhStandin,
  setAgentProxyNote,
  setAgentProxyGhStandin,
  agentProxyReadmePath,
  proxyPromptVariant,
  PROXIED_CLIS,
  getAgentProxyNoteObject,
};
