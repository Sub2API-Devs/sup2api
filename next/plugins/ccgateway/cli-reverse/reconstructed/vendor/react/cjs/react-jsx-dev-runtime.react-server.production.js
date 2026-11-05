/**
 * react/cjs/react-jsx-dev-runtime.react-server.production.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: react@19.3.0..19.3.1
 * pieces: chunk-6n4z8qxn.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-6n4z8qxn.js:191-269 esm-fingerprint
var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
//@ chunk-6n4z8qxn.js:269-485 esm-fingerprint
function jsx(type, config, maybeKey) {
  var key = null;
  if (maybeKey !== undefined) key = "" + maybeKey;
  if (config.key !== undefined) key = "" + config.key;
  if ("key" in config) {
    maybeKey = {};
    for (var key_2 in config) if (key_2 !== "key") maybeKey[key_2] = config[key_2];
  } else maybeKey = config;
  config = maybeKey.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref: config !== undefined ? config : null,
    props: maybeKey,
  };
}
//@ chunk-6n4z8qxn.js:485-502 esm-layout
var Fragment = REACT_FRAGMENT_TYPE;
var jsxProd_default = jsx;
var jsxProd_default_2 = jsx;
export { jsxProd_default_2, jsxProd_default, Fragment };
