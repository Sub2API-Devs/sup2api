/**
 * protobufjs/src/type.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_namespace } from "./namespace.js";
import { require_enum } from "./enum.js";
import { require_oneof } from "./oneof.js";
import { require_field } from "./field.js";
import { require_mapfield } from "./mapfield.js";
import { require_service } from "./service.js";
import { require_message } from "./message.js";
import { require_reader } from "./reader.js";
import { require_writer } from "./writer.js";
import { require_util_2 } from "./util.js";
import { require_encoder } from "./encoder.js";
import { require_decoder } from "./decoder.js";
import { require_verifier } from "./verifier.js";
import { require_converter } from "./converter.js";
import { require_wrappers } from "./wrappers.js";

//@ chunk-3k21nfa0.js:102455-109305 cjs-fingerprint
var require_type = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Type;
  var Namespace = require_namespace();
  ((Type.prototype = Object.create(Namespace.prototype)).constructor = Type).className = "Type";
  var Enum = require_enum();
  var OneOf = require_oneof();
  var Field = require_field();
  var MapField = require_mapfield();
  var Service = require_service();
  var Message = require_message();
  var Reader = require_reader();
  var Writer = require_writer();
  var util = require_util_2();
  var encoder = require_encoder();
  var decoder = require_decoder();
  var verifier = require_verifier();
  var converter = require_converter();
  var wrappers = require_wrappers();
  function Type(name, options) {
    name = name.replace(/\W/g, "");
    Namespace.call(this, name, options);
    this.fields = {};
    this.oneofs = undefined;
    this.extensions = undefined;
    this.reserved = undefined;
    this.group = undefined;
    this._fieldsById = null;
    this._fieldsArray = null;
    this._oneofsArray = null;
    this._ctor = null;
  }
  Object.defineProperties(Type.prototype, {
    fieldsById: {
      get: function () {
        if (this._fieldsById) return this._fieldsById;
        this._fieldsById = {};
        for (var names = Object.keys(this.fields), i_2 = 0; i_2 < names.length; ++i_2) {
          var field = this.fields[names[i_2]];
          var id = field.id;
          if (this._fieldsById[id]) throw Error("duplicate id " + id + " in " + this);
          this._fieldsById[id] = field;
        }
        return this._fieldsById;
      },
    },
    fieldsArray: {
      get: function () {
        return this._fieldsArray || (this._fieldsArray = util.toArray(this.fields));
      },
    },
    oneofsArray: {
      get: function () {
        return this._oneofsArray || (this._oneofsArray = util.toArray(this.oneofs));
      },
    },
    ctor: {
      get: function () {
        return this._ctor || (this.ctor = Type.generateConstructor(this)());
      },
      set: function (ctor) {
        var prototype = ctor.prototype;
        if (!(prototype instanceof Message)) {
          (ctor.prototype = new Message()).constructor = ctor;
          util.merge(ctor.prototype, prototype);
        }
        ctor.$type = ctor.prototype.$type = this;
        util.merge(ctor, Message, true);
        this._ctor = ctor;
        var i_2 = 0;
        for (; i_2 < this.fieldsArray.length; ++i_2) this._fieldsArray[i_2].resolve();
        var ctorProperties = {};
        for (i_2 = 0; i_2 < this.oneofsArray.length; ++i_2)
          ctorProperties[this._oneofsArray[i_2].resolve().name] = {
            get: util.oneOfGetter(this._oneofsArray[i_2].oneof),
            set: util.oneOfSetter(this._oneofsArray[i_2].oneof),
          };
        if (i_2) Object.defineProperties(ctor.prototype, ctorProperties);
      },
    },
  });
  Type.generateConstructor = function (mtype) {
    var gen = util.codegen(["p"], mtype.name);
    for (var idx = 0, field; idx < mtype.fieldsArray.length; ++idx)
      if ((field = mtype._fieldsArray[idx]).map) gen("this%s={}", util.safeProp(field.name));
      else if (field.repeated) gen("this%s=[]", util.safeProp(field.name));
    return gen('if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null&&ks[i]!=="__proto__")')(
      "this[ks[i]]=p[ks[i]]",
    );
  };
  function clearCache(type) {
    type._fieldsById = type._fieldsArray = type._oneofsArray = null;
    delete type.encode;
    delete type.decode;
    delete type.verify;
    return type;
  }
  Type.fromJSON = function (name, json, depth) {
    depth = util.checkDepth(depth);
    var type = new Type(name, json.options);
    type.extensions = json.extensions;
    type.reserved = json.reserved;
    var names = Object.keys(json.fields);
    var i = 0;
    for (; i < names.length; ++i)
      type.add(
        (typeof json.fields[names[i]].keyType !== "undefined" ? MapField.fromJSON : Field.fromJSON)(
          names[i],
          json.fields[names[i]],
        ),
      );
    if (json.oneofs)
      for (names = Object.keys(json.oneofs), i = 0; i < names.length; ++i)
        type.add(OneOf.fromJSON(names[i], json.oneofs[names[i]]));
    if (json.nested)
      for (names = Object.keys(json.nested), i = 0; i < names.length; ++i) {
        var nested = json.nested[names[i]];
        type.add(
          (nested.id !== undefined
            ? Field.fromJSON
            : nested.fields !== undefined
              ? Type.fromJSON
              : nested.values !== undefined
                ? Enum.fromJSON
                : nested.methods !== undefined
                  ? Service.fromJSON
                  : Namespace.fromJSON)(names[i], nested, depth + 1),
        );
      }
    if (json.extensions && json.extensions.length) type.extensions = json.extensions;
    if (json.reserved && json.reserved.length) type.reserved = json.reserved;
    if (json.group) type.group = true;
    if (json.comment) type.comment = json.comment;
    if (json.edition) type._edition = json.edition;
    type._defaultEdition = "proto3";
    return type;
  };
  Type.prototype.toJSON = function (toJSONOptions) {
    var inherited = Namespace.prototype.toJSON.call(this, toJSONOptions);
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      (inherited && inherited.options) || undefined,
      "oneofs",
      Namespace.arrayToJSON(this.oneofsArray, toJSONOptions),
      "fields",
      Namespace.arrayToJSON(
        this.fieldsArray.filter(function (obj) {
          return !obj.declaringField;
        }),
        toJSONOptions,
      ) || {},
      "extensions",
      this.extensions && this.extensions.length ? this.extensions : undefined,
      "reserved",
      this.reserved && this.reserved.length ? this.reserved : undefined,
      "group",
      this.group || undefined,
      "nested",
      (inherited && inherited.nested) || undefined,
      "comment",
      keepComments ? this.comment : undefined,
    ]);
  };
  Type.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    Namespace.prototype.resolveAll.call(this);
    var oneofs = this.oneofsArray;
    idx = 0;
    while (idx < oneofs.length) oneofs[idx++].resolve();
    var fields = this.fieldsArray;
    var idx = 0;
    while (idx < fields.length) fields[idx++].resolve();
    return this;
  };
  Type.prototype._resolveFeaturesRecursive = function (edition) {
    if (!this._needsRecursiveFeatureResolution) return this;
    edition = this._edition || edition;
    Namespace.prototype._resolveFeaturesRecursive.call(this, edition);
    this.oneofsArray.forEach((oneof) => {
      oneof._resolveFeatures(edition);
    });
    this.fieldsArray.forEach((field) => {
      field._resolveFeatures(edition);
    });
    return this;
  };
  Type.prototype.get = function (name) {
    if (Object.prototype.hasOwnProperty.call(this.fields, name)) return this.fields[name];
    if (this.oneofs && Object.prototype.hasOwnProperty.call(this.oneofs, name)) return this.oneofs[name];
    if (this.nested && Object.prototype.hasOwnProperty.call(this.nested, name)) return this.nested[name];
    return null;
  };
  Type.prototype.add = function (object) {
    if (this.get(object.name)) throw Error("duplicate name '" + object.name + "' in " + this);
    if (object instanceof Field && object.extend === undefined) {
      if (this._fieldsById ? this._fieldsById[object.id] : this.fieldsById[object.id])
        throw Error("duplicate id " + object.id + " in " + this);
      if (this.isReservedId(object.id)) throw Error("id " + object.id + " is reserved in " + this);
      if (this.isReservedName(object.name)) throw Error("name '" + object.name + "' is reserved in " + this);
      if (object.name === "__proto__") return this;
      if (object.parent) object.parent.remove(object);
      this.fields[object.name] = object;
      object.message = this;
      object.onAdd(this);
      return clearCache(this);
    }
    if (object instanceof OneOf) {
      if (object.name === "__proto__") return this;
      if (!this.oneofs) this.oneofs = {};
      this.oneofs[object.name] = object;
      object.onAdd(this);
      return clearCache(this);
    }
    return Namespace.prototype.add.call(this, object);
  };
  Type.prototype.remove = function (object) {
    if (object instanceof Field && object.extend === undefined) {
      if (!this.fields || this.fields[object.name] !== object)
        throw Error(object + " is not a member of " + this);
      delete this.fields[object.name];
      object.parent = null;
      object.onRemove(this);
      return clearCache(this);
    }
    if (object instanceof OneOf) {
      if (!this.oneofs || this.oneofs[object.name] !== object)
        throw Error(object + " is not a member of " + this);
      delete this.oneofs[object.name];
      object.parent = null;
      object.onRemove(this);
      return clearCache(this);
    }
    return Namespace.prototype.remove.call(this, object);
  };
  Type.prototype.isReservedId = function (id) {
    return Namespace.isReservedId(this.reserved, id);
  };
  Type.prototype.isReservedName = function (name) {
    return Namespace.isReservedName(this.reserved, name);
  };
  Type.prototype.create = function (properties) {
    return new this.ctor(properties);
  };
  Type.prototype.setup = function () {
    var fullName = this.fullName;
    var types = [];
    for (var idx = 0; idx < this.fieldsArray.length; ++idx)
      types.push(this._fieldsArray[idx].resolve().resolvedType);
    this.encode = encoder(this)({
      Writer,
      types,
      util,
    });
    this.decode = decoder(this)({
      Reader,
      types,
      util,
    });
    this.verify = verifier(this)({
      types,
      util,
    });
    this.fromObject = converter.fromObject(this)({
      types,
      util,
    });
    this.toObject = converter.toObject(this)({
      types,
      util,
    });
    var wrapper = wrappers[fullName];
    if (wrapper) {
      var originalThis = Object.create(this);
      originalThis.fromObject = this.fromObject;
      this.fromObject = wrapper.fromObject.bind(originalThis);
      originalThis.toObject = this.toObject;
      this.toObject = wrapper.toObject.bind(originalThis);
    }
    return this;
  };
  Type.prototype.encode = function (message, writer) {
    return this.setup().encode(message, writer);
  };
  Type.prototype.encodeDelimited = function (message, writer) {
    return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
  };
  Type.prototype.decode = function (reader, length, end, depth) {
    return this.setup().decode(reader, length, end, depth);
  };
  Type.prototype.decodeDelimited = function (reader) {
    if (!(reader instanceof Reader)) reader = Reader.create(reader);
    return this.decode(reader, reader.uint32());
  };
  Type.prototype.verify = function (message, depth) {
    return this.setup().verify(message, depth);
  };
  Type.prototype.fromObject = function (object, depth) {
    return this.setup().fromObject(object, depth);
  };
  Type.prototype.toObject = function (message, options) {
    return this.setup().toObject(message, options);
  };
  Type.d = function (typeName) {
    return function (target) {
      util.decorateType(target, typeName);
    };
  };
});
export { require_type };
