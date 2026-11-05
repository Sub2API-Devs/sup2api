/**
 * @mixmark-io/domino/lib/defineElement.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_attributes } from "./attributes.js";
import { require_config } from "./config.js";

//@ chunk-w04z664w.js:83403-84376 cjs-fingerprint
var require_defineElement = __commonJS(function (cjsExports, cjsModule) {
  var attributes = require_attributes();
  var isApiWritable = require_config().isApiWritable;
  cjsModule.exports = function (spec, defaultConstructor, tagList, tagNameToImpl) {
    var c_2 = spec.ctor;
    if (c_2) {
      var props = spec.props || {};
      if (spec.attributes)
        for (var n in spec.attributes) {
          var attr = spec.attributes[n];
          if (typeof attr !== "object" || Array.isArray(attr))
            attr = {
              type: attr,
            };
          if (!attr.name) attr.name = n.toLowerCase();
          props[n] = attributes.property(attr);
        }
      props.constructor = {
        value: c_2,
        writable: isApiWritable,
      };
      c_2.prototype = Object.create((spec.superclass || defaultConstructor).prototype, props);
      if (spec.events) addEventHandlers(c_2, spec.events);
      tagList[spec.name] = c_2;
    } else c_2 = defaultConstructor;
    (spec.tags || (spec.tag && [spec.tag]) || []).forEach(function (tag) {
      tagNameToImpl[tag] = c_2;
    });
    return c_2;
  };
  function EventHandlerBuilder(body, doc, form, element) {
    this.body = body;
    this.document = doc;
    this.form = form;
    this.element = element;
  }
  EventHandlerBuilder.prototype.build = function () {
    return () => {};
  };
  function EventHandlerChangeHandler(elt, name, oldval, newval) {
    var doc = elt.ownerDocument || Object.create(null);
    var form = elt.form || Object.create(null);
    elt[name] = new EventHandlerBuilder(newval, doc, form, elt).build();
  }
  function addEventHandlers(c, eventHandlerTypes) {
    var p = c.prototype;
    eventHandlerTypes.forEach(function (type) {
      Object.defineProperty(p, "on" + type, {
        get: function () {
          return this._getEventHandler(type);
        },
        set: function (v) {
          this._setEventHandler(type, v);
        },
      });
      attributes.registerChangeHandler(c, "on" + type, EventHandlerChangeHandler);
    });
  }
});
export { require_defineElement };
