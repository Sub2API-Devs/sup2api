/**
 * @anthropic-ai/sandbox-runtime/dist/utils/real-path.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-r0ads4ty.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";

//@ chunk-r0ads4ty.js:884-894 esm-layout
var re = 40;
//@ chunk-r0ads4ty.js:894-1077 esm-fingerprint
function P(e, t) {
  let r = e(t);
  if (r.includes("\uFFFD") && !e(t, "buffer").equals(Buffer.from(r)))
    throw Object.assign(Error(`EILSEQ: illegal byte sequence, '${t}'`), { code: "EILSEQ" });
  return r;
}
//@ chunk-r0ads4ty.js:1077-1274 esm-fingerprint
function JSe(e) {
  let t = pathModule_2.isAbsolute(e) ? "" : process.cwd(),
    resolved = pathModule_2.resolve(t, e);
  if (!(t + e).includes("\\")) return P(fsModule_3.realpathSync.native, resolved);
  let { real: real, notThere: notThere } = b8o(resolved);
  if (notThere !== void 0) throw notThere;
  return real || "/";
}
//@ chunk-r0ads4ty.js:1274-1985 esm-fingerprint
function b8o(e) {
  let t = "",
    r = 0,
    parts = e.split("/");
  for (let c = parts.shift(); c !== void 0; c = parts.shift()) {
    if (c === "" || c === "." || c === "..") {
      try {
        fsModule_3.lstatSync(`${t}/.`);
      } catch (error) {
        if (error.code !== "EACCES") throw error;
        return { real: t, rest: [c, ...parts], notThere: error };
      }
      if (c === "..") t = t.slice(0, t.lastIndexOf("/"));
      continue;
    }
    let f = `${t}/${c}`,
      a;
    try {
      a = fsModule_3.lstatSync(f).isSymbolicLink();
    } catch (error) {
      let { code: code } = error;
      if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "EACCES") throw error;
      return { real: t, rest: [c, ...parts], notThere: error };
    }
    if (!a) {
      t = f;
      continue;
    }
    if (++r > re)
      throw Object.assign(Error(`ELOOP: too many symbolic links encountered, realpath '${e}'`), {
        code: "ELOOP",
        syscall: "realpath",
        path: e,
      });
    let o = P(fsModule_3.readlinkSync, f);
    if (o.startsWith("/")) t = "";
    parts.unshift(...o.split("/"));
  }
  return { real: t, rest: parts };
}

export { JSe, b8o };
