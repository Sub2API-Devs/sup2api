/**
 * jsonc-parser/lib/esm/impl/edit.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonc-parser@3.2.1..3.3.1
 * pieces: chunk-kndsyy4v.js (3)
 * attribution: esm-fingerprint 3
 */
import { X, M } from "./parser.js";
import { P, Q } from "./format.js";

//@ chunk-kndsyy4v.js:12432-14948 esm-fingerprint
function ee(e, s, r, n) {
  let sliced = s.slice(),
    c = X(e, []),
    f = void 0,
    u = void 0;
  while (sliced.length > 0)
    if (((u = sliced.pop()), (f = M(c, sliced)), f === void 0 && r !== void 0))
      if (typeof u === "string") r = { [u]: r };
      else r = [r];
    else break;
  if (!f) {
    if (r === void 0) throw Error("Can not delete in empty document");
    return x(e, { offset: c ? c.offset : 0, length: c ? c.length : 0, content: JSON.stringify(r) }, n);
  } else if (f.type === "object" && typeof u === "string" && Array.isArray(f.children)) {
    let h = M(f, [u]);
    if (h !== void 0)
      if (r === void 0) {
        if (!h.parent) throw Error("Malformed AST");
        let index = f.children.indexOf(h.parent),
          k,
          y = h.parent.offset + h.parent.length;
        if (index > 0) {
          let T = f.children[index - 1];
          k = T.offset + T.length;
        } else if (((k = f.offset + 1), f.children.length > 1)) y = f.children[1].offset;
        return x(e, { offset: k, length: y - k, content: "" }, n);
      } else return x(e, { offset: h.offset, length: h.length, content: JSON.stringify(r) }, n);
    else {
      if (r === void 0) return [];
      let p = `${JSON.stringify(u)}: ${JSON.stringify(r)}`,
        k = n.getInsertionIndex
          ? n.getInsertionIndex(f.children.map((T) => T.children[0].value))
          : f.children.length,
        y;
      if (k > 0) {
        let T = f.children[k - 1];
        y = { offset: T.offset + T.length, length: 0, content: "," + p };
      } else if (f.children.length === 0) y = { offset: f.offset + 1, length: 0, content: p };
      else y = { offset: f.offset + 1, length: 0, content: p + "," };
      return x(e, y, n);
    }
  } else if (f.type === "array" && typeof u === "number" && Array.isArray(f.children)) {
    let h = u;
    if (h === -1) {
      let p = `${JSON.stringify(r)}`,
        k;
      if (f.children.length === 0) k = { offset: f.offset + 1, length: 0, content: p };
      else {
        let y = f.children[f.children.length - 1];
        k = { offset: y.offset + y.length, length: 0, content: "," + p };
      }
      return x(e, k, n);
    } else if (r === void 0 && f.children.length >= 0) {
      let p = u,
        k = f.children[p],
        y;
      if (f.children.length === 1) y = { offset: f.offset + 1, length: f.length - 2, content: "" };
      else if (f.children.length - 1 === p) {
        let T = f.children[p - 1],
          w = T.offset + T.length,
          v = f.offset + f.length;
        y = { offset: w, length: v - 2 - w, content: "" };
      } else y = { offset: k.offset, length: f.children[p + 1].offset - k.offset, content: "" };
      return x(e, y, n);
    } else if (r !== void 0) {
      let p,
        k = `${JSON.stringify(r)}`;
      if (!n.isArrayInsertion && f.children.length > u) {
        let y = f.children[u];
        p = { offset: y.offset, length: y.length, content: k };
      } else if (f.children.length === 0 || u === 0)
        p = { offset: f.offset + 1, length: 0, content: f.children.length === 0 ? k : k + "," };
      else {
        let y = u > f.children.length ? f.children.length : u,
          T = f.children[y - 1];
        p = { offset: T.offset + T.length, length: 0, content: "," + k };
      }
      return x(e, p, n);
    } else
      throw Error(
        `Can not ${r === void 0 ? "remove" : n.isArrayInsertion ? "insert" : "modify"} Array index ${h} as length is not sufficient`,
      );
  } else
    throw Error(`Can not add ${typeof u !== "number" ? "index" : "property"} to parent of type ${f.type}`);
}
//@ chunk-kndsyy4v.js:14948-15435 esm-fingerprint
function x(e, s, r) {
  if (!r.formattingOptions) return [s];
  let n = R(e, s),
    offset = s.offset,
    o = s.offset + s.content.length;
  if (s.length === 0 || s.content.length === 0) {
    while (offset > 0 && !P(n, offset - 1)) offset--;
    while (o < n.length && !P(n, o)) o++;
  }
  let c = Q(n, { offset: offset, length: o - offset }, { ...r.formattingOptions, keepLines: !1 });
  for (let u = c.length - 1; u >= 0; u--) {
    let h = c[u];
    ((n = R(n, h)),
      (offset = Math.min(offset, h.offset)),
      (o = Math.max(o, h.offset + h.length)),
      (o += h.content.length - h.length));
  }
  let f = e.length - (n.length - o) - offset;
  return [{ offset: offset, length: f, content: n.substring(offset, o) }];
}
//@ chunk-kndsyy4v.js:15435-15523 esm-fingerprint
function R(e, s) {
  return e.substring(0, s.offset) + s.content + e.substring(s.offset + s.length);
}

export { ee, R };
