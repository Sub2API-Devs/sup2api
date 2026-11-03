/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/java-proxy-agent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
} from "path";
import { existsSync } from "fs";
import {
  fileURLToPath,
  fileURLToPath as fileURLToPath_2,
  fileURLToPath as fileURLToPath_3,
  fileURLToPath as fileURLToPath_4,
} from "url";
import { getSandboxRuntimeCandidates } from "./generate-seccomp-filter.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:722629-722669 esm-fingerprint
var SRT_PROXY_AGENT_JAR = "srt-proxy-agent.jar",
  VR = new Map();
//@ chunk-fq0cr76a.js:722669-722786 esm-fingerprint
async function HR(e) {
  let n = e ?? "",
    r = VR.get(n);
  if (r !== void 0) return r;
  let s = o8(e) ?? a8(await getSandboxRuntimeCandidates());
  return (VR.set(n, s), s);
}
//@ chunk-fq0cr76a.js:722786-722828 esm-fingerprint
var jm = join_6("vendor", "java-proxy-agent", SRT_PROXY_AGENT_JAR);
//@ chunk-fq0cr76a.js:722828-723037 esm-fingerprint
function o8(e) {
  if (e) {
    if (existsSync(e)) return e;
    At(`[java-proxy-agent] javaAgentJarPath not found: ${e}`, { level: "warn" });
  }
  let n = dirname_4(fileURLToPath(import.meta.url));
  return [join_6(n, jm), join_6(n, "..", "..", jm), join_6(n, "..", jm)].find((s) => existsSync(s));
}
//@ chunk-fq0cr76a.js:723037-723258 esm-layout
function a8(e) {
  for (let n of e) {
    let r = join_6(n, jm);
    if (existsSync(r)) return r;
  }
  return (
    At(
      `[java-proxy-agent] ${SRT_PROXY_AGENT_JAR} not found; JVMs in the sandbox will not be pointed at the proxy (run \`npm run build:java-agent\`)`,
      { level: "warn" },
    ),
    null
  );
}
//@ chunk-fq0cr76a.js:723258-723520 esm-fingerprint
function Ym(e) {
  let r = (e.unsetEnvVars ?? []).includes("JAVA_TOOL_OPTIONS") ? "" : (e.inherited ?? ""),
    s = [];
  if (e.agentJarPath) s.push(l8(e.agentJarPath));
  if (r) s.push(r);
  for (let h of e.flags ?? []) if (!r.includes(h) && !s.includes(h)) s.push(h);
  return s.length > 0 ? s.join(" ") : void 0;
}
//@ chunk-fq0cr76a.js:723520-723589 esm-fingerprint
function l8(e) {
  let n = `-javaagent:${e}`;
  return /\s/.test(e) ? `"${n}"` : n;
}

export { HR, Ym };
