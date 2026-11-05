/**
 * @mixmark-io/domino/lib/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_DOMImplementation } from "./DOMImplementation.js";
import { require_HTMLParser } from "./HTMLParser.js";
import { require_Window } from "./Window.js";
import { require_impl } from "./impl.js";

//@ chunk-w04z664w.js:237189-237838 cjs-fingerprint
var require_domino = __commonJS(function (cjsExports) {
  var DOMImplementation = require_DOMImplementation();
  var HTMLParser = require_HTMLParser();
  var Window = require_Window();
  var impl = require_impl();
  cjsExports.createDOMImplementation = function () {
    return new DOMImplementation(null);
  };
  cjsExports.createDocument = function (html, force) {
    if (html || force) {
      var parser = new HTMLParser();
      parser.parse(html || "", true);
      return parser.document();
    }
    return new DOMImplementation(null).createHTMLDocument("");
  };
  cjsExports.createIncrementalHTMLParser = function () {
    var parser = new HTMLParser();
    return {
      write: function (s) {
        if (s.length > 0)
          parser.parse(s, false, function () {
            return true;
          });
      },
      end: function (s) {
        parser.parse(s || "", true, function () {
          return true;
        });
      },
      process: function (shouldPauseFunc) {
        return parser.parse("", false, shouldPauseFunc);
      },
      document: function () {
        return parser.document();
      },
    };
  };
  cjsExports.createWindow = function (html, address) {
    var doc = cjsExports.createDocument(html);
    if (address !== undefined) doc._address = address;
    return new impl.Window(doc);
  };
  cjsExports.impl = impl;
});
export { require_domino };
