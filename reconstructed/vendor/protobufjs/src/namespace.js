/**
 * protobufjs/src/namespace.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { Yt } from "./field.js";
import { de } from "./util.js";
import { Sr } from "./oneof.js";

//@ chunk-pwh5dx3n.js:80379-85940 cjs-fingerprint
var zr = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Namespace;
  var ReflectionObject = Kt();
  ((Namespace.prototype = Object.create(ReflectionObject.prototype)).constructor = Namespace).className =
    "Namespace";
  var Field = Yt();
  var util = de();
  var OneOf = Sr();
  var Type;
  var Service;
  var Enum;
  Namespace.fromJSON = function (name, json, depth) {
    depth = util.checkDepth(depth);
    return new Namespace(name, json.options).addJSON(json.nested, depth);
  };
  function arrayToJSON(array, toJSONOptions) {
    if (!(array && array.length)) return;
    var obj = {};
    for (var idx = 0; idx < array.length; ++idx) obj[array[idx].name] = array[idx].toJSON(toJSONOptions);
    return obj;
  }
  Namespace.arrayToJSON = arrayToJSON;
  Namespace.isReservedId = function (reserved, id) {
    if (reserved) {
      for (var idx = 0; idx < reserved.length; ++idx)
        if (typeof reserved[idx] !== "string" && reserved[idx][0] <= id && reserved[idx][1] > id) return true;
    }
    return false;
  };
  Namespace.isReservedName = function (reserved, name) {
    if (reserved) {
      for (var idx = 0; idx < reserved.length; ++idx) if (reserved[idx] === name) return true;
    }
    return false;
  };
  function Namespace(name, options) {
    ReflectionObject.call(this, name, options);
    this.nested = undefined;
    this._nestedArray = null;
    this._lookupCache = Object.create(null);
    this._needsRecursiveFeatureResolution = true;
    this._needsRecursiveResolve = true;
  }
  function clearCache(namespace) {
    namespace._nestedArray = null;
    namespace._lookupCache = Object.create(null);
    var parent = namespace;
    while ((parent = parent.parent)) parent._lookupCache = Object.create(null);
    return namespace;
  }
  Object.defineProperty(Namespace.prototype, "nestedArray", {
    get: function () {
      return this._nestedArray || (this._nestedArray = util.toArray(this.nested));
    },
  });
  Namespace.prototype.toJSON = function (toJSONOptions) {
    return util.toObject(["options", this.options, "nested", arrayToJSON(this.nestedArray, toJSONOptions)]);
  };
  Namespace.prototype.addJSON = function (nestedJson, depth) {
    depth = util.checkDepth(depth);
    var ns = this;
    if (nestedJson)
      for (var names = Object.keys(nestedJson), i = 0, nested; i < names.length; ++i) {
        nested = nestedJson[names[i]];
        ns.add(
          (nested.fields !== undefined
            ? Type.fromJSON
            : nested.values !== undefined
              ? Enum.fromJSON
              : nested.methods !== undefined
                ? Service.fromJSON
                : nested.id !== undefined
                  ? Field.fromJSON
                  : Namespace.fromJSON)(names[i], nested, depth + 1),
        );
      }
    return this;
  };
  Namespace.prototype.get = function (name) {
    return this.nested && Object.prototype.hasOwnProperty.call(this.nested, name) ? this.nested[name] : null;
  };
  Namespace.prototype.getEnum = function (name) {
    if (
      this.nested &&
      Object.prototype.hasOwnProperty.call(this.nested, name) &&
      this.nested[name] instanceof Enum
    )
      return this.nested[name].values;
    throw Error("no such enum: " + name);
  };
  Namespace.prototype.add = function (object) {
    if (!(
      (object instanceof Field && object.extend !== undefined) ||
      object instanceof Type ||
      object instanceof OneOf ||
      object instanceof Enum ||
      object instanceof Service ||
      object instanceof Namespace
    ))
      throw TypeError("object must be a valid nested object");
    if (object.name === "__proto__") return this;
    if (!this.nested) this.nested = {};
    else {
      var prev = this.get(object.name);
      if (prev)
        if (
          prev instanceof Namespace &&
          object instanceof Namespace &&
          !(prev instanceof Type || prev instanceof Service)
        ) {
          var nested = prev.nestedArray;
          for (var i = 0; i < nested.length; ++i) object.add(nested[i]);
          this.remove(prev);
          if (!this.nested) this.nested = {};
          object.setOptions(prev.options, true);
        } else throw Error("duplicate name '" + object.name + "' in " + this);
    }
    this.nested[object.name] = object;
    if (!(this instanceof Type || this instanceof Service || this instanceof Enum || this instanceof Field)) {
      if (!object._edition) object._edition = object._defaultEdition;
    }
    this._needsRecursiveFeatureResolution = true;
    this._needsRecursiveResolve = true;
    var parent = this;
    while ((parent = parent.parent)) {
      parent._needsRecursiveFeatureResolution = true;
      parent._needsRecursiveResolve = true;
    }
    object.onAdd(this);
    return clearCache(this);
  };
  Namespace.prototype.remove = function (object) {
    if (!(object instanceof ReflectionObject)) throw TypeError("object must be a ReflectionObject");
    if (object.parent !== this) throw Error(object + " is not a member of " + this);
    delete this.nested[object.name];
    if (!Object.keys(this.nested).length) this.nested = undefined;
    object.onRemove(this);
    return clearCache(this);
  };
  Namespace.prototype.define = function (path, json) {
    if (util.isString(path)) path = path.split(".");
    else if (!Array.isArray(path)) throw TypeError("illegal path");
    if (path && path.length && path[0] === "") throw Error("path must be relative");
    var ptr = this;
    while (path.length > 0) {
      var part = path.shift();
      if (ptr.nested && ptr.nested[part]) {
        ptr = ptr.nested[part];
        if (!(ptr instanceof Namespace)) throw Error("path conflicts with non-namespace objects");
      } else ptr.add((ptr = new Namespace(part)));
    }
    if (json) ptr.addJSON(json);
    return ptr;
  };
  Namespace.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    this._resolveFeaturesRecursive(this._edition);
    var nested = this.nestedArray;
    var i = 0;
    this.resolve();
    while (i < nested.length)
      if (nested[i] instanceof Namespace) nested[i++].resolveAll();
      else nested[i++].resolve();
    this._needsRecursiveResolve = false;
    return this;
  };
  Namespace.prototype._resolveFeaturesRecursive = function (edition) {
    if (!this._needsRecursiveFeatureResolution) return this;
    this._needsRecursiveFeatureResolution = false;
    edition = this._edition || edition;
    ReflectionObject.prototype._resolveFeaturesRecursive.call(this, edition);
    this.nestedArray.forEach((nested) => {
      nested._resolveFeaturesRecursive(edition);
    });
    return this;
  };
  Namespace.prototype.lookup = function (path, filterTypes, parentAlreadyChecked) {
    if (typeof filterTypes === "boolean") {
      parentAlreadyChecked = filterTypes;
      filterTypes = undefined;
    } else if (filterTypes && !Array.isArray(filterTypes)) filterTypes = [filterTypes];
    if (util.isString(path) && path.length) {
      if (path === ".") return this.root;
      path = path.split(".");
    } else if (!path.length) return this;
    var flatPath = path.join(".");
    if (path[0] === "") return this.root.lookup(path.slice(1), filterTypes);
    var found = this.root._fullyQualifiedObjects && this.root._fullyQualifiedObjects["." + flatPath];
    if (found && (!filterTypes || filterTypes.indexOf(found.constructor) > -1)) return found;
    found = this._lookupImpl(path, flatPath);
    if (found && (!filterTypes || filterTypes.indexOf(found.constructor) > -1)) return found;
    if (parentAlreadyChecked) return null;
    var current = this;
    while (current.parent) {
      found = current.parent._lookupImpl(path, flatPath);
      if (found && (!filterTypes || filterTypes.indexOf(found.constructor) > -1)) return found;
      current = current.parent;
    }
    return null;
  };
  Namespace.prototype._lookupImpl = function (path, flatPath) {
    if (Object.prototype.hasOwnProperty.call(this._lookupCache, flatPath)) return this._lookupCache[flatPath];
    var found = this.get(path[0]);
    var exact = null;
    if (found) {
      if (path.length === 1) exact = found;
      else if (found instanceof Namespace) {
        path = path.slice(1);
        exact = found._lookupImpl(path, path.join("."));
      }
    } else
      for (var i = 0; i < this.nestedArray.length; ++i)
        if (
          this._nestedArray[i] instanceof Namespace &&
          (found = this._nestedArray[i]._lookupImpl(path, flatPath))
        ) {
          exact = found;
          break;
        }
    this._lookupCache[flatPath] = exact;
    return exact;
  };
  Namespace.prototype.lookupType = function (path) {
    var found = this.lookup(path, [Type]);
    if (!found) throw Error("no such type: " + path);
    return found;
  };
  Namespace.prototype.lookupEnum = function (path) {
    var found = this.lookup(path, [Enum]);
    if (!found) throw Error("no such Enum '" + path + "' in " + this);
    return found;
  };
  Namespace.prototype.lookupTypeOrEnum = function (path) {
    var found = this.lookup(path, [Type, Enum]);
    if (!found) throw Error("no such Type or Enum '" + path + "' in " + this);
    return found;
  };
  Namespace.prototype.lookupService = function (path) {
    var found = this.lookup(path, [Service]);
    if (!found) throw Error("no such Service '" + path + "' in " + this);
    return found;
  };
  Namespace._configure = function (Type_, Service_, Enum_) {
    Type = Type_;
    Service = Service_;
    Enum = Enum_;
  };
});
export { zr };
