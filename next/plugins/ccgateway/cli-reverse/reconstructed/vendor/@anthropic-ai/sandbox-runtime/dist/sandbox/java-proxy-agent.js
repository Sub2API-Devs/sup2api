/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/java-proxy-agent.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { getSandboxRuntimeCandidates } from "./generate-seccomp-filter.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-qg41pqt6.js:724311-724351 esm-fingerprint
var JAVA_PROXY_AGENT_JAR_NAME = "srt-proxy-agent.jar";
var jarPathCache = new Map();
//@ chunk-qg41pqt6.js:724351-724468 esm-fingerprint
async function getJavaProxyAgentJarPathAsync(explicitPath) {
  let key = explicitPath ?? "";
  let cached = jarPathCache.get(key);
  if (cached !== undefined) return cached;
  let found = findLocalJar(explicitPath) ?? findGlobalJar(await getSandboxRuntimeCandidates());
  jarPathCache.set(key, found);
  return found;
}
//@ chunk-qg41pqt6.js:724468-724510 esm-fingerprint
var JAR_REL_PATH = join("vendor", "java-proxy-agent", JAVA_PROXY_AGENT_JAR_NAME);
//@ chunk-qg41pqt6.js:724510-724719 esm-fingerprint
function findLocalJar(explicitPath) {
  if (explicitPath) {
    if (existsSync(explicitPath)) return explicitPath;
    logForDebugging_2(`[java-proxy-agent] javaAgentJarPath not found: ${explicitPath}`, {
      level: "warn",
    });
  }
  let baseDir = dirname(fileURLToPath(import.meta.url));
  return [
    join(baseDir, JAR_REL_PATH),
    join(baseDir, "..", "..", JAR_REL_PATH),
    join(baseDir, "..", JAR_REL_PATH),
  ].find((p) => existsSync(p));
}
//@ chunk-qg41pqt6.js:724719-724940 esm-layout
function findGlobalJar(globalBases) {
  for (let base of globalBases) {
    let p = join(base, JAR_REL_PATH);
    if (existsSync(p)) return p;
  }
  logForDebugging_2(
    `[java-proxy-agent] ${JAVA_PROXY_AGENT_JAR_NAME} not found; JVMs in the sandbox will not be pointed at the proxy (run \`npm run build:java-agent\`)`,
    {
      level: "warn",
    },
  );
  return null;
}
//@ chunk-qg41pqt6.js:724940-725202 esm-fingerprint
function buildJavaToolOptions(opts) {
  let inherited = (opts.unsetEnvVars ?? []).includes("JAVA_TOOL_OPTIONS") ? "" : (opts.inherited ?? "");
  let parts = [];
  if (opts.agentJarPath) parts.push(javaAgentFlag(opts.agentJarPath));
  if (inherited) parts.push(inherited);
  for (let flag of opts.flags ?? []) if (!inherited.includes(flag) && !parts.includes(flag)) parts.push(flag);
  return parts.length > 0 ? parts.join(" ") : undefined;
}
//@ chunk-qg41pqt6.js:725202-725271 esm-fingerprint
function javaAgentFlag(jarPath) {
  let flag = `-javaagent:${jarPath}`;
  return /\s/.test(jarPath) ? `"${flag}"` : flag;
}
export { buildJavaToolOptions, getJavaProxyAgentJarPathAsync };
