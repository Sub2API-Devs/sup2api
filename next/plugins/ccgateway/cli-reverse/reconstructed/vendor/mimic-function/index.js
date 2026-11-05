/**
 * mimic-function/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: mimic-function@5.0.1
 * pieces: chunk-t889g22j.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-t889g22j.js:8135-8991 esm-fingerprint
var copyProperty = (to, from, property, ignoreNonConfigurable) => {
  if (property === "length" || property === "prototype") return;
  if (property === "arguments" || property === "caller") return;
  let toDescriptor = Object.getOwnPropertyDescriptor(to, property);
  let fromDescriptor = Object.getOwnPropertyDescriptor(from, property);
  if (!canCopyProperty(toDescriptor, fromDescriptor) && ignoreNonConfigurable) return;
  Object.defineProperty(to, property, fromDescriptor);
};
var canCopyProperty = function (toDescriptor, fromDescriptor) {
  return (
    toDescriptor === undefined ||
    toDescriptor.configurable ||
    (toDescriptor.writable === fromDescriptor.writable &&
      toDescriptor.enumerable === fromDescriptor.enumerable &&
      toDescriptor.configurable === fromDescriptor.configurable &&
      (toDescriptor.writable || toDescriptor.value === fromDescriptor.value))
  );
};
var changePrototype = (to, from) => {
  let fromPrototype = Object.getPrototypeOf(from);
  if (fromPrototype === Object.getPrototypeOf(to)) return;
  Object.setPrototypeOf(to, fromPrototype);
};
var wrappedToString = (withName, fromBody) => `/* Wrapped ${withName}*/
${fromBody}`;
var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
var ownPropertyDescriptor_2 = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name");
var changeToString = (to, from, name) => {
  let withName = name === "" ? "" : `with ${name.trim()}() `;
  let newToString = wrappedToString.bind(null, withName, from.toString());
  Object.defineProperty(newToString, "name", ownPropertyDescriptor_2);
  Object.defineProperty(to, "toString", {
    ...ownPropertyDescriptor,
    value: newToString,
  });
};
//@ chunk-t889g22j.js:8991-9125 esm-fingerprint
function mimicFunction(to, from, { ignoreNonConfigurable = false } = {}) {
  let { name } = to;
  for (let property of Reflect.ownKeys(from)) copyProperty(to, from, property, ignoreNonConfigurable);
  changePrototype(to, from);
  changeToString(to, from, name);
  return to;
}
export { mimicFunction };
