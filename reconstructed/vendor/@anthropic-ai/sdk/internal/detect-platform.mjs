/**
 * @anthropic-ai/sdk/internal/detect-platform.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (5)
 * attribution: esm-layout 1, esm-fingerprint 4
 */
import { Cx } from "../version.mjs";

//@ chunk-3wydcdvj.js:791-871 esm-layout
var bbi = () => typeof window < "u" && typeof window.document < "u" && typeof navigator < "u";
//@ chunk-3wydcdvj.js:871-1110 esm-fingerprint
function te() {
  if (typeof Deno < "u" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime < "u") return "edge";
  if (
    Object.prototype.toString.call(typeof globalThis.process < "u" ? globalThis.process : 0) ===
    "[object process]"
  )
    return "node";
  return "unknown";
}
//@ chunk-3wydcdvj.js:1110-2383 esm-fingerprint
var ne = () => {
  let e = te();
  if (e === "deno")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": Cx,
      "X-Stainless-OS": b(Deno.build.os),
      "X-Stainless-Arch": x(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version":
        typeof Deno.version === "string" ? Deno.version : (Deno.version?.deno ?? "unknown"),
    };
  if (typeof EdgeRuntime < "u")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": Cx,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process?.version ?? "unknown",
    };
  if (e === "node")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": Cx,
      "X-Stainless-OS": b(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": x(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown",
    };
  let n = re();
  if (n)
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": Cx,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${n.browser}`,
      "X-Stainless-Runtime-Version": n.version,
    };
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": Cx,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown",
  };
};
//@ chunk-3wydcdvj.js:2383-3016 esm-fingerprint
function re() {
  if (typeof navigator > "u" || !navigator) return null;
  let e = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
  ];
  for (let { key: key, pattern: pattern } of e) {
    let match = pattern.exec(navigator.userAgent);
    if (match) {
      let o = match[1] || 0,
        u = match[2] || 0,
        f = match[3] || 0;
      return { browser: key, version: `${o}.${u}.${f}` };
    }
  }
  return null;
}
//@ chunk-3wydcdvj.js:3016-3513 esm-fingerprint
var x = (e) => {
    if (e === "x32") return "x32";
    if (e === "x86_64" || e === "x64") return "x64";
    if (e === "arm") return "arm";
    if (e === "aarch64" || e === "arm64") return "arm64";
    if (e) return `other:${e}`;
    return "unknown";
  },
  b = (e) => {
    if (((e = e.toLowerCase()), e.includes("ios"))) return "iOS";
    if (e === "android") return "Android";
    if (e === "darwin") return "MacOS";
    if (e === "win32") return "Windows";
    if (e === "freebsd") return "FreeBSD";
    if (e === "openbsd") return "OpenBSD";
    if (e === "linux") return "Linux";
    if (e) return `Other:${e}`;
    return "Unknown";
  },
  H,
  jur = () => H ?? (H = ne());

export { jur, bbi };
