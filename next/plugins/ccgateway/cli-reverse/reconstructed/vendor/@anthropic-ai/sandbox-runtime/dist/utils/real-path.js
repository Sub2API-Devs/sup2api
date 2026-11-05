/**
 * @anthropic-ai/sandbox-runtime/dist/utils/real-path.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-getdj2mr.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import "path";
import * as pathModule_2 from "path";
import "fs";
import * as fsModule_2 from "fs";
import "fs";

//@ chunk-getdj2mr.js:884-894 esm-layout
var MAX_LINKS = 40;
//@ chunk-getdj2mr.js:894-1077 esm-fingerprint
function textOf(ask, at) {
  let text = ask(at);
  if (text.includes("\uFFFD") && !ask(at, "buffer").equals(Buffer.from(text)))
    throw Object.assign(Error(`EILSEQ: illegal byte sequence, '${at}'`), {
      code: "EILSEQ",
    });
  return text;
}
//@ chunk-getdj2mr.js:1077-1274 esm-fingerprint
function realPathOf(p) {
  let from = pathModule_2.isAbsolute(p) ? "" : process.cwd();
  let folded = pathModule_2.resolve(from, p);
  if (!(from + p).includes("\\")) return textOf(fsModule_2.realpathSync.native, folded);
  let { real, notThere } = wayTo(folded);
  if (notThere !== undefined) throw notThere;
  return real || "/";
}
//@ chunk-getdj2mr.js:1274-1985 esm-fingerprint
function wayTo(folded) {
  let real = "";
  let links = 0;
  let rest = folded.split("/");
  for (let name = rest.shift(); name !== undefined; name = rest.shift()) {
    if (name === "" || name === "." || name === "..") {
      try {
        fsModule_2.lstatSync(`${real}/.`);
      } catch (notThere) {
        if (notThere.code !== "EACCES") throw notThere;
        return {
          real,
          rest: [name, ...rest],
          notThere,
        };
      }
      if (name === "..") real = real.slice(0, real.lastIndexOf("/"));
      continue;
    }
    let next = `${real}/${name}`;
    let isLink;
    try {
      isLink = fsModule_2.lstatSync(next).isSymbolicLink();
    } catch (notThere) {
      let { code } = notThere;
      if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "EACCES") throw notThere;
      return {
        real,
        rest: [name, ...rest],
        notThere,
      };
    }
    if (!isLink) {
      real = next;
      continue;
    }
    if (++links > MAX_LINKS)
      throw Object.assign(Error(`ELOOP: too many symbolic links encountered, realpath '${folded}'`), {
        code: "ELOOP",
        syscall: "realpath",
        path: folded,
      });
    let target = textOf(fsModule_2.readlinkSync, next);
    if (target.startsWith("/")) real = "";
    rest.unshift(...target.split("/"));
  }
  return {
    real,
    rest,
  };
}
export { realPathOf, wayTo };
