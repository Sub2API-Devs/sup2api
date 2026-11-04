/**
 * protobufjs/src/mapfield.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";
import { Yt } from "./field.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:85940-86966 cjs-fingerprint
var Ts = x(function (cjsExports, cjsModule) {
  cjsModule.exports = MapField;
  var Field = Yt();
  ((MapField.prototype = Object.create(Field.prototype)).constructor = MapField).className = "MapField";
  var types = Cr();
  var util = de();
  function MapField(name, id, keyType, type, options, comment) {
    Field.call(this, name, id, type, undefined, undefined, options, comment);
    if (!util.isString(keyType)) throw TypeError("keyType must be a string");
    this.keyType = keyType;
    this.resolvedKeyType = null;
    this.map = true;
  }
  MapField.fromJSON = function (name, json) {
    return new MapField(name, json.id, json.keyType, json.type, json.options, json.comment);
  };
  MapField.prototype.toJSON = function (toJSONOptions) {
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "keyType",
      this.keyType,
      "type",
      this.type,
      "id",
      this.id,
      "extend",
      this.extend,
      "options",
      this.options,
      "comment",
      keepComments ? this.comment : undefined,
    ]);
  };
  MapField.prototype.resolve = function () {
    if (this.resolved) return this;
    if (types.mapKey[this.keyType] === undefined) throw Error("invalid key type: " + this.keyType);
    return Field.prototype.resolve.call(this);
  };
  MapField.d = function (fieldId, fieldKeyType, fieldValueType) {
    if (typeof fieldValueType === "function") fieldValueType = util.decorateType(fieldValueType).name;
    else if (fieldValueType && typeof fieldValueType === "object")
      fieldValueType = util.decorateEnum(fieldValueType).name;
    return function (prototype, fieldName) {
      util
        .decorateType(prototype.constructor)
        .add(new MapField(fieldName, fieldId, fieldKeyType, fieldValueType));
    };
  };
});
export { Ts };
