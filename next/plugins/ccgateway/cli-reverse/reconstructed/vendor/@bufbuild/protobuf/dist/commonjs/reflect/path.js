/**
 * @bufbuild/protobuf/dist/commonjs/reflect/path.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../../cjs/descriptors.js";

//@ chunk-qg41pqt6.js:353696-358746 cjs-fingerprint
var require_path = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InvalidPathError = undefined;
  cjsExports.buildPath = buildPath;
  cjsExports.parsePath = parsePath;
  cjsExports.pathToString = pathToString;
  var descriptors_js_1 = require_descriptors();
  function buildPath(schema) {
    return new PathBuilderImpl(schema, schema, []);
  }
  function parsePath(schema, path, options) {
    var _a;
    var _b;
    let builder = new PathBuilderImpl(schema, schema, []);
    let err = (message, i) => new InvalidPathError(schema, message + " at column " + (i + 1), path);
    for (let i = 0; i < path.length;) {
      let token = nextToken(i, path);
      let left = builder.getLeft();
      let right = undefined;
      if ("field" in token) {
        right =
          (left === null || left === undefined ? undefined : left.kind) != "message"
            ? undefined
            : (_a = left.fields.find((field) => field.name === token.field)) !== null && _a !== undefined
              ? _a
              : left.oneofs.find((oneof) => oneof.name === token.field);
        if (!right) throw err(`Unknown field "${token.field}"`, i);
      } else if ("ext" in token) {
        right =
          (_b = options === null || options === undefined ? undefined : options.registry) === null ||
          _b === undefined
            ? undefined
            : _b.getExtension(token.ext);
        if (!right) throw err(`Unknown extension "${token.ext}"`, i);
      } else if ("val" in token)
        right =
          (left === null || left === undefined ? undefined : left.kind) == "field" &&
          left.fieldKind == "list" &&
          typeof token.val == "bigint"
            ? {
                kind: "list_sub",
                index: Number(token.val),
              }
            : {
                kind: "map_sub",
                key: token.val,
              };
      else if ("err" in token) throw err(token.err, token.i);
      if (right)
        try {
          builder.add([right]);
        } catch (e) {
          throw err(e instanceof InvalidPathError ? e.message : String(e), i);
        }
      i = token.i;
    }
    return builder.toPath();
  }
  function pathToString(path) {
    let str = [];
    for (let ele of path)
      switch (ele.kind) {
        case "field":
        case "oneof":
          if (str.length > 0) str.push(".");
          str.push(ele.name);
          break;
        case "extension":
          str.push("[", ele.typeName, "]");
          break;
        case "list_sub":
          str.push("[", ele.index, "]");
          break;
        case "map_sub":
          if (typeof ele.key == "string")
            str.push(
              '["',
              ele.key
                .split("\\")
                .join("\\\\")
                .split('"')
                .join('\\"')
                .split("\r")
                .join("\\r")
                .split(
                  `
`,
                )
                .join("\\n"),
              '"]',
            );
          else str.push("[", ele.key, "]");
          break;
      }
    return str.join("");
  }
  class InvalidPathError extends Error {
    constructor(schema, message, path) {
      super(message);
      this.name = "InvalidPathError";
      this.schema = schema;
      this.path = path;
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
  cjsExports.InvalidPathError = InvalidPathError;
  class PathBuilderImpl {
    constructor(schema, left, path) {
      this.schema = schema;
      this.left = left;
      this.path = path;
    }
    getLeft() {
      return this.left;
    }
    field(field) {
      return this.push(field);
    }
    oneof(oneof) {
      return this.push(oneof);
    }
    extension(extension) {
      return this.push(extension);
    }
    list(index) {
      return this.push({
        kind: "list_sub",
        index,
      });
    }
    map(key) {
      return this.push({
        kind: "map_sub",
        key,
      });
    }
    add(pathOrBuilder) {
      let path = Array.isArray(pathOrBuilder) ? pathOrBuilder : pathOrBuilder.toPath();
      let l = this.path.length;
      try {
        for (let ele of path) this.push(ele);
      } catch (e) {
        this.path.splice(l);
        throw e;
      }
      return this;
    }
    toPath() {
      return this.path.concat();
    }
    clone() {
      return new PathBuilderImpl(this.schema, this.left, this.path.concat());
    }
    push(ele) {
      switch (ele.kind) {
        case "field":
          if (!this.left || this.left.kind != "message" || this.left.typeName != ele.parent.typeName)
            throw this.err("field access");
          this.path.push(ele);
          this.left =
            ele.fieldKind == "message"
              ? ele.message
              : ele.fieldKind == "list" || ele.fieldKind == "map"
                ? ele
                : undefined;
          return this;
        case "oneof":
          if (!this.left || this.left.kind != "message" || this.left.typeName != ele.parent.typeName)
            throw this.err("oneof access");
          this.path.push(ele);
          this.left = undefined;
          return this;
        case "extension":
          if (!this.left || this.left.kind != "message" || this.left.typeName != ele.extendee.typeName)
            throw this.err("extension access");
          this.path.push(ele);
          this.left = ele.fieldKind == "message" ? ele.message : undefined;
          return this;
        case "list_sub":
          if (!this.left || this.left.kind != "field" || this.left.fieldKind != "list")
            throw this.err("list access");
          if (ele.index < 0 || !Number.isInteger(ele.index)) throw this.err("list index");
          this.path.push(ele);
          this.left = this.left.listKind == "message" ? this.left.message : undefined;
          return this;
        case "map_sub":
          if (!this.left || this.left.kind != "field" || this.left.fieldKind != "map")
            throw this.err("map access");
          if (!checkKeyType(ele.key, this.left.mapKey)) throw this.err("map key");
          this.path.push(ele);
          this.left = this.left.mapKind == "message" ? this.left.message : undefined;
          return this;
      }
    }
    err(what) {
      return new InvalidPathError(this.schema, "Invalid " + what, this.path);
    }
  }
  function checkKeyType(key, type) {
    switch (type) {
      case descriptors_js_1.ScalarType.STRING:
        return typeof key == "string";
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.UINT32:
      case descriptors_js_1.ScalarType.SINT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.FIXED32:
        return typeof key == "number";
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        return typeof key == "bigint";
      case descriptors_js_1.ScalarType.BOOL:
        return typeof key == "boolean";
    }
  }
  function nextToken(i, path) {
    let re_extension = /^[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*$/;
    let re_field = /^[A-Za-z_][A-Za-z_0-9]*$/;
    if (path[i] == "[") {
      i++;
      while (path[i] == " ") i++;
      if (i >= path.length)
        return {
          err: "Premature end",
          i: path.length - 1,
        };
      let token;
      if (path[i] == '"') {
        i++;
        let val = "";
        for (;;) {
          if (path[i] == '"') {
            i++;
            break;
          }
          if (path[i] == "\\") {
            switch (path[i + 1]) {
              case '"':
              case "\\":
                val += path[i + 1];
                break;
              case "r":
                val += "\r";
                break;
              case "n":
                val += `
`;
                break;
              default:
                return {
                  err: "Invalid escape sequence",
                  i,
                };
            }
            i++;
          } else val += path[i];
          if (i >= path.length)
            return {
              err: "Premature end of string",
              i: path.length - 1,
            };
          i++;
        }
        token = {
          val,
        };
      } else if (path[i].match(/\d/)) {
        let start = i;
        while (i < path.length && /\d/.test(path[i])) i++;
        token = {
          val: BigInt(path.substring(start, i)),
        };
      } else if (path[i] == "]")
        return {
          err: "Premature ]",
          i,
        };
      else {
        let start = i;
        while (i < path.length && path[i] != " " && path[i] != "]") i++;
        let name = path.substring(start, i);
        if (name === "true")
          token = {
            val: true,
          };
        else if (name === "false")
          token = {
            val: false,
          };
        else if (re_extension.test(name))
          token = {
            ext: name,
          };
        else
          return {
            err: "Invalid ident",
            i: start,
          };
      }
      while (path[i] == " ") i++;
      if (path[i] != "]")
        return {
          err: "Missing ]",
          i,
        };
      i++;
      return Object.assign(Object.assign({}, token), {
        i,
      });
    }
    if (i > 0) {
      if (path[i] != ".")
        return {
          err: 'Expected "."',
          i,
        };
      i++;
    }
    let start = i;
    while (i < path.length && path[i] != "." && path[i] != "[") i++;
    let field = path.substring(start, i);
    return re_field.test(field)
      ? {
          field,
          i,
        }
      : {
          err: "Invalid ident",
          i: start,
        };
  }
});
export { require_path };
