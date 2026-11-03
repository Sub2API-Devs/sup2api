/**
 * @anthropic-ai/mcpb/dist/shared/config.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/mcpb@1.1.2..2.0.1
 * pieces: chunk-64s30qnv.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */

//@ chunk-64s30qnv.js:2213-2869 esm-fingerprint
function z(t, i) {
  if (typeof t === "string") {
    let n = t;
    for (let [e, r] of Object.entries(i)) {
      let regExp = new RegExp(`\\$\\{${e}\\}`, "g");
      if (n.match(regExp))
        if (Array.isArray(r))
          console.warn(`Cannot replace ${e} with array value in string context: "${t}"`, {
            key: e,
            replacement: r,
          });
        else n = n.replace(regExp, r);
    }
    return n;
  } else if (Array.isArray(t)) {
    let n = [];
    for (let e of t)
      if (typeof e === "string" && e.match(/^\$\{user_config\.[^}]+\}$/)) {
        let r = e.match(/^\$\{([^}]+)\}$/)?.[1];
        if (r && i[r]) {
          let o = i[r];
          if (Array.isArray(o)) n.push(...o);
          else n.push(o);
        } else n.push(e);
      } else n.push(z(e, i));
    return n;
  } else if (t && typeof t === "object") {
    let n = {};
    for (let [e, r] of Object.entries(t)) n[e] = z(r, i);
    return n;
  }
  return t;
}
//@ chunk-64s30qnv.js:2869-3679 esm-fingerprint
async function R(t) {
  let {
      manifest: manifest,
      extensionPath: extensionPath,
      systemDirs: systemDirs,
      userConfig: userConfig,
      pathSeparator: pathSeparator,
      logger: logger,
    } = t,
    c = manifest.server?.mcp_config;
  if (!c) return;
  let s = { ...c };
  if (c.platform_overrides) {
    if ("linux" in c.platform_overrides) {
      let linux = c.platform_overrides.linux;
      ((s.command = linux.command || s.command),
        (s.args = linux.args || s.args),
        (s.env = linux.env || s.env));
    }
  }
  if (j({ manifest: manifest, userConfig: userConfig })) {
    logger?.warn(`Extension ${manifest.name} has missing required configuration, skipping MCP config`);
    return;
  }
  let l = { __dirname: extensionPath, pathSeparator: pathSeparator, "/": pathSeparator, ...systemDirs },
    f = {};
  if (manifest.user_config) {
    for (let [p, a] of Object.entries(manifest.user_config)) if (a.default !== void 0) f[p] = a.default;
  }
  if (userConfig) Object.assign(f, userConfig);
  for (let [p, a] of Object.entries(f)) {
    let g = `user_config.${p}`;
    if (Array.isArray(a)) l[g] = a.map(String);
    else if (typeof a === "boolean") l[g] = a ? "true" : "false";
    else l[g] = String(a);
  }
  return ((s = z(s, l)), s);
}
//@ chunk-64s30qnv.js:3679-3729 esm-layout
function u(t) {
  return t === void 0 || t === null || t === "";
}
//@ chunk-64s30qnv.js:3729-3948 esm-fingerprint
function j({ manifest: manifest, userConfig: userConfig }) {
  if (!manifest.user_config) return !1;
  let n = userConfig || {};
  for (let [e, r] of Object.entries(manifest.user_config))
    if (r.required) {
      let o = n[e];
      if (u(o) || (Array.isArray(o) && (o.length === 0 || o.some(u)))) return !0;
    }
  return !1;
}
