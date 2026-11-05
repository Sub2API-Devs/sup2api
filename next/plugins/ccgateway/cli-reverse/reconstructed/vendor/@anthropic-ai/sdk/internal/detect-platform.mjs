/**
 * @anthropic-ai/sdk/internal/detect-platform.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-gjbr82c9.js (5)
 * attribution: esm-layout 1, esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { VERSION } from "../version.mjs";

//@ chunk-gjbr82c9.js:791-871 esm-layout
var isRunningInBrowser = () =>
  typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
//@ chunk-gjbr82c9.js:871-1110 esm-fingerprint
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime !== "undefined") return "edge";
  if (
    Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) ===
    "[object process]"
  )
    return "node";
  return "unknown";
}
//@ chunk-gjbr82c9.js:1110-2383 esm-fingerprint
var getPlatformProperties = () => {
  let detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version":
        typeof Deno.version === "string" ? Deno.version : (Deno.version?.deno ?? "unknown"),
    };
  if (typeof EdgeRuntime !== "undefined")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process?.version ?? "unknown",
    };
  if (detectedPlatform === "node")
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown",
    };
  let browserInfo = getBrowserInfo();
  if (browserInfo)
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version,
    };
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown",
  };
};
//@ chunk-gjbr82c9.js:2383-3016 esm-fingerprint
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) return null;
  let browserPatterns = [
    {
      key: "edge",
      pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/,
    },
    {
      key: "ie",
      pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/,
    },
    {
      key: "ie",
      pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/,
    },
    {
      key: "chrome",
      pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/,
    },
    {
      key: "firefox",
      pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/,
    },
    {
      key: "safari",
      pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/,
    },
  ];
  for (let { key, pattern } of browserPatterns) {
    let match = pattern.exec(navigator.userAgent);
    if (match) {
      let major = match[1] || 0;
      let minor = match[2] || 0;
      let patch = match[3] || 0;
      return {
        browser: key,
        version: `${major}.${minor}.${patch}`,
      };
    }
  }
  return null;
}
//@ chunk-gjbr82c9.js:3016-3513 esm-fingerprint
var normalizeArch = (arch) => {
  if (arch === "x32") return "x32";
  if (arch === "x86_64" || arch === "x64") return "x64";
  if (arch === "arm") return "arm";
  if (arch === "aarch64" || arch === "arm64") return "arm64";
  if (arch) return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios")) return "iOS";
  if (platform === "android") return "Android";
  if (platform === "darwin") return "MacOS";
  if (platform === "win32") return "Windows";
  if (platform === "freebsd") return "FreeBSD";
  if (platform === "openbsd") return "OpenBSD";
  if (platform === "linux") return "Linux";
  if (platform) return `Other:${platform}`;
  return "Unknown";
};
var platformCache;
var getPlatform = () => platformCache ?? (platformCache = getPlatformProperties());
export { getPlatform, isRunningInBrowser };
