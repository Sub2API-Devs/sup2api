/**
 * @bufbuild/protobuf/dist/commonjs/reflect/path.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ns } from "../../cjs/descriptors.js";

//@ chunk-fq0cr76a.js:353129-358179 cjs-fingerprint
var Dk = x(function (Nk) {
  Object.defineProperty(Nk, "__esModule", { value: !0 });
  Nk.InvalidPathError = void 0;
  Nk.buildPath = OY;
  Nk.parsePath = PY;
  Nk.pathToString = LY;
  var Br = Ns();
  function OY(e) {
    return new $g(e, e, []);
  }
  function PY(e, n, r) {
    var s, h;
    let y = new $g(e, e, []),
      b = (S, w) => new InvalidPathError(e, S + " at column " + (w + 1), n);
    for (let S = 0; S < n.length;) {
      let w = UY(S, n),
        left = y.getLeft(),
        D = void 0;
      if ("field" in w) {
        if (
          ((D =
            (left === null || left === void 0 ? void 0 : left.kind) != "message"
              ? void 0
              : (s = left.fields.find((field) => field.name === w.field)) !== null && s !== void 0
                ? s
                : left.oneofs.find((oneof) => oneof.name === w.field)),
          !D)
        )
          throw b(`Unknown field "${w.field}"`, S);
      } else if ("ext" in w) {
        if (
          ((D =
            (h = r === null || r === void 0 ? void 0 : r.registry) === null || h === void 0
              ? void 0
              : h.getExtension(w.ext)),
          !D)
        )
          throw b(`Unknown extension "${w.ext}"`, S);
      } else if ("val" in w)
        D =
          (left === null || left === void 0 ? void 0 : left.kind) == "field" &&
          left.fieldKind == "list" &&
          typeof w.val == "bigint"
            ? { kind: "list_sub", index: Number(w.val) }
            : { kind: "map_sub", key: w.val };
      else if ("err" in w) throw b(w.err, w.i);
      if (D)
        try {
          y.add([D]);
        } catch (error) {
          throw b(error instanceof InvalidPathError ? error.message : String(error), S);
        }
      S = w.i;
    }
    return y.toPath();
  }
  function LY(e) {
    let n = [];
    for (let r of e)
      switch (r.kind) {
        case "field":
        case "oneof":
          if (n.length > 0) n.push(".");
          n.push(r.name);
          break;
        case "extension":
          n.push("[", r.typeName, "]");
          break;
        case "list_sub":
          n.push("[", r.index, "]");
          break;
        case "map_sub":
          if (typeof r.key == "string")
            n.push(
              '["',
              r.key
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
          else n.push("[", r.key, "]");
          break;
      }
    return n.join("");
  }
  class InvalidPathError extends Error {
    constructor(e, n, r) {
      super(n);
      ((this.name = "InvalidPathError"),
        (this.schema = e),
        (this.path = r),
        Object.setPrototypeOf(this, new.target.prototype));
    }
  }
  Nk.InvalidPathError = InvalidPathError;
  class $g {
    constructor(e, n, r) {
      ((this.schema = e), (this.left = n), (this.path = r));
    }
    getLeft() {
      return this.left;
    }
    field(e) {
      return this.push(e);
    }
    oneof(e) {
      return this.push(e);
    }
    extension(e) {
      return this.push(e);
    }
    list(e) {
      return this.push({ kind: "list_sub", index: e });
    }
    map(e) {
      return this.push({ kind: "map_sub", key: e });
    }
    add(e) {
      let n = Array.isArray(e) ? e : e.toPath(),
        r = this.path.length;
      try {
        for (let s of n) this.push(s);
      } catch (error) {
        throw (this.path.splice(r), error);
      }
      return this;
    }
    toPath() {
      return this.path.concat();
    }
    clone() {
      return new $g(this.schema, this.left, this.path.concat());
    }
    push(e) {
      switch (e.kind) {
        case "field":
          if (!this.left || this.left.kind != "message" || this.left.typeName != e.parent.typeName)
            throw this.err("field access");
          return (
            this.path.push(e),
            (this.left =
              e.fieldKind == "message"
                ? e.message
                : e.fieldKind == "list" || e.fieldKind == "map"
                  ? e
                  : void 0),
            this
          );
        case "oneof":
          if (!this.left || this.left.kind != "message" || this.left.typeName != e.parent.typeName)
            throw this.err("oneof access");
          return (this.path.push(e), (this.left = void 0), this);
        case "extension":
          if (!this.left || this.left.kind != "message" || this.left.typeName != e.extendee.typeName)
            throw this.err("extension access");
          return (this.path.push(e), (this.left = e.fieldKind == "message" ? e.message : void 0), this);
        case "list_sub":
          if (!this.left || this.left.kind != "field" || this.left.fieldKind != "list")
            throw this.err("list access");
          if (e.index < 0 || !Number.isInteger(e.index)) throw this.err("list index");
          return (
            this.path.push(e),
            (this.left = this.left.listKind == "message" ? this.left.message : void 0),
            this
          );
        case "map_sub":
          if (!this.left || this.left.kind != "field" || this.left.fieldKind != "map")
            throw this.err("map access");
          if (!BY(e.key, this.left.mapKey)) throw this.err("map key");
          return (
            this.path.push(e),
            (this.left = this.left.mapKind == "message" ? this.left.message : void 0),
            this
          );
      }
    }
    err(e) {
      return new InvalidPathError(this.schema, "Invalid " + e, this.path);
    }
  }
  function BY(e, n) {
    switch (n) {
      case Br.ScalarType.STRING:
        return typeof e == "string";
      case Br.ScalarType.INT32:
      case Br.ScalarType.UINT32:
      case Br.ScalarType.SINT32:
      case Br.ScalarType.SFIXED32:
      case Br.ScalarType.FIXED32:
        return typeof e == "number";
      case Br.ScalarType.UINT64:
      case Br.ScalarType.INT64:
      case Br.ScalarType.FIXED64:
      case Br.ScalarType.SFIXED64:
      case Br.ScalarType.SINT64:
        return typeof e == "bigint";
      case Br.ScalarType.BOOL:
        return typeof e == "boolean";
    }
  }
  function UY(e, n) {
    let r = /^[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*$/,
      s = /^[A-Za-z_][A-Za-z_0-9]*$/;
    if (n[e] == "[") {
      e++;
      while (n[e] == " ") e++;
      if (e >= n.length) return { err: "Premature end", i: n.length - 1 };
      let b;
      if (n[e] == '"') {
        e++;
        let S = "";
        for (;;) {
          if (n[e] == '"') {
            e++;
            break;
          }
          if (n[e] == "\\") {
            switch (n[e + 1]) {
              case '"':
              case "\\":
                S += n[e + 1];
                break;
              case "r":
                S += "\r";
                break;
              case "n":
                S += `
`;
                break;
              default:
                return { err: "Invalid escape sequence", i: e };
            }
            e++;
          } else S += n[e];
          if (e >= n.length) return { err: "Premature end of string", i: n.length - 1 };
          e++;
        }
        b = { val: S };
      } else if (n[e].match(/\d/)) {
        let S = e;
        while (e < n.length && /\d/.test(n[e])) e++;
        b = { val: BigInt(n.substring(S, e)) };
      } else if (n[e] == "]") return { err: "Premature ]", i: e };
      else {
        let S = e;
        while (e < n.length && n[e] != " " && n[e] != "]") e++;
        let substring = n.substring(S, e);
        if (substring === "true") b = { val: !0 };
        else if (substring === "false") b = { val: !1 };
        else if (r.test(substring)) b = { ext: substring };
        else return { err: "Invalid ident", i: S };
      }
      while (n[e] == " ") e++;
      if (n[e] != "]") return { err: "Missing ]", i: e };
      return (e++, Object.assign(Object.assign({}, b), { i: e }));
    }
    if (e > 0) {
      if (n[e] != ".") return { err: 'Expected "."', i: e };
      e++;
    }
    let h = e;
    while (e < n.length && n[e] != "." && n[e] != "[") e++;
    let substring = n.substring(h, e);
    return s.test(substring) ? { field: substring, i: e } : { err: "Invalid ident", i: h };
  }
});

export { Dk };
