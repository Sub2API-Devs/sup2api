/**
 * @anthropic-ai/sdk/core/credentials.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (7)
 * attribution: esm-fingerprint 4, esm-layout 2, affinity 1
 */
import { readFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { cS } from "../internal/utils/env.mjs";
import { jur } from "../internal/detect-platform.mjs";
import { getWIFPrecedenceSource } from "../../../../src/utils/wifProfile.js";
import { isDiskless } from "../../../../src/bootstrap/state.js";
import { logForDebugging } from "../../../../src/utils/debug.js";
import { errorMessage } from "../../../../src/utils/errors.js";
import { federationCacheDir } from "../../../../src/utils/subprocessEnv.js";
import { computeContentHash } from "../../../../src/utils/commitAttribution.js";

//@ chunk-3wydcdvj.js:4720-4767 esm-fingerprint
var Sbi = "1.0",
  gAn = "1.0",
  ie = /^[A-Za-z0-9_.-]+$/;
//@ chunk-3wydcdvj.js:4767-5123 esm-fingerprint
function L(e) {
  if (!e) throw Error("profile name is empty");
  if (e === "." || e === "..") throw Error(`profile name "${e}" is not allowed`);
  if (e.includes("/") || e.includes("\\"))
    throw Error(`profile name "${e}" must not contain path separators`);
  if (!ie.test(e))
    throw Error(
      `profile name "${e}" contains disallowed characters (allowed: letters, digits, '_', '.', '-')`,
    );
}
//@ chunk-3wydcdvj.js:5123-6947 esm-layout
var U = async (e) => (await O(e))?.config ?? null,
  O = async (e) => {
    var n, r;
    let s = await C();
    if (s === null) return null;
    let o = e ?? (await K());
    if (o === null) return null;
    L(o);
    let { fs: fs, path: path } = await import("./chunk-a60jm9e8.js"),
      joined = path.join(s, "configs", `${o}.json`),
      _;
    try {
      _ = await fs.promises.readFile(joined, "utf-8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw Error(`failed to read config file ${joined}: ${error}`);
      _ = null;
    }
    if (_ === null) {
      let E = cS("ANTHROPIC_ORGANIZATION_ID"),
        k = cS("ANTHROPIC_IDENTITY_TOKEN_FILE"),
        T = cS("ANTHROPIC_FEDERATION_RULE_ID");
      if (T && E)
        return {
          fromFile: !1,
          config: {
            organization_id: E,
            workspace_id: cS("ANTHROPIC_WORKSPACE_ID"),
            base_url: cS("ANTHROPIC_BASE_URL"),
            authentication: {
              type: "oidc_federation",
              federation_rule_id: T,
              service_account_id: cS("ANTHROPIC_SERVICE_ACCOUNT_ID"),
              identity_token: k ? { source: "file", path: k } : void 0,
              scope: cS("ANTHROPIC_SCOPE"),
            },
          },
        };
      return null;
    }
    let p;
    try {
      p = JSON.parse(_);
    } catch (error) {
      throw Error(`failed to parse config file ${joined}: ${error}`);
    }
    if (!p.authentication) throw Error(`config file ${joined} is missing "authentication"`);
    let w = p.authentication.type;
    if (w !== "oidc_federation" && w !== "user_oauth")
      throw Error(`authentication.type "${w}" is not a known authentication type`);
    if (
      (p.organization_id ?? (p.organization_id = cS("ANTHROPIC_ORGANIZATION_ID")),
      p.workspace_id ?? (p.workspace_id = cS("ANTHROPIC_WORKSPACE_ID")),
      p.base_url ?? (p.base_url = cS("ANTHROPIC_BASE_URL")),
      (n = p.authentication).scope ?? (n.scope = cS("ANTHROPIC_SCOPE")),
      p.authentication.type === "oidc_federation")
    ) {
      if (!p.authentication.identity_token) {
        let E = cS("ANTHROPIC_IDENTITY_TOKEN_FILE");
        if (E) p.authentication.identity_token = { source: "file", path: E };
      }
      if (!p.authentication.federation_rule_id)
        p.authentication.federation_rule_id = cS("ANTHROPIC_FEDERATION_RULE_ID") ?? "";
      (r = p.authentication).service_account_id ??
        (r.service_account_id = cS("ANTHROPIC_SERVICE_ACCOUNT_ID"));
    }
    return { config: p, fromFile: !0 };
  };
//@ chunk-3wydcdvj.js:6947-8059 esm-fingerprint
var S = async (e, n) => {
    if (e?.authentication.credentials_path) return e.authentication.credentials_path;
    let r = await C();
    if (!r) return null;
    let s = n ?? (await K());
    if (!s) return null;
    L(s);
    let { path: path } = await import("./chunk-a60jm9e8.js");
    return path.join(r, "credentials", `${s}.json`);
  },
  C = async () => {
    if (!oe()) return null;
    let { path: path } = await import("./chunk-a60jm9e8.js"),
      n = cS("ANTHROPIC_CONFIG_DIR");
    if (n) return n;
    if (jur()["X-Stainless-OS"] === "Windows") {
      let u = cS("APPDATA");
      if (u) return path.join(u, "Anthropic");
      let f = cS("USERPROFILE");
      if (f) return path.join(f, "AppData", "Roaming", "Anthropic");
      return null;
    }
    let s = cS("XDG_CONFIG_HOME");
    if (s) return path.join(s, "anthropic");
    let o = cS("HOME");
    if (o) return path.join(o, ".config", "anthropic");
    return null;
  },
  oe = () => {
    let e = jur()["X-Stainless-Runtime"];
    return e === "node" || e === "deno";
  },
  K = async () => {
    let e = await C();
    if (!e) return null;
    let n = cS("ANTHROPIC_PROFILE");
    if (n) return n;
    let { fs: fs, path: path } = await import("./chunk-a60jm9e8.js"),
      joined = path.join(e, "active_config");
    try {
      return (await fs.promises.readFile(joined, "utf-8")).trim() || "default";
    } catch (error) {
      if (error?.code !== "ENOENT") throw Error(`failed to read ${joined}: ${error}`);
      return "default";
    }
  };
//@ chunk-3wydcdvj.js:21071-21113 affinity
var I = (e) => process.env[e]?.trim() || void 0;
//@ chunk-3wydcdvj.js:21113-21619 esm-fingerprint
async function Te() {
  if (getWIFPrecedenceSource() === "env-quad") {
    let e = I("ANTHROPIC_FEDERATION_RULE_ID"),
      n = I("ANTHROPIC_ORGANIZATION_ID");
    if (e && n) {
      let r = I("ANTHROPIC_IDENTITY_TOKEN_FILE");
      if (r && isDiskless()) return null;
      return {
        organization_id: n,
        workspace_id: I("ANTHROPIC_WORKSPACE_ID"),
        base_url: I("ANTHROPIC_BASE_URL"),
        authentication: {
          type: "oidc_federation",
          federation_rule_id: e,
          service_account_id: I("ANTHROPIC_SERVICE_ACCOUNT_ID"),
          identity_token: r ? { source: "file", path: r } : void 0,
          scope: I("ANTHROPIC_SCOPE"),
        },
      };
    }
  }
  if (isDiskless()) return null;
  return U();
}
//@ chunk-3wydcdvj.js:21619-22799 esm-layout
async function ge(e, n) {
  if (e.authentication.type !== "oidc_federation") return null;
  let r = e.authentication.identity_token?.path,
    s;
  if (r)
    try {
      s = (await readFile(r, "utf-8")).trim();
    } catch (error) {
      return (
        logForDebugging(
          `wif: cannot read identity token at ${r} (${errorMessage(error)}); federation token cache disabled`,
        ),
        null
      );
    }
  else s = I("ANTHROPIC_IDENTITY_TOKEN");
  if (!s) return (logForDebugging("wif: no identity token; federation token cache disabled"), null);
  let o = federationCacheDir();
  if (o === null)
    return (
      logForDebugging("wif: no config directory, or a diskless session; federation token cache disabled"),
      null
    );
  try {
    await mkdir(o, { recursive: !0, mode: 448 });
    {
      let f = await stat(o),
        h = f.mode & 511;
      if (h & 63)
        return (
          logForDebugging(
            `wif: ${o} is mode 0o${h.toString(8)} (filesystem ignores modes, or directory pre-existed shared); federation token cache disabled`,
          ),
          null
        );
      let _ = process.getuid?.();
      if (_ !== void 0 && f.uid !== _)
        return (
          logForDebugging(`wif: ${o} is owned by uid ${f.uid}, not ${_}; federation token cache disabled`),
          null
        );
    }
  } catch (error) {
    return (
      logForDebugging(`wif: cannot prepare ${o} (${errorMessage(error)}); federation token cache disabled`),
      null
    );
  }
  let u = computeContentHash(
    JSON.stringify([
      e.authentication.federation_rule_id,
      e.organization_id,
      e.workspace_id ?? "",
      e.authentication.service_account_id ?? "",
      e.authentication.scope ?? "",
      n,
      computeContentHash(s),
    ]),
  );
  return join(o, `${u}.json`);
}

export { gAn, O, S, Te, ge, Sbi };
