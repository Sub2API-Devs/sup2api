/**
 * npm-run-path/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: npm-run-path@6.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import { default as Mr } from "process";
import { fileURLToPath } from "url";
import path from "path";
import { pathKey } from "../path-key/index.js";

//@ chunk-m4p5zn6n.js:7660-8136 esm-fingerprint
var br = ({
  cwd: e = Mr.cwd(),
  path: n = Mr.env[pathKey()],
  preferLocal = true,
  execPath: o = Mr.execPath,
  addExecPath = true,
} = {}) => {
  let u = e instanceof URL ? fileURLToPath(e) : e;
  let resolved = path.resolve(u);
  let result = [];
  if (preferLocal) Cr(result, resolved);
  if (addExecPath) Er(result, o, resolved);
  return [...result, n].join(path.delimiter);
};
var Cr = (result, n) => {
  let r;
  while (r !== n) {
    result.push(path.join(n, "node_modules/.bin"));
    r = n;
    n = path.resolve(n, "..");
  }
};
var Er = (result, n, r) => {
  let o = n instanceof URL ? fileURLToPath(n) : n;
  result.push(path.resolve(r, o, ".."));
};
var Kt = ({ env = Mr.env, ...options } = {}) => {
  env = {
    ...env,
  };
  let pathName = pathKey({
    env,
  });
  options.path = env[pathName];
  env[pathName] = br(options);
  return env;
};
export { Kt };
