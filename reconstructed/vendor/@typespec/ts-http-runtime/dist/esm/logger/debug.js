/**
 * @typespec/ts-http-runtime/dist/esm/logger/debug.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 3, esm-fingerprint 7
 */
import "process";
import * as processModule_2 from "process";
import util from "util";
import { EOL } from "os";

//@ chunk-mrx6y2r5.js:24430-24495 esm-layout
function log(message, ...args) {
  processModule_2.stderr.write(`${util.format(message, ...args)}${EOL}`);
}
//@ chunk-mrx6y2r5.js:24495-24582 esm-fingerprint
var debugEnvVariable = (typeof process !== "undefined" && process.env && process.env.DEBUG) || undefined;
var enabledString;
var enabledNamespaces = [];
var skippedNamespaces = [];
var debuggers = [];
//@ chunk-mrx6y2r5.js:24582-24595 esm-layout
if (debugEnvVariable) enable(debugEnvVariable);
//@ chunk-mrx6y2r5.js:24595-24669 esm-fingerprint
var debugObj = Object.assign((namespace) => createDebugger(namespace), {
  enable,
  enabled,
  disable,
  log,
});
//@ chunk-mrx6y2r5.js:24669-24917 esm-fingerprint
function enable(namespaces) {
  enabledString = namespaces;
  enabledNamespaces = [];
  skippedNamespaces = [];
  let wildcard = /\*/g;
  let namespaceList = namespaces.split(",").map((ns) => ns.trim().replace(wildcard, ".*?"));
  for (let ns of namespaceList)
    if (ns.startsWith("-")) skippedNamespaces.push(new RegExp(`^${ns.substr(1)}$`));
    else enabledNamespaces.push(new RegExp(`^${ns}$`));
  for (let instance of debuggers) instance.enabled = enabled(instance.namespace);
}
//@ chunk-mrx6y2r5.js:24917-25045 esm-fingerprint
function enabled(namespace) {
  if (namespace.endsWith("*")) return true;
  for (let skipped of skippedNamespaces) if (skipped.test(namespace)) return false;
  for (let enabledNamespace of enabledNamespaces) if (enabledNamespace.test(namespace)) return true;
  return false;
}
//@ chunk-mrx6y2r5.js:25045-25088 esm-layout
function disable() {
  let result = enabledString || "";
  enable("");
  return result;
}
//@ chunk-mrx6y2r5.js:25088-25290 esm-fingerprint
function createDebugger(namespace) {
  let newDebugger = Object.assign(debug, {
    enabled: enabled(namespace),
    destroy,
    log: debugObj.log,
    namespace,
    extend,
  });
  function debug(...args) {
    if (!newDebugger.enabled) return;
    if (args.length > 0) args[0] = `${namespace} ${args[0]}`;
    newDebugger.log(...args);
  }
  debuggers.push(newDebugger);
  return newDebugger;
}
//@ chunk-mrx6y2r5.js:25290-25369 esm-fingerprint
function destroy() {
  let index = debuggers.indexOf(this);
  if (index >= 0) {
    debuggers.splice(index, 1);
    return true;
  }
  return false;
}
//@ chunk-mrx6y2r5.js:25369-25443 esm-fingerprint
function extend(namespace) {
  let newDebugger = createDebugger(`${this.namespace}:${namespace}`);
  newDebugger.log = this.log;
  return newDebugger;
}
export { debugObj };
