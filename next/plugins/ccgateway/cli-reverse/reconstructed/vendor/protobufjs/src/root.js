/**
 * protobufjs/src/root.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_namespace } from "./namespace.js";
import { require_field } from "./field.js";
import { require_enum } from "./enum.js";
import { require_oneof } from "./oneof.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:109305-112807 cjs-fingerprint
var require_root = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Root;
  var Namespace = require_namespace();
  ((Root.prototype = Object.create(Namespace.prototype)).constructor = Root).className = "Root";
  var Field = require_field();
  var Enum = require_enum();
  var OneOf = require_oneof();
  var util = require_util_2();
  var Type;
  var parse;
  var common;
  function Root(options) {
    Namespace.call(this, "", options);
    this.deferred = [];
    this.files = [];
    this._edition = "proto2";
    this._fullyQualifiedObjects = {};
  }
  Root.fromJSON = function (json, root, depth) {
    depth = util.checkDepth(depth);
    if (!root) root = new Root();
    if (json.options) root.setOptions(json.options);
    return root.addJSON(json.nested, depth).resolveAll();
  };
  Root.prototype.resolvePath = util.path.resolve;
  Root.prototype.fetch = util.fetch;
  function SYNC() {}
  Root.prototype.load = function load(filename, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    var owner = this;
    if (!callback) return util.asPromise(load, owner, filename, options);
    var sync = callback === SYNC;
    function finish(err, root) {
      if (!callback) return;
      if (sync) throw err;
      if (root) root.resolveAll();
      var cb = callback;
      callback = null;
      cb(err, root);
    }
    function getBundledFileName(filename) {
      var idx = filename.lastIndexOf("google/protobuf/");
      if (idx > -1) {
        var altname = filename.substring(idx);
        if (altname in common) return altname;
      }
      return null;
    }
    function loadFile(filename, source) {
      try {
        if (util.isString(source) && source.charAt(0) === "{") source = JSON.parse(source);
        if (!util.isString(source)) owner.setOptions(source.options).addJSON(source.nested);
        else {
          parse.filename = filename;
          var parsed = parse(source, owner, options);
          var resolved;
          var i = 0;
          if (parsed.imports) {
            for (; i < parsed.imports.length; ++i)
              if (
                (resolved =
                  getBundledFileName(parsed.imports[i]) || owner.resolvePath(filename, parsed.imports[i]))
              )
                loadOrFetch(resolved);
          }
          if (parsed.weakImports) {
            for (i = 0; i < parsed.weakImports.length; ++i)
              if (
                (resolved =
                  getBundledFileName(parsed.weakImports[i]) ||
                  owner.resolvePath(filename, parsed.weakImports[i]))
              )
                loadOrFetch(resolved, true);
          }
        }
      } catch (err) {
        finish(err);
      }
      if (!sync && !queued) finish(null, owner);
    }
    function loadOrFetch(filename, weak) {
      filename = getBundledFileName(filename) || filename;
      if (owner.files.indexOf(filename) > -1) return;
      owner.files.push(filename);
      if (filename in common) {
        if (sync) loadFile(filename, common[filename]);
        else {
          ++queued;
          setTimeout(function () {
            --queued;
            loadFile(filename, common[filename]);
          });
        }
        return;
      }
      if (sync) {
        var source;
        try {
          source = util.fs.readFileSync(filename).toString("utf8");
        } catch (err) {
          if (!weak) finish(err);
          return;
        }
        loadFile(filename, source);
      } else {
        ++queued;
        owner.fetch(filename, function (err, source) {
          --queued;
          if (!callback) return;
          if (err) {
            if (!weak) finish(err);
            else if (!queued) finish(null, owner);
            return;
          }
          loadFile(filename, source);
        });
      }
    }
    var queued = 0;
    if (util.isString(filename)) filename = [filename];
    for (var i = 0, resolved; i < filename.length; ++i)
      if ((resolved = owner.resolvePath("", filename[i]))) loadOrFetch(resolved);
    if (sync) {
      owner.resolveAll();
      return owner;
    }
    if (!queued) finish(null, owner);
    return owner;
  };
  Root.prototype.loadSync = function (filename, options) {
    if (!util.isNode) throw Error("not supported");
    return this.load(filename, options, SYNC);
  };
  Root.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    if (this.deferred.length)
      throw Error(
        "unresolvable extensions: " +
          this.deferred
            .map(function (field) {
              return "'extend " + field.extend + "' in " + field.parent.fullName;
            })
            .join(", "),
      );
    return Namespace.prototype.resolveAll.call(this);
  };
  var exposeRe = /^[A-Z]/;
  function tryHandleExtension(root, field) {
    var extendedType = field.parent.lookup(field.extend);
    if (extendedType) {
      var sisterField = new Field(field.fullName, field.id, field.type, field.rule, undefined, field.options);
      if (extendedType.get(sisterField.name)) return true;
      sisterField.declaringField = field;
      field.extensionField = sisterField;
      extendedType.add(sisterField);
      return true;
    }
    return false;
  }
  Root.prototype._handleAdd = function (object) {
    if (object instanceof Field) {
      if (object.extend !== undefined && !object.extensionField) {
        if (!tryHandleExtension(this, object)) this.deferred.push(object);
      }
    } else if (object instanceof Enum) {
      if (exposeRe.test(object.name)) object.parent[object.name] = object.values;
    } else if (!(object instanceof OneOf)) {
      if (object instanceof Type)
        for (var i_2 = 0; i_2 < this.deferred.length;)
          if (tryHandleExtension(this, this.deferred[i_2])) this.deferred.splice(i_2, 1);
          else ++i_2;
      for (var j = 0; j < object.nestedArray.length; ++j) this._handleAdd(object._nestedArray[j]);
      if (exposeRe.test(object.name)) object.parent[object.name] = object;
    }
    if (object instanceof Type || object instanceof Enum || object instanceof Field)
      this._fullyQualifiedObjects[object.fullName] = object;
  };
  Root.prototype._handleRemove = function (object) {
    if (object instanceof Field) {
      if (object.extend !== undefined)
        if (object.extensionField) {
          object.extensionField.parent.remove(object.extensionField);
          object.extensionField = null;
        } else {
          var index = this.deferred.indexOf(object);
          if (index > -1) this.deferred.splice(index, 1);
        }
    } else if (object instanceof Enum) {
      if (exposeRe.test(object.name)) delete object.parent[object.name];
    } else if (object instanceof Namespace) {
      for (var idx = 0; idx < object.nestedArray.length; ++idx) this._handleRemove(object._nestedArray[idx]);
      if (exposeRe.test(object.name)) delete object.parent[object.name];
    }
    delete this._fullyQualifiedObjects[object.fullName];
  };
  Root._configure = function (Type_, parse_, common_) {
    Type = Type_;
    parse = parse_;
    common = common_;
  };
});
export { require_root };
