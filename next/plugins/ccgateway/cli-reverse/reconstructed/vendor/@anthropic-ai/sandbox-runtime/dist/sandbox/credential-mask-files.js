/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-mask-files.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (4)
 * attribution: esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { normalizePathForSandbox } from "./sandbox-utils.js";
import { JWT_DEFAULT_EXTRACT_PATTERN, verifyJwt, maskJwtClaims, mintFakeJwt } from "./credential-decode.js";

//@ chunk-qg41pqt6.js:709112-710022 esm-fingerprint
function extractAndSubstitute(content, pattern, sentinelFor, options = {}) {
  let re = new RegExp(pattern, "gd");
  let indexByCapture = new Map();
  let sentinelByCapture = new Map();
  let spans = [];
  for (let m of content.matchAll(re)) {
    let cap = m[1];
    if (cap === undefined)
      throw Error(
        `extract pattern /${pattern}/ matched at offset ${m.index} but ` +
          "capture group 1 is undefined \u2014 group 1 must capture the " +
          "credential value on every match.",
      );
    if (cap.length === 0) continue;
    let i = indexByCapture.get(cap);
    if (i === undefined) indexByCapture.set(cap, (i = indexByCapture.size));
    let [start, end] = m.indices[1];
    let sentinel = sentinelFor(cap, i);
    if (!sentinelByCapture.has(cap)) sentinelByCapture.set(cap, sentinel);
    spans.push({
      start,
      end,
      sentinel,
    });
  }
  if (indexByCapture.size === 0) return null;
  if (options.maskDuplicates) {
    let byLength = [...indexByCapture.keys()].sort((a, b) => b.length - a.length);
    for (let cap of byLength) {
      let sentinel = sentinelByCapture.get(cap);
      if (sentinel === cap) continue;
      for (let start = content.indexOf(cap); start !== -1; start = content.indexOf(cap, start + 1)) {
        let end = start + cap.length;
        if (spans.some((s) => start < s.end && s.start < end)) continue;
        spans.push({
          start,
          end,
          sentinel,
        });
      }
    }
    spans.sort((a, b) => a.start - b.start);
  }
  let out = "";
  let pos = 0;
  for (let s of spans) {
    out += content.slice(pos, s.start) + s.sentinel;
    pos = s.end;
  }
  return {
    fakeContent: out + content.slice(pos),
    captures: [...indexByCapture.keys()],
  };
}
//@ chunk-qg41pqt6.js:710923-710938 esm-fingerprint
var FILE_URL_PREFIX = "file:";
//@ chunk-qg41pqt6.js:710938-711440 esm-fingerprint
class MaskedFileStore {
  constructor() {
    this.byKey = new Map();
  }
  write(key, sentinel) {
    if (this.dir === undefined) this.dir = fsModule_2.mkdtempSync(join(tmpdir(), "srt-credmask-"));
    let fakePath = this.byKey.get(key);
    if (fakePath === undefined) {
      fakePath = join(this.dir, `${this.byKey.size}.fake`);
      this.byKey.set(key, fakePath);
    }
    fsModule_2.rmSync(fakePath, {
      force: true,
    });
    fsModule_2.writeFileSync(fakePath, sentinel, {
      mode: 384,
    });
    return fakePath;
  }
  dispose() {
    if (this.dir !== undefined)
      try {
        fsModule_2.rmSync(this.dir, {
          recursive: true,
          force: true,
        });
      } catch (err) {
        logForDebugging_2(`MaskedFileStore cleanup failed: ${err}`, {
          level: "error",
        });
      }
    this.dir = undefined;
    this.byKey.clear();
  }
  get dirPath() {
    return this.dir;
  }
}
//@ chunk-qg41pqt6.js:711440-714015 esm-fingerprint
function buildMaskedFileBinds(files, allowedDomains, registry, store) {
  let binds = [];
  let degradeToDenyPaths = [];
  for (let f of files) {
    if (f.mode !== "mask") continue;
    let realPath = normalizePathForSandbox(f.path, {
      literal: true,
    });
    let content;
    try {
      if (fsModule_2.statSync(realPath).isDirectory()) {
        logForDebugging_2(
          `[credential-mask] Skipping masked file entry that resolves to a directory: ${f.path} \u2014 use mode "deny" for directories.`,
          {
            level: "warn",
          },
        );
        continue;
      }
      let raw = fsModule_2.readFileSync(realPath);
      content = raw.toString("utf8");
      if (Buffer.byteLength(content, "utf8") !== raw.length) {
        logForDebugging_2(
          `[credential-mask] Skipping masked file with non-UTF-8 content (binary credential files are not supported in mask mode): ${f.path}`,
          {
            level: "warn",
          },
        );
        continue;
      }
    } catch (err) {
      logForDebugging_2(
        `[credential-mask] Skipping masked file (unreadable on host): ${f.path} \u2014 ${err.message}`,
      );
      continue;
    }
    let injectHosts = f.injectHosts ?? allowedDomains;
    let key = FILE_URL_PREFIX + realPath;
    let fakeContent;
    if (f.extract === undefined && f.decode === undefined)
      fakeContent = registry.register(key, content, injectHosts);
    else {
      let pattern = f.extract ?? JWT_DEFAULT_EXTRACT_PATTERN;
      let maskedCount = 0;
      let extracted = extractAndSubstitute(
        content,
        pattern,
        (cap, i) => {
          if (f.decode === "jwt" && !verifyJwt(cap)) return cap;
          let name = `${key}#${i}`;
          if (f.decode === "jwt" && f.maskClaims?.length) {
            let masked = maskJwtClaims(cap, f.maskClaims, (claim, real) =>
              registry.register(`${key}#jwt${i}.${claim}`, real, injectHosts),
            );
            if (masked === null) {
              logForDebugging_2(
                `[credential-mask] ${f.path}: verified JWT candidate has none of maskClaims ${JSON.stringify(f.maskClaims)} as ` +
                  "string claims \u2014 left unmasked.",
              );
              return cap;
            }
            let skipped = f.maskClaims.filter((c) => !masked.claimSentinels.has(c));
            if (skipped.length > 0)
              logForDebugging_2(
                `[credential-mask] ${f.path}: maskClaims ${JSON.stringify(skipped)} absent or non-string in a ` +
                  "verified JWT \u2014 skipped.",
              );
            maskedCount++;
            return registry.registerWithSentinel(name, masked.fakeToken, cap, injectHosts);
          }
          maskedCount++;
          return f.decode === "jwt"
            ? registry.registerWithSentinel(name, mintFakeJwt(randomUUID()), cap, injectHosts)
            : registry.register(name, cap, injectHosts);
        },
        {
          maskDuplicates: f.maskDuplicates ?? false,
        },
      );
      if (extracted === null || maskedCount === 0) {
        let cause =
          f.decode === "jwt"
            ? f.maskClaims?.length
              ? `decode "jwt" with pattern "${pattern}" that matched no verified JWT with maskable claims (maskClaims: ${JSON.stringify(f.maskClaims)})`
              : `decode "jwt" with pattern "${pattern}" that matched no verified JWT`
            : `extract pattern "${pattern}" that matched nothing`;
        let onNoMatch = f.onExtractNoMatch ?? "warn";
        if (onNoMatch === "error")
          throw Error(
            `credentials.files entry "${f.path}": ${cause} (onExtractNoMatch: "error"). Fix the config, change to "warn"/"deny", or remove the entry.`,
          );
        if (onNoMatch === "deny") {
          logForDebugging_2(
            `[credential-mask] ${f.path} has ${cause} \u2014 degrading to ` + 'mode "deny".',
            {
              level: "warn",
            },
          );
          degradeToDenyPaths.push(realPath);
          continue;
        }
        let msg = `[sandbox-runtime] WARNING: credentials.files entry "${f.path}" has ${cause} in the file. The file is left UNPROTECTED (readable as-is inside the sandbox). Fix the config, set onExtractNoMatch to "deny" or "error", or remove the entry.`;
        console.warn(msg);
        logForDebugging_2(msg, {
          level: "warn",
        });
        continue;
      }
      fakeContent = extracted.fakeContent;
    }
    let fakePath = store.write(key, fakeContent);
    binds.push({
      realPath,
      fakePath,
    });
  }
  return {
    binds,
    degradeToDenyPaths,
  };
}
export { MaskedFileStore, buildMaskedFileBinds, extractAndSubstitute };
