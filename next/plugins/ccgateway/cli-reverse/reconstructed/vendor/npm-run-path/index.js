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
var npmRunPathEnv = ({
  cwd = Mr.cwd(),
  path: pathVar = Mr.env[pathKey()],
  preferLocal = true,
  execPath = Mr.execPath,
  addExecPath = true,
} = {}) => {
  let cwdPath = cwd instanceof URL ? fileURLToPath(cwd) : cwd;
  let resolved = path.resolve(cwdPath);
  let result = [];
  if (preferLocal) appendBinDirs(result, resolved);
  if (addExecPath) appendExecPathDirs(result, execPath, resolved);
  return [...result, pathVar].join(path.delimiter);
};
var appendBinDirs = (result, dir) => {
  let parent;
  while (parent !== dir) {
    result.push(path.join(dir, "node_modules/.bin"));
    parent = dir;
    dir = path.resolve(dir, "..");
  }
};
var appendExecPathDirs = (result, execPathValue, cwdPath) => {
  let resolvedExecPath = execPathValue instanceof URL ? fileURLToPath(execPathValue) : execPathValue;
  result.push(path.resolve(cwdPath, resolvedExecPath, ".."));
};
var npmRunPath = ({ env = Mr.env, ...options } = {}) => {
  env = {
    ...env,
  };
  let pathName = pathKey({
    env,
  });
  options.path = env[pathName];
  env[pathName] = npmRunPathEnv(options);
  return env;
};
export { npmRunPath };
