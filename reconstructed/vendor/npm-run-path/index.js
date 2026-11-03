/**
 * npm-run-path/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: npm-run-path@6.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import pe, { default as re, default as Mr, default as No } from "process";
import { fileURLToPath } from "url";
import path, { default as path_2 } from "path";
import { ne } from "../path-key/index.js";

//@ chunk-m4p5zn6n.js:7660-8136 esm-fingerprint
var br = ({
    cwd: e = re.cwd(),
    path: n = re.env[ne()],
    preferLocal: r = !0,
    execPath: o = re.execPath,
    addExecPath: s = !0,
  } = {}) => {
    let u = e instanceof URL ? fileURLToPath(e) : e,
      resolved = path_2.resolve(u),
      l = [];
    if (r) Cr(l, resolved);
    if (s) Er(l, o, resolved);
    return [...l, n].join(path_2.delimiter);
  },
  Cr = (e, n) => {
    let r;
    while (r !== n) (e.push(path_2.join(n, "node_modules/.bin")), (r = n), (n = path_2.resolve(n, "..")));
  },
  Er = (e, n, r) => {
    let o = n instanceof URL ? fileURLToPath(n) : n;
    e.push(path_2.resolve(r, o, ".."));
  },
  Kt = ({ env: e = re.env, ...n } = {}) => {
    e = { ...e };
    let r = ne({ env: e });
    return ((n.path = e[r]), (e[r] = br(n)), e);
  };

export { Kt };
