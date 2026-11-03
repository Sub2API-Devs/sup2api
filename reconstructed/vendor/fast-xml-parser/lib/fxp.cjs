/**
 * fast-xml-parser/lib/fxp.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-xml-parser@5.5.8..5.5.9
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:26640-73699 cjs-fingerprint
var Es = x(function (Eh, ys) {
  (() => {
    var e = {
        d: (n, i) => {
          for (var key in i)
            e.o(i, key) && !e.o(n, key) && Object.defineProperty(n, key, { enumerable: !0, get: i[key] });
        },
        o: (n, i) => Object.prototype.hasOwnProperty.call(n, i),
        r: (n) => {
          (typeof Symbol < "u" &&
            Symbol.toStringTag &&
            Object.defineProperty(n, Symbol.toStringTag, { value: "Module" }),
            Object.defineProperty(n, "__esModule", { value: !0 }));
        },
      },
      t = {};
    (e.r(t), e.d(t, { XMLBuilder: () => to, XMLParser: () => Mr, XMLValidator: () => ro }));
    let r =
        ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD",
      regExp = new RegExp("^[" + r + "][" + r + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
    function o(n, i) {
      let u = [],
        match = i.exec(n);
      for (; match;) {
        let p = [];
        p.startIndex = i.lastIndex - match[0].length;
        let h = match.length;
        for (let S = 0; S < h; S++) p.push(match[S]);
        (u.push(p), (match = i.exec(n)));
      }
      return u;
    }
    let a = function (n) {
        return regExp.exec(n) != null;
      },
      c = [
        "hasOwnProperty",
        "toString",
        "valueOf",
        "__defineGetter__",
        "__defineSetter__",
        "__lookupGetter__",
        "__lookupSetter__",
      ],
      d = ["__proto__", "constructor", "prototype"],
      f = { allowBooleanAttributes: !1, unpairedTags: [] };
    function m(n, i) {
      i = Object.assign({}, f, i);
      let u = [],
        l = !1,
        p = !1;
      n[0] === "\uFEFF" && (n = n.substr(1));
      for (let h = 0; h < n.length; h++)
        if (n[h] === "<" && n[h + 1] === "?") {
          if (((h += 2), (h = N(n, h)), h.err)) return h;
        } else {
          if (n[h] !== "<") {
            if (y(n[h])) continue;
            return M("InvalidChar", "char '" + n[h] + "' is not expected.", q(n, h));
          }
          {
            let S = h;
            if ((h++, n[h] === "!")) {
              h = b(n, h);
              continue;
            }
            {
              let g = !1;
              n[h] === "/" && ((g = !0), h++);
              let E = "";
              for (
                ;
                h < n.length &&
                n[h] !== ">" &&
                n[h] !== " " &&
                n[h] !== "\t" &&
                n[h] !==
                  `
` &&
                n[h] !== "\r";
                h++
              )
                E += n[h];
              if (
                ((E = E.trim()), E[E.length - 1] === "/" && ((E = E.substring(0, E.length - 1)), h--), !Pe(E))
              ) {
                let C;
                return (
                  (C =
                    E.trim().length === 0
                      ? "Invalid space after '<'."
                      : "Tag '" + E + "' is an invalid name."),
                  M("InvalidTag", C, q(n, h))
                );
              }
              let w = I(n, h);
              if (w === !1) return M("InvalidAttr", "Attributes for '" + E + "' have open quote.", q(n, h));
              let A = w.value;
              if (((h = w.index), A[A.length - 1] === "/")) {
                let C = h - A.length;
                A = A.substring(0, A.length - 1);
                let z = v(A, i);
                if (z !== !0) return M(z.err.code, z.err.msg, q(n, C + z.err.line));
                l = !0;
              } else if (g) {
                if (!w.tagClosed)
                  return M("InvalidTag", "Closing tag '" + E + "' doesn't have proper closing.", q(n, h));
                if (A.trim().length > 0)
                  return M(
                    "InvalidTag",
                    "Closing tag '" + E + "' can't have attributes or invalid starting.",
                    q(n, S),
                  );
                if (u.length === 0)
                  return M("InvalidTag", "Closing tag '" + E + "' has not been opened.", q(n, S));
                {
                  let C = u.pop();
                  if (E !== C.tagName) {
                    let z = q(n, C.tagStartPos);
                    return M(
                      "InvalidTag",
                      "Expected closing tag '" +
                        C.tagName +
                        "' (opened in line " +
                        z.line +
                        ", col " +
                        z.col +
                        ") instead of closing tag '" +
                        E +
                        "'.",
                      q(n, S),
                    );
                  }
                  u.length == 0 && (p = !0);
                }
              } else {
                let C = v(A, i);
                if (C !== !0) return M(C.err.code, C.err.msg, q(n, h - A.length + C.err.line));
                if (p === !0) return M("InvalidXml", "Multiple possible root nodes found.", q(n, h));
                (i.unpairedTags.indexOf(E) !== -1 || u.push({ tagName: E, tagStartPos: S }), (l = !0));
              }
              for (h++; h < n.length; h++)
                if (n[h] === "<") {
                  if (n[h + 1] === "!") {
                    (h++, (h = b(n, h)));
                    continue;
                  }
                  if (n[h + 1] !== "?") break;
                  if (((h = N(n, ++h)), h.err)) return h;
                } else if (n[h] === "&") {
                  let C = W(n, h);
                  if (C == -1) return M("InvalidChar", "char '&' is not expected.", q(n, h));
                  h = C;
                } else if (p === !0 && !y(n[h])) return M("InvalidXml", "Extra text at the end", q(n, h));
              n[h] === "<" && h--;
            }
          }
        }
      return l
        ? u.length == 1
          ? M("InvalidTag", "Unclosed tag '" + u[0].tagName + "'.", q(n, u[0].tagStartPos))
          : !(u.length > 0) ||
            M(
              "InvalidXml",
              "Invalid '" +
                JSON.stringify(
                  u.map((h) => h.tagName),
                  null,
                  4,
                ).replace(/\r?\n/g, "") +
                "' found.",
              { line: 1, col: 1 },
            )
        : M("InvalidXml", "Start tag expected.", 1);
    }
    function y(n) {
      return (
        n === " " ||
        n === "\t" ||
        n ===
          `
` ||
        n === "\r"
      );
    }
    function N(n, i) {
      let u = i;
      for (; i < n.length; i++)
        if (n[i] == "?" || n[i] == " ") {
          let substr = n.substr(u, i - u);
          if (i > 5 && substr === "xml")
            return M("InvalidXml", "XML declaration allowed only at the start of the document.", q(n, i));
          if (n[i] == "?" && n[i + 1] == ">") {
            i++;
            break;
          }
          continue;
        }
      return i;
    }
    function b(n, i) {
      if (n.length > i + 5 && n[i + 1] === "-" && n[i + 2] === "-") {
        for (i += 3; i < n.length; i++)
          if (n[i] === "-" && n[i + 1] === "-" && n[i + 2] === ">") {
            i += 2;
            break;
          }
      } else if (
        n.length > i + 8 &&
        n[i + 1] === "D" &&
        n[i + 2] === "O" &&
        n[i + 3] === "C" &&
        n[i + 4] === "T" &&
        n[i + 5] === "Y" &&
        n[i + 6] === "P" &&
        n[i + 7] === "E"
      ) {
        let u = 1;
        for (i += 8; i < n.length; i++)
          if (n[i] === "<") u++;
          else if (n[i] === ">" && (u--, u === 0)) break;
      } else if (
        n.length > i + 9 &&
        n[i + 1] === "[" &&
        n[i + 2] === "C" &&
        n[i + 3] === "D" &&
        n[i + 4] === "A" &&
        n[i + 5] === "T" &&
        n[i + 6] === "A" &&
        n[i + 7] === "["
      ) {
        for (i += 8; i < n.length; i++)
          if (n[i] === "]" && n[i + 1] === "]" && n[i + 2] === ">") {
            i += 2;
            break;
          }
      }
      return i;
    }
    let T = '"',
      _ = "'";
    function I(n, i) {
      let u = "",
        l = "",
        p = !1;
      for (; i < n.length; i++) {
        if (n[i] === T || n[i] === _) l === "" ? (l = n[i]) : l !== n[i] || (l = "");
        else if (n[i] === ">" && l === "") {
          p = !0;
          break;
        }
        u += n[i];
      }
      return l === "" && { value: u, index: i, tagClosed: p };
    }
    let regExp_2 = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function v(n, i) {
      let u = o(n, regExp_2),
        l = {};
      for (let p = 0; p < u.length; p++) {
        if (u[p][1].length === 0)
          return M("InvalidAttr", "Attribute '" + u[p][2] + "' has no space in starting.", K(u[p]));
        if (u[p][3] !== void 0 && u[p][4] === void 0)
          return M("InvalidAttr", "Attribute '" + u[p][2] + "' is without value.", K(u[p]));
        if (u[p][3] === void 0 && !i.allowBooleanAttributes)
          return M("InvalidAttr", "boolean attribute '" + u[p][2] + "' is not allowed.", K(u[p]));
        let h = u[p][2];
        if (!ee(h)) return M("InvalidAttr", "Attribute '" + h + "' is an invalid name.", K(u[p]));
        if (Object.prototype.hasOwnProperty.call(l, h))
          return M("InvalidAttr", "Attribute '" + h + "' is repeated.", K(u[p]));
        l[h] = 1;
      }
      return !0;
    }
    function W(n, i) {
      if (n[++i] === ";") return -1;
      if (n[i] === "#")
        return (function (l, p) {
          let h = /\d/;
          for (l[p] === "x" && (p++, (h = /[\da-fA-F]/)); p < l.length; p++) {
            if (l[p] === ";") return p;
            if (!l[p].match(h)) break;
          }
          return -1;
        })(n, ++i);
      let u = 0;
      for (; i < n.length; i++, u++)
        if (!(n[i].match(/\w/) && u < 20)) {
          if (n[i] === ";") break;
          return -1;
        }
      return i;
    }
    function M(n, i, u) {
      return { err: { code: n, msg: i, line: u.line || u, col: u.col } };
    }
    function ee(n) {
      return a(n);
    }
    function Pe(n) {
      return a(n);
    }
    function q(n, i) {
      let parts = n.substring(0, i).split(/\r?\n/);
      return { line: parts.length, col: parts[parts.length - 1].length + 1 };
    }
    function K(n) {
      return n.startIndex + n[1].length;
    }
    let Nr = (n) => (c.includes(n) ? "__" + n : n),
      xi = {
        preserveOrder: !1,
        attributeNamePrefix: "@_",
        attributesGroupName: !1,
        textNodeName: "#text",
        ignoreAttributes: !0,
        removeNSPrefix: !1,
        allowBooleanAttributes: !1,
        parseTagValue: !0,
        parseAttributeValue: !1,
        trimValues: !0,
        cdataPropName: !1,
        numberParseOptions: { hex: !0, leadingZeros: !0, eNotation: !0 },
        tagValueProcessor: function (n, i) {
          return i;
        },
        attributeValueProcessor: function (n, i) {
          return i;
        },
        stopNodes: [],
        alwaysCreateTextNode: !1,
        isArray: () => !1,
        commentPropName: !1,
        unpairedTags: [],
        processEntities: !0,
        htmlEntities: !1,
        ignoreDeclaration: !1,
        ignorePiTags: !1,
        transformTagName: !1,
        transformAttributeName: !1,
        updateTag: function (n, i, u) {
          return n;
        },
        captureMetaData: !1,
        maxNestedTags: 100,
        strictReservedNames: !0,
        jPath: !0,
        onDangerousProperty: Nr,
      };
    function bi(n, i) {
      if (typeof n != "string") return;
      let lower = n.toLowerCase();
      if (c.some((l) => lower === l.toLowerCase()))
        throw Error(
          `[SECURITY] Invalid ${i}: "${n}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
      if (d.some((l) => lower === l.toLowerCase()))
        throw Error(
          `[SECURITY] Invalid ${i}: "${n}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
    }
    function Tr(n) {
      return typeof n == "boolean"
        ? {
            enabled: n,
            maxEntitySize: 1e4,
            maxExpansionDepth: 10,
            maxTotalExpansions: 1000,
            maxExpandedLength: 1e5,
            maxEntityCount: 100,
            allowedTags: null,
            tagFilter: null,
          }
        : typeof n == "object" && n !== null
          ? {
              enabled: n.enabled !== !1,
              maxEntitySize: Math.max(1, n.maxEntitySize ?? 1e4),
              maxExpansionDepth: Math.max(1, n.maxExpansionDepth ?? 10),
              maxTotalExpansions: Math.max(1, n.maxTotalExpansions ?? 1000),
              maxExpandedLength: Math.max(1, n.maxExpandedLength ?? 1e5),
              maxEntityCount: Math.max(1, n.maxEntityCount ?? 100),
              allowedTags: n.allowedTags ?? null,
              tagFilter: n.tagFilter ?? null,
            }
          : Tr(!0);
    }
    let Ni = function (n) {
        let merged = Object.assign({}, xi, n),
          u = [
            { value: merged.attributeNamePrefix, name: "attributeNamePrefix" },
            { value: merged.attributesGroupName, name: "attributesGroupName" },
            { value: merged.textNodeName, name: "textNodeName" },
            { value: merged.cdataPropName, name: "cdataPropName" },
            { value: merged.commentPropName, name: "commentPropName" },
          ];
        for (let { value: l, name: p } of u) l && bi(l, p);
        return (
          merged.onDangerousProperty === null && (merged.onDangerousProperty = Nr),
          (merged.processEntities = Tr(merged.processEntities)),
          merged.stopNodes &&
            Array.isArray(merged.stopNodes) &&
            (merged.stopNodes = merged.stopNodes.map((stopNode) =>
              typeof stopNode == "string" && stopNode.startsWith("*.")
                ? ".." + stopNode.substring(2)
                : stopNode,
            )),
          merged
        );
      },
      pt;
    pt = typeof Symbol != "function" ? "@@xmlMetadata" : Symbol("XML Node Metadata");
    class oe {
      constructor(n) {
        ((this.tagname = n), (this.child = []), (this[":@"] = Object.create(null)));
      }
      add(n, i) {
        (n === "__proto__" && (n = "#__proto__"), this.child.push({ [n]: i }));
      }
      addChild(n, i) {
        (n.tagname === "__proto__" && (n.tagname = "#__proto__"),
          n[":@"] && Object.keys(n[":@"]).length > 0
            ? this.child.push({ [n.tagname]: n.child, ":@": n[":@"] })
            : this.child.push({ [n.tagname]: n.child }),
          i !== void 0 && (this.child[this.child.length - 1][pt] = { startIndex: i }));
      }
      static getMetaDataSymbol() {
        return pt;
      }
    }
    class _r {
      constructor(n) {
        ((this.suppressValidationErr = !n), (this.options = n));
      }
      readDocType(n, i) {
        let create = Object.create(null),
          l = 0;
        if (
          n[i + 3] !== "O" ||
          n[i + 4] !== "C" ||
          n[i + 5] !== "T" ||
          n[i + 6] !== "Y" ||
          n[i + 7] !== "P" ||
          n[i + 8] !== "E"
        )
          throw Error("Invalid Tag instead of DOCTYPE");
        {
          i += 9;
          let p = 1,
            h = !1,
            S = !1,
            g = "";
          for (; i < n.length; i++)
            if (n[i] !== "<" || S)
              if (n[i] === ">") {
                if ((S ? n[i - 1] === "-" && n[i - 2] === "-" && ((S = !1), p--) : p--, p === 0)) break;
              } else n[i] === "[" ? (h = !0) : (g += n[i]);
            else {
              if (h && we(n, "!ENTITY", i)) {
                let E, w;
                if (
                  ((i += 7),
                  ([E, w, i] = this.readEntityExp(n, i + 1, this.suppressValidationErr)),
                  w.indexOf("&") === -1)
                ) {
                  if (
                    this.options.enabled !== !1 &&
                    this.options.maxEntityCount != null &&
                    l >= this.options.maxEntityCount
                  )
                    throw Error(
                      `Entity count (${l + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`,
                    );
                  let replaced = E.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  ((create[E] = { regx: RegExp(`&${replaced};`, "g"), val: w }), l++);
                }
              } else if (h && we(n, "!ELEMENT", i)) {
                i += 8;
                let { index: index } = this.readElementExp(n, i + 1);
                i = index;
              } else if (h && we(n, "!ATTLIST", i)) i += 8;
              else if (h && we(n, "!NOTATION", i)) {
                i += 9;
                let { index: index } = this.readNotationExp(n, i + 1, this.suppressValidationErr);
                i = index;
              } else {
                if (!we(n, "!--", i)) throw Error("Invalid DOCTYPE");
                S = !0;
              }
              (p++, (g = ""));
            }
          if (p !== 0) throw Error("Unclosed DOCTYPE");
        }
        return { entities: create, i };
      }
      readEntityExp(n, i) {
        let u = (i = J(n, i));
        for (; i < n.length && !/\s/.test(n[i]) && n[i] !== '"' && n[i] !== "'";) i++;
        let substring = n.substring(u, i);
        if ((ke(substring), (i = J(n, i)), !this.suppressValidationErr)) {
          if (n.substring(i, i + 6).toUpperCase() === "SYSTEM")
            throw Error("External entities are not supported");
          if (n[i] === "%") throw Error("Parameter entities are not supported");
        }
        let p = "";
        if (
          (([i, p] = this.readIdentifierVal(n, i, "entity")),
          this.options.enabled !== !1 &&
            this.options.maxEntitySize != null &&
            p.length > this.options.maxEntitySize)
        )
          throw Error(
            `Entity "${substring}" size (${p.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`,
          );
        return [substring, p, --i];
      }
      readNotationExp(n, i) {
        let u = (i = J(n, i));
        for (; i < n.length && !/\s/.test(n[i]);) i++;
        let substring = n.substring(u, i);
        (!this.suppressValidationErr && ke(substring), (i = J(n, i)));
        let upper = n.substring(i, i + 6).toUpperCase();
        if (!this.suppressValidationErr && upper !== "SYSTEM" && upper !== "PUBLIC")
          throw Error(`Expected SYSTEM or PUBLIC, found "${upper}"`);
        ((i += upper.length), (i = J(n, i)));
        let h = null,
          S = null;
        if (upper === "PUBLIC")
          (([i, h] = this.readIdentifierVal(n, i, "publicIdentifier")),
            (n[(i = J(n, i))] !== '"' && n[i] !== "'") ||
              ([i, S] = this.readIdentifierVal(n, i, "systemIdentifier")));
        else if (
          upper === "SYSTEM" &&
          (([i, S] = this.readIdentifierVal(n, i, "systemIdentifier")), !this.suppressValidationErr && !S)
        )
          throw Error("Missing mandatory system identifier for SYSTEM notation");
        return { notationName: substring, publicIdentifier: h, systemIdentifier: S, index: --i };
      }
      readIdentifierVal(n, i, u) {
        let l = "",
          p = n[i];
        if (p !== '"' && p !== "'") throw Error(`Expected quoted string, found "${p}"`);
        let h = ++i;
        for (; i < n.length && n[i] !== p;) i++;
        if (((l = n.substring(h, i)), n[i] !== p)) throw Error(`Unterminated ${u} value`);
        return [++i, l];
      }
      readElementExp(n, i) {
        let u = (i = J(n, i));
        for (; i < n.length && !/\s/.test(n[i]);) i++;
        let substring = n.substring(u, i);
        if (!this.suppressValidationErr && !a(substring)) throw Error(`Invalid element name: "${substring}"`);
        let p = "";
        if (n[(i = J(n, i))] === "E" && we(n, "MPTY", i)) i += 4;
        else if (n[i] === "A" && we(n, "NY", i)) i += 2;
        else if (n[i] === "(") {
          let h = ++i;
          for (; i < n.length && n[i] !== ")";) i++;
          if (((p = n.substring(h, i)), n[i] !== ")")) throw Error("Unterminated content model");
        } else if (!this.suppressValidationErr) throw Error(`Invalid Element Expression, found "${n[i]}"`);
        return { elementName: substring, contentModel: p.trim(), index: i };
      }
      readAttlistExp(n, i) {
        let u = (i = J(n, i));
        for (; i < n.length && !/\s/.test(n[i]);) i++;
        let substring = n.substring(u, i);
        for (ke(substring), u = i = J(n, i); i < n.length && !/\s/.test(n[i]);) i++;
        let substring_2 = n.substring(u, i);
        if (!ke(substring_2)) throw Error(`Invalid attribute name: "${substring_2}"`);
        i = J(n, i);
        let h = "";
        if (n.substring(i, i + 8).toUpperCase() === "NOTATION") {
          if (((h = "NOTATION"), n[(i = J(n, (i += 8)))] !== "("))
            throw Error(`Expected '(', found "${n[i]}"`);
          i++;
          let g = [];
          for (; i < n.length && n[i] !== ")";) {
            let E = i;
            for (; i < n.length && n[i] !== "|" && n[i] !== ")";) i++;
            let substring = n.substring(E, i);
            if (((substring = substring.trim()), !ke(substring)))
              throw Error(`Invalid notation name: "${substring}"`);
            (g.push(substring), n[i] === "|" && (i++, (i = J(n, i))));
          }
          if (n[i] !== ")") throw Error("Unterminated list of notations");
          (i++, (h += " (" + g.join("|") + ")"));
        } else {
          let g = i;
          for (; i < n.length && !/\s/.test(n[i]);) i++;
          h += n.substring(g, i);
          let E = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
          if (!this.suppressValidationErr && !E.includes(h.toUpperCase()))
            throw Error(`Invalid attribute type: "${h}"`);
        }
        i = J(n, i);
        let S = "";
        return (
          n.substring(i, i + 8).toUpperCase() === "#REQUIRED"
            ? ((S = "#REQUIRED"), (i += 8))
            : n.substring(i, i + 7).toUpperCase() === "#IMPLIED"
              ? ((S = "#IMPLIED"), (i += 7))
              : ([i, S] = this.readIdentifierVal(n, i, "ATTLIST")),
          { elementName: substring, attributeName: substring_2, attributeType: h, defaultValue: S, index: i }
        );
      }
    }
    let J = (n, i) => {
      for (; i < n.length && /\s/.test(n[i]);) i++;
      return i;
    };
    function we(n, i, u) {
      for (let l = 0; l < i.length; l++) if (i[l] !== n[u + l + 1]) return !1;
      return !0;
    }
    function ke(n) {
      if (a(n)) return n;
      throw Error(`Invalid entity name ${n}`);
    }
    let Ti = /^[-+]?0x[a-fA-F0-9]+$/,
      _i = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/,
      Ci = { hex: !0, leadingZeros: !0, decimalPoint: ".", eNotation: !0, infinity: "original" },
      Ai = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/,
      Ri = new Set(["push", "pop", "reset", "updateCurrent", "restore"]);
    class Ge {
      constructor(n = {}) {
        ((this.separator = n.separator || "."), (this.path = []), (this.siblingStacks = []));
      }
      push(n, i = null, u = null) {
        this.path.length > 0 && (this.path[this.path.length - 1].values = void 0);
        let l = this.path.length;
        this.siblingStacks[l] || (this.siblingStacks[l] = new Map());
        let p = this.siblingStacks[l],
          h = u ? `${u}:${n}` : n,
          S = p.get(h) || 0,
          g = 0;
        for (let w of p.values()) g += w;
        p.set(h, S + 1);
        let E = { tag: n, position: g, counter: S };
        (u != null && (E.namespace = u), i != null && (E.values = i), this.path.push(E));
      }
      pop() {
        if (this.path.length === 0) return;
        let n = this.path.pop();
        return (
          this.siblingStacks.length > this.path.length + 1 &&
            (this.siblingStacks.length = this.path.length + 1),
          n
        );
      }
      updateCurrent(n) {
        if (this.path.length > 0) {
          let i = this.path[this.path.length - 1];
          n != null && (i.values = n);
        }
      }
      getCurrentTag() {
        return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
      }
      getCurrentNamespace() {
        return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
      }
      getAttrValue(n) {
        if (this.path.length === 0) return;
        return this.path[this.path.length - 1].values?.[n];
      }
      hasAttr(n) {
        if (this.path.length === 0) return !1;
        let i = this.path[this.path.length - 1];
        return i.values !== void 0 && n in i.values;
      }
      getPosition() {
        return this.path.length === 0 ? -1 : (this.path[this.path.length - 1].position ?? 0);
      }
      getCounter() {
        return this.path.length === 0 ? -1 : (this.path[this.path.length - 1].counter ?? 0);
      }
      getIndex() {
        return this.getPosition();
      }
      getDepth() {
        return this.path.length;
      }
      toString(n, i = !0) {
        let u = n || this.separator;
        return this.path.map((l) => (i && l.namespace ? `${l.namespace}:${l.tag}` : l.tag)).join(u);
      }
      toArray() {
        return this.path.map((n) => n.tag);
      }
      reset() {
        ((this.path = []), (this.siblingStacks = []));
      }
      matches(n) {
        let segments = n.segments;
        return (
          segments.length !== 0 &&
          (n.hasDeepWildcard() ? this._matchWithDeepWildcard(segments) : this._matchSimple(segments))
        );
      }
      _matchSimple(n) {
        if (this.path.length !== n.length) return !1;
        for (let i = 0; i < n.length; i++) {
          let u = n[i],
            l = this.path[i],
            p = i === this.path.length - 1;
          if (!this._matchSegment(u, l, p)) return !1;
        }
        return !0;
      }
      _matchWithDeepWildcard(n) {
        let i = this.path.length - 1,
          u = n.length - 1;
        for (; u >= 0 && i >= 0;) {
          let l = n[u];
          if (l.type === "deep-wildcard") {
            if ((u--, u < 0)) return !0;
            let p = n[u],
              h = !1;
            for (let S = i; S >= 0; S--) {
              let g = S === this.path.length - 1;
              if (this._matchSegment(p, this.path[S], g)) {
                ((i = S - 1), u--, (h = !0));
                break;
              }
            }
            if (!h) return !1;
          } else {
            let p = i === this.path.length - 1;
            if (!this._matchSegment(l, this.path[i], p)) return !1;
            (i--, u--);
          }
        }
        return u < 0;
      }
      _matchSegment(n, i, u) {
        if (n.tag !== "*" && n.tag !== i.tag) return !1;
        if (n.namespace !== void 0 && n.namespace !== "*" && n.namespace !== i.namespace) return !1;
        if (n.attrName !== void 0) {
          if (!u) return !1;
          if (!i.values || !(n.attrName in i.values)) return !1;
          if (n.attrValue !== void 0) {
            let l = i.values[n.attrName];
            if (String(l) !== String(n.attrValue)) return !1;
          }
        }
        if (n.position !== void 0) {
          if (!u) return !1;
          let l = i.counter ?? 0;
          if (n.position === "first" && l !== 0) return !1;
          if (n.position === "odd" && l % 2 != 1) return !1;
          if (n.position === "even" && l % 2 != 0) return !1;
          if (n.position === "nth" && l !== n.positionValue) return !1;
        }
        return !0;
      }
      snapshot() {
        return {
          path: this.path.map((n) => ({ ...n })),
          siblingStacks: this.siblingStacks.map((siblingStack) => new Map(siblingStack)),
        };
      }
      restore(n) {
        ((this.path = n.path.map((i) => ({ ...i }))),
          (this.siblingStacks = n.siblingStacks.map((siblingStack) => new Map(siblingStack))));
      }
      readOnly() {
        return new Proxy(this, {
          get(n, i, u) {
            if (Ri.has(i))
              return () => {
                throw TypeError(
                  `Cannot call '${i}' on a read-only Matcher. Obtain a writable instance to mutate state.`,
                );
              };
            let l = Reflect.get(n, i, u);
            return i === "path" || i === "siblingStacks"
              ? Object.freeze(
                  Array.isArray(l)
                    ? l.map((p) => (p instanceof Map ? Object.freeze(new Map(p)) : Object.freeze({ ...p })))
                    : l,
                )
              : typeof l == "function"
                ? l.bind(n)
                : l;
          },
          set(n, i) {
            throw TypeError(`Cannot set property '${String(i)}' on a read-only Matcher.`);
          },
          deleteProperty(n, i) {
            throw TypeError(`Cannot delete property '${String(i)}' from a read-only Matcher.`);
          },
        });
      }
    }
    class xe {
      constructor(n, i = {}) {
        ((this.pattern = n),
          (this.separator = i.separator || "."),
          (this.segments = this._parse(n)),
          (this._hasDeepWildcard = this.segments.some((segment) => segment.type === "deep-wildcard")),
          (this._hasAttributeCondition = this.segments.some((segment) => segment.attrName !== void 0)),
          (this._hasPositionSelector = this.segments.some((segment) => segment.position !== void 0)));
      }
      _parse(n) {
        let i = [],
          u = 0,
          l = "";
        for (; u < n.length;)
          n[u] === this.separator
            ? u + 1 < n.length && n[u + 1] === this.separator
              ? (l.trim() && (i.push(this._parseSegment(l.trim())), (l = "")),
                i.push({ type: "deep-wildcard" }),
                (u += 2))
              : (l.trim() && i.push(this._parseSegment(l.trim())), (l = ""), u++)
            : ((l += n[u]), u++);
        return (l.trim() && i.push(this._parseSegment(l.trim())), i);
      }
      _parseSegment(n) {
        let i = { type: "tag" },
          u = null,
          l = n,
          match = n.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
        if (match && ((l = match[1] + match[3]), match[2])) {
          let sliced = match[2].slice(1, -1);
          sliced && (u = sliced);
        }
        let h,
          S,
          g = l;
        if (l.includes("::")) {
          let index = l.indexOf("::");
          if (((h = l.substring(0, index).trim()), (g = l.substring(index + 2).trim()), !h))
            throw Error(`Invalid namespace in pattern: ${n}`);
        }
        let E = null;
        if (g.includes(":")) {
          let index = g.lastIndexOf(":"),
            trimmed = g.substring(0, index).trim(),
            trimmed_2 = g.substring(index + 1).trim();
          ["first", "last", "odd", "even"].includes(trimmed_2) || /^nth\(\d+\)$/.test(trimmed_2)
            ? ((S = trimmed), (E = trimmed_2))
            : (S = g);
        } else S = g;
        if (!S) throw Error(`Invalid segment pattern: ${n}`);
        if (((i.tag = S), h && (i.namespace = h), u))
          if (u.includes("=")) {
            let index = u.indexOf("=");
            ((i.attrName = u.substring(0, index).trim()), (i.attrValue = u.substring(index + 1).trim()));
          } else i.attrName = u.trim();
        if (E) {
          let match = E.match(/^nth\((\d+)\)$/);
          match ? ((i.position = "nth"), (i.positionValue = parseInt(match[1], 10))) : (i.position = E);
        }
        return i;
      }
      get length() {
        return this.segments.length;
      }
      hasDeepWildcard() {
        return this._hasDeepWildcard;
      }
      hasAttributeCondition() {
        return this._hasAttributeCondition;
      }
      hasPositionSelector() {
        return this._hasPositionSelector;
      }
      toString() {
        return this.pattern;
      }
    }
    function Ii(n, i) {
      if (!n) return {};
      let u = i.attributesGroupName ? n[i.attributesGroupName] : n;
      if (!u) return {};
      let l = {};
      for (let key in u)
        key.startsWith(i.attributeNamePrefix)
          ? (l[key.substring(i.attributeNamePrefix.length)] = u[key])
          : (l[key] = u[key]);
      return l;
    }
    function Oi(n) {
      if (!n || typeof n != "string") return;
      let index = n.indexOf(":");
      if (index !== -1 && index > 0) {
        let substring = n.substring(0, index);
        if (substring !== "xmlns") return substring;
      }
    }
    class Cr {
      constructor(n) {
        var i;
        if (
          ((this.options = n),
          (this.currentNode = null),
          (this.tagsNodeStack = []),
          (this.docTypeEntities = {}),
          (this.lastEntities = {
            apos: { regex: /&(apos|#39|#x27);/g, val: "'" },
            gt: { regex: /&(gt|#62|#x3E);/g, val: ">" },
            lt: { regex: /&(lt|#60|#x3C);/g, val: "<" },
            quot: { regex: /&(quot|#34|#x22);/g, val: '"' },
          }),
          (this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" }),
          (this.htmlEntities = {
            space: { regex: /&(nbsp|#160);/g, val: " " },
            cent: { regex: /&(cent|#162);/g, val: "\xA2" },
            pound: { regex: /&(pound|#163);/g, val: "\xA3" },
            yen: { regex: /&(yen|#165);/g, val: "\xA5" },
            euro: { regex: /&(euro|#8364);/g, val: "\u20AC" },
            copyright: { regex: /&(copy|#169);/g, val: "\xA9" },
            reg: { regex: /&(reg|#174);/g, val: "\xAE" },
            inr: { regex: /&(inr|#8377);/g, val: "\u20B9" },
            num_dec: { regex: /&#([0-9]{1,7});/g, val: (u, l) => Rr(l, 10, "&#") },
            num_hex: { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (u, l) => Rr(l, 16, "&#x") },
          }),
          (this.addExternalEntities = Mi),
          (this.parseXml = zi),
          (this.parseTextData = Di),
          (this.resolveNameSpace = Pi),
          (this.buildAttributesMap = vi),
          (this.isItStopNode = Ui),
          (this.replaceEntitiesValue = Bi),
          (this.readStopNodeData = Vi),
          (this.saveTextToParentTag = Li),
          (this.addChild = $i),
          (this.ignoreAttributesFn =
            typeof (i = this.options.ignoreAttributes) == "function"
              ? i
              : Array.isArray(i)
                ? (u) => {
                    for (let l of i) {
                      if (typeof l == "string" && u === l) return !0;
                      if (l instanceof RegExp && l.test(u)) return !0;
                    }
                  }
                : () => !1),
          (this.entityExpansionCount = 0),
          (this.currentExpandedLength = 0),
          (this.matcher = new Ge()),
          (this.readonlyMatcher = this.matcher.readOnly()),
          (this.isCurrentNodeStopNode = !1),
          this.options.stopNodes && this.options.stopNodes.length > 0)
        ) {
          this.stopNodeExpressions = [];
          for (let u = 0; u < this.options.stopNodes.length; u++) {
            let l = this.options.stopNodes[u];
            typeof l == "string"
              ? this.stopNodeExpressions.push(new xe(l))
              : l instanceof xe && this.stopNodeExpressions.push(l);
          }
        }
      }
    }
    function Mi(n) {
      let keys = Object.keys(n);
      for (let u = 0; u < keys.length; u++) {
        let l = keys[u],
          replaced = l.replace(/[.\-+*:]/g, "\\.");
        this.lastEntities[l] = { regex: new RegExp("&" + replaced + ";", "g"), val: n[l] };
      }
    }
    function Di(n, i, u, l, p, h, S) {
      if (n !== void 0 && (this.options.trimValues && !l && (n = n.trim()), n.length > 0)) {
        S || (n = this.replaceEntitiesValue(n, i, u));
        let g = this.options.jPath ? u.toString() : u,
          tagValueProcessor = this.options.tagValueProcessor(i, n, g, p, h);
        return tagValueProcessor == null
          ? n
          : typeof tagValueProcessor != typeof n || tagValueProcessor !== n
            ? tagValueProcessor
            : this.options.trimValues || n.trim() === n
              ? Ar(n, this.options.parseTagValue, this.options.numberParseOptions)
              : n;
      }
    }
    function Pi(n) {
      if (this.options.removeNSPrefix) {
        let parts = n.split(":"),
          u = n.charAt(0) === "/" ? "/" : "";
        if (parts[0] === "xmlns") return "";
        parts.length === 2 && (n = u + parts[1]);
      }
      return n;
    }
    let regExp_3 = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function vi(n, i, u) {
      if (this.options.ignoreAttributes !== !0 && typeof n == "string") {
        let l = o(n, regExp_3),
          p = l.length,
          h = {},
          S = {};
        for (let g = 0; g < p; g++) {
          let nameSpace = this.resolveNameSpace(l[g][1]),
            w = l[g][4];
          if (nameSpace.length && w !== void 0) {
            let A = w;
            (this.options.trimValues && (A = A.trim()),
              (A = this.replaceEntitiesValue(A, u, this.readonlyMatcher)),
              (S[nameSpace] = A));
          }
        }
        Object.keys(S).length > 0 && typeof i == "object" && i.updateCurrent && i.updateCurrent(S);
        for (let g = 0; g < p; g++) {
          let nameSpace = this.resolveNameSpace(l[g][1]),
            w = this.options.jPath ? i.toString() : this.readonlyMatcher;
          if (this.ignoreAttributesFn(nameSpace, w)) continue;
          let A = l[g][4],
            C = this.options.attributeNamePrefix + nameSpace;
          if (nameSpace.length)
            if (
              (this.options.transformAttributeName && (C = this.options.transformAttributeName(C)),
              (C = Ir(C, this.options)),
              A !== void 0)
            ) {
              (this.options.trimValues && (A = A.trim()),
                (A = this.replaceEntitiesValue(A, u, this.readonlyMatcher)));
              let z = this.options.jPath ? i.toString() : this.readonlyMatcher,
                attributeValueProcessor = this.options.attributeValueProcessor(nameSpace, A, z);
              h[C] =
                attributeValueProcessor == null
                  ? A
                  : typeof attributeValueProcessor != typeof A || attributeValueProcessor !== A
                    ? attributeValueProcessor
                    : Ar(A, this.options.parseAttributeValue, this.options.numberParseOptions);
            } else this.options.allowBooleanAttributes && (h[C] = !0);
        }
        if (!Object.keys(h).length) return;
        if (this.options.attributesGroupName) {
          let g = {};
          return ((g[this.options.attributesGroupName] = h), g);
        }
        return h;
      }
    }
    let zi = function (n) {
      n = n.replace(
        /\r\n?/g,
        `
`,
      );
      let i = new oe("!xml"),
        u = i,
        l = "";
      (this.matcher.reset(), (this.entityExpansionCount = 0), (this.currentExpandedLength = 0));
      let p = new _r(this.options.processEntities);
      for (let h = 0; h < n.length; h++)
        if (n[h] === "<")
          if (n[h + 1] === "/") {
            let S = be(n, ">", h, "Closing Tag is not closed."),
              trimmed = n.substring(h + 2, S).trim();
            if (this.options.removeNSPrefix) {
              let index = trimmed.indexOf(":");
              index !== -1 && (trimmed = trimmed.substr(index + 1));
            }
            ((trimmed = gt(this.options.transformTagName, trimmed, "", this.options).tagName),
              u && (l = this.saveTextToParentTag(l, u, this.readonlyMatcher)));
            let currentTag = this.matcher.getCurrentTag();
            if (trimmed && this.options.unpairedTags.indexOf(trimmed) !== -1)
              throw Error(`Unpaired tag can not be used as closing tag: </${trimmed}>`);
            (currentTag &&
              this.options.unpairedTags.indexOf(currentTag) !== -1 &&
              (this.matcher.pop(), this.tagsNodeStack.pop()),
              this.matcher.pop(),
              (this.isCurrentNodeStopNode = !1),
              (u = this.tagsNodeStack.pop()),
              (l = ""),
              (h = S));
          } else if (n[h + 1] === "?") {
            let S = mt(n, h, !1, "?>");
            if (!S) throw Error("Pi Tag is not closed.");
            if (
              ((l = this.saveTextToParentTag(l, u, this.readonlyMatcher)),
              (this.options.ignoreDeclaration && S.tagName === "?xml") || this.options.ignorePiTags)
            );
            else {
              let g = new oe(S.tagName);
              (g.add(this.options.textNodeName, ""),
                S.tagName !== S.tagExp &&
                  S.attrExpPresent &&
                  (g[":@"] = this.buildAttributesMap(S.tagExp, this.matcher, S.tagName)),
                this.addChild(u, g, this.readonlyMatcher, h));
            }
            h = S.closeIndex + 1;
          } else if (n.substr(h + 1, 3) === "!--") {
            let S = be(n, "-->", h + 4, "Comment is not closed.");
            if (this.options.commentPropName) {
              let substring = n.substring(h + 4, S - 2);
              ((l = this.saveTextToParentTag(l, u, this.readonlyMatcher)),
                u.add(this.options.commentPropName, [{ [this.options.textNodeName]: substring }]));
            }
            h = S;
          } else if (n.substr(h + 1, 2) === "!D") {
            let docType = p.readDocType(n, h);
            ((this.docTypeEntities = docType.entities), (h = docType.i));
          } else if (n.substr(h + 1, 2) === "![") {
            let S = be(n, "]]>", h, "CDATA is not closed.") - 2,
              substring = n.substring(h + 9, S);
            l = this.saveTextToParentTag(l, u, this.readonlyMatcher);
            let textData = this.parseTextData(substring, u.tagname, this.readonlyMatcher, !0, !1, !0, !0);
            (textData == null && (textData = ""),
              this.options.cdataPropName
                ? u.add(this.options.cdataPropName, [{ [this.options.textNodeName]: substring }])
                : u.add(this.options.textNodeName, textData),
              (h = S + 2));
          } else {
            let S = mt(n, h, this.options.removeNSPrefix);
            if (!S) {
              let substring = n.substring(Math.max(0, h - 50), Math.min(n.length, h + 50));
              throw Error(`readTagExp returned undefined at position ${h}. Context: "${substring}"`);
            }
            let {
              tagName: tagName,
              rawTagName: rawTagName,
              tagExp: tagExp,
              attrExpPresent: attrExpPresent,
              closeIndex: closeIndex,
            } = S;
            if (
              (({ tagName: tagName, tagExp: tagExp } = gt(
                this.options.transformTagName,
                tagName,
                tagExp,
                this.options,
              )),
              this.options.strictReservedNames &&
                (tagName === this.options.commentPropName ||
                  tagName === this.options.cdataPropName ||
                  tagName === this.options.textNodeName ||
                  tagName === this.options.attributesGroupName))
            )
              throw Error(`Invalid tag name: ${tagName}`);
            u && l && u.tagname !== "!xml" && (l = this.saveTextToParentTag(l, u, this.readonlyMatcher, !1));
            let z = u;
            z &&
              this.options.unpairedTags.indexOf(z.tagname) !== -1 &&
              ((u = this.tagsNodeStack.pop()), this.matcher.pop());
            let D = !1;
            tagExp.length > 0 &&
              tagExp.lastIndexOf("/") === tagExp.length - 1 &&
              ((D = !0),
              tagName[tagName.length - 1] === "/"
                ? ((tagName = tagName.substr(0, tagName.length - 1)), (tagExp = tagName))
                : (tagExp = tagExp.substr(0, tagExp.length - 1)),
              (attrExpPresent = tagName !== tagExp));
            let k,
              B = null,
              ne = {};
            ((k = Oi(rawTagName)),
              tagName !== i.tagname && this.matcher.push(tagName, {}, k),
              tagName !== tagExp &&
                attrExpPresent &&
                ((B = this.buildAttributesMap(tagExp, this.matcher, tagName)),
                B && (ne = Ii(B, this.options))),
              tagName !== i.tagname &&
                (this.isCurrentNodeStopNode = this.isItStopNode(this.stopNodeExpressions, this.matcher)));
            let H = h;
            if (this.isCurrentNodeStopNode) {
              let Z = "";
              if (D) h = S.closeIndex;
              else if (this.options.unpairedTags.indexOf(tagName) !== -1) h = S.closeIndex;
              else {
                let stopNodeData = this.readStopNodeData(n, rawTagName, closeIndex + 1);
                if (!stopNodeData) throw Error(`Unexpected end of ${rawTagName}`);
                ((h = stopNodeData.i), (Z = stopNodeData.tagContent));
              }
              let St = new oe(tagName);
              (B && (St[":@"] = B),
                St.add(this.options.textNodeName, Z),
                this.matcher.pop(),
                (this.isCurrentNodeStopNode = !1),
                this.addChild(u, St, this.readonlyMatcher, H));
            } else {
              if (D) {
                ({ tagName: tagName, tagExp: tagExp } = gt(
                  this.options.transformTagName,
                  tagName,
                  tagExp,
                  this.options,
                ));
                let Z = new oe(tagName);
                (B && (Z[":@"] = B),
                  this.addChild(u, Z, this.readonlyMatcher, H),
                  this.matcher.pop(),
                  (this.isCurrentNodeStopNode = !1));
              } else {
                if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                  let Z = new oe(tagName);
                  (B && (Z[":@"] = B),
                    this.addChild(u, Z, this.readonlyMatcher, H),
                    this.matcher.pop(),
                    (this.isCurrentNodeStopNode = !1),
                    (h = S.closeIndex));
                  continue;
                }
                {
                  let Z = new oe(tagName);
                  if (this.tagsNodeStack.length > this.options.maxNestedTags)
                    throw Error("Maximum nested tags exceeded");
                  (this.tagsNodeStack.push(u),
                    B && (Z[":@"] = B),
                    this.addChild(u, Z, this.readonlyMatcher, H),
                    (u = Z));
                }
              }
              ((l = ""), (h = closeIndex));
            }
          }
        else l += n[h];
      return i.child;
    };
    function $i(n, i, u, l) {
      this.options.captureMetaData || (l = void 0);
      let p = this.options.jPath ? u.toString() : u,
        updateTag = this.options.updateTag(i.tagname, p, i[":@"]);
      updateTag === !1 ||
        (typeof updateTag == "string" ? ((i.tagname = updateTag), n.addChild(i, l)) : n.addChild(i, l));
    }
    function Bi(n, i, u) {
      let processEntities = this.options.processEntities;
      if (!processEntities || !processEntities.enabled) return n;
      if (processEntities.allowedTags) {
        let p = this.options.jPath ? u.toString() : u;
        if (
          !(Array.isArray(processEntities.allowedTags)
            ? processEntities.allowedTags.includes(i)
            : processEntities.allowedTags(i, p))
        )
          return n;
      }
      if (processEntities.tagFilter) {
        let p = this.options.jPath ? u.toString() : u;
        if (!processEntities.tagFilter(i, p)) return n;
      }
      for (let p of Object.keys(this.docTypeEntities)) {
        let h = this.docTypeEntities[p],
          match = n.match(h.regx);
        if (match) {
          if (
            ((this.entityExpansionCount += match.length),
            processEntities.maxTotalExpansions &&
              this.entityExpansionCount > processEntities.maxTotalExpansions)
          )
            throw Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${processEntities.maxTotalExpansions}`,
            );
          let g = n.length;
          if (
            ((n = n.replace(h.regx, h.val)),
            processEntities.maxExpandedLength &&
              ((this.currentExpandedLength += n.length - g),
              this.currentExpandedLength > processEntities.maxExpandedLength))
          )
            throw Error(
              `Total expanded content size exceeded: ${this.currentExpandedLength} > ${processEntities.maxExpandedLength}`,
            );
        }
      }
      for (let p of Object.keys(this.lastEntities)) {
        let h = this.lastEntities[p],
          match = n.match(h.regex);
        if (
          match &&
          ((this.entityExpansionCount += match.length),
          processEntities.maxTotalExpansions &&
            this.entityExpansionCount > processEntities.maxTotalExpansions)
        )
          throw Error(
            `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${processEntities.maxTotalExpansions}`,
          );
        n = n.replace(h.regex, h.val);
      }
      if (n.indexOf("&") === -1) return n;
      if (this.options.htmlEntities)
        for (let p of Object.keys(this.htmlEntities)) {
          let h = this.htmlEntities[p],
            match = n.match(h.regex);
          if (
            match &&
            ((this.entityExpansionCount += match.length),
            processEntities.maxTotalExpansions &&
              this.entityExpansionCount > processEntities.maxTotalExpansions)
          )
            throw Error(
              `Entity expansion limit exceeded: ${this.entityExpansionCount} > ${processEntities.maxTotalExpansions}`,
            );
          n = n.replace(h.regex, h.val);
        }
      return n.replace(this.ampEntity.regex, this.ampEntity.val);
    }
    function Li(n, i, u, l) {
      return (
        n &&
          (l === void 0 && (l = i.child.length === 0),
          (n = this.parseTextData(n, i.tagname, u, !1, !!i[":@"] && Object.keys(i[":@"]).length !== 0, l)) !==
            void 0 &&
            n !== "" &&
            i.add(this.options.textNodeName, n),
          (n = "")),
        n
      );
    }
    function Ui(n, i) {
      if (!n || n.length === 0) return !1;
      for (let u = 0; u < n.length; u++) if (i.matches(n[u])) return !0;
      return !1;
    }
    function be(n, i, u, l) {
      let index = n.indexOf(i, u);
      if (index === -1) throw Error(l);
      return index + i.length - 1;
    }
    function mt(n, i, u, l = ">") {
      let p = (function (C, z, D = ">") {
        let k,
          B = "";
        for (let ne = z; ne < C.length; ne++) {
          let H = C[ne];
          if (k) H === k && (k = "");
          else if (H === '"' || H === "'") k = H;
          else if (H === D[0]) {
            if (!D[1]) return { data: B, index: ne };
            if (C[ne + 1] === D[1]) return { data: B, index: ne };
          } else H === "\t" && (H = " ");
          B += H;
        }
      })(n, i + 1, l);
      if (!p) return;
      let { data: h, index: index } = p,
        search = h.search(/\s/),
        E = h,
        w = !0;
      search !== -1 && ((E = h.substring(0, search)), (h = h.substring(search + 1).trimStart()));
      let A = E;
      if (u) {
        let index = E.indexOf(":");
        index !== -1 && ((E = E.substr(index + 1)), (w = E !== p.data.substr(index + 1)));
      }
      return { tagName: E, tagExp: h, closeIndex: index, attrExpPresent: w, rawTagName: A };
    }
    function Vi(n, i, u) {
      let l = u,
        p = 1;
      for (; u < n.length; u++)
        if (n[u] === "<")
          if (n[u + 1] === "/") {
            let h = be(n, ">", u, `${i} is not closed`);
            if (n.substring(u + 2, h).trim() === i && (p--, p === 0))
              return { tagContent: n.substring(l, u), i: h };
            u = h;
          } else if (n[u + 1] === "?") u = be(n, "?>", u + 1, "StopNode is not closed.");
          else if (n.substr(u + 1, 3) === "!--") u = be(n, "-->", u + 3, "StopNode is not closed.");
          else if (n.substr(u + 1, 2) === "![") u = be(n, "]]>", u, "StopNode is not closed.") - 2;
          else {
            let h = mt(n, u, ">");
            h && ((h && h.tagName) === i && h.tagExp[h.tagExp.length - 1] !== "/" && p++, (u = h.closeIndex));
          }
    }
    function Ar(n, i, u) {
      if (i && typeof n == "string") {
        let trimmed = n.trim();
        return (
          trimmed === "true" ||
          (trimmed !== "false" &&
            (function (p, h = {}) {
              if (((h = Object.assign({}, Ci, h)), !p || typeof p != "string")) return p;
              let trimmed = p.trim();
              if (h.skipLike !== void 0 && h.skipLike.test(trimmed)) return p;
              if (p === "0") return 0;
              if (h.hex && Ti.test(trimmed))
                return (function (E) {
                  if (parseInt) return parseInt(E, 16);
                  if (Number.parseInt) return Number.parseInt(E, 16);
                  if (window && window.parseInt) return window.parseInt(E, 16);
                  throw Error("parseInt, Number.parseInt, window.parseInt are not supported");
                })(trimmed);
              if (isFinite(trimmed)) {
                if (trimmed.includes("e") || trimmed.includes("E"))
                  return (function (E, w, A) {
                    if (!A.eNotation) return E;
                    let match = w.match(Ai);
                    if (match) {
                      let z = match[1] || "",
                        D = match[3].indexOf("e") === -1 ? "E" : "e",
                        k = match[2],
                        B = z ? E[k.length + 1] === D : E[k.length] === D;
                      return k.length > 1 && B
                        ? E
                        : (k.length !== 1 || (!match[3].startsWith(`.${D}`) && match[3][0] !== D)) &&
                            k.length > 0
                          ? A.leadingZeros && !B
                            ? ((w = (match[1] || "") + match[3]), Number(w))
                            : E
                          : Number(w);
                    }
                    return E;
                  })(p, trimmed, h);
                {
                  let match = _i.exec(trimmed);
                  if (match) {
                    let w = match[1] || "",
                      A = match[2],
                      C =
                        (g = match[3]) && g.indexOf(".") !== -1
                          ? ((g = g.replace(/0+$/, "")) === "."
                              ? (g = "0")
                              : g[0] === "."
                                ? (g = "0" + g)
                                : g[g.length - 1] === "." && (g = g.substring(0, g.length - 1)),
                            g)
                          : g,
                      z = w ? p[A.length + 1] === "." : p[A.length] === ".";
                    if (!h.leadingZeros && (A.length > 1 || (A.length === 1 && !z))) return p;
                    {
                      let D = Number(trimmed),
                        k = String(D);
                      if (D === 0) return D;
                      if (k.search(/[eE]/) !== -1) return h.eNotation ? D : p;
                      if (trimmed.indexOf(".") !== -1)
                        return k === "0" || k === C || k === `${w}${C}` ? D : p;
                      let B = A ? C : trimmed;
                      return A ? (B === k || w + B === k ? D : p) : B === k || B === w + k ? D : p;
                    }
                  }
                  return p;
                }
              }
              var g;
              return (function (E, w, A) {
                let C = w === 1 / 0;
                switch (A.infinity.toLowerCase()) {
                  case "null":
                    return null;
                  case "infinity":
                    return w;
                  case "string":
                    return C ? "Infinity" : "-Infinity";
                  default:
                    return E;
                }
              })(p, Number(trimmed), h);
            })(n, u))
        );
      }
      return n !== void 0 ? n : "";
    }
    function Rr(n, i, u) {
      let int = Number.parseInt(n, i);
      return int >= 0 && int <= 1114111 ? String.fromCodePoint(int) : u + n + ";";
    }
    function gt(n, i, u, l) {
      if (n) {
        let p = n(i);
        (u === i && (u = p), (i = p));
      }
      return { tagName: (i = Ir(i, l)), tagExp: u };
    }
    function Ir(n, i) {
      if (d.includes(n))
        throw Error(
          `[SECURITY] Invalid name: "${n}" is a reserved JavaScript keyword that could cause prototype pollution`,
        );
      return c.includes(n) ? i.onDangerousProperty(n) : n;
    }
    let metaDataSymbol = oe.getMetaDataSymbol();
    function Fi(n, i) {
      if (!n || typeof n != "object") return {};
      if (!i) return n;
      let u = {};
      for (let key in n) key.startsWith(i) ? (u[key.substring(i.length)] = n[key]) : (u[key] = n[key]);
      return u;
    }
    function ji(n, i, u, l) {
      return Or(n, i, u, l);
    }
    function Or(n, i, u, l) {
      let p,
        h = {};
      for (let S = 0; S < n.length; S++) {
        let g = n[S],
          E = qi(g);
        if (E !== void 0 && E !== i.textNodeName) {
          let w = Fi(g[":@"] || {}, i.attributeNamePrefix);
          u.push(E, w);
        }
        if (E === i.textNodeName) p === void 0 ? (p = g[E]) : (p += "" + g[E]);
        else {
          if (E === void 0) continue;
          if (g[E]) {
            let w = Or(g[E], i, u, l),
              A = Gi(w, i);
            if (
              (g[":@"]
                ? Hi(w, g[":@"], l, i)
                : Object.keys(w).length !== 1 || w[i.textNodeName] === void 0 || i.alwaysCreateTextNode
                  ? Object.keys(w).length === 0 &&
                    (i.alwaysCreateTextNode ? (w[i.textNodeName] = "") : (w = ""))
                  : (w = w[i.textNodeName]),
              g[metaDataSymbol] !== void 0 &&
                typeof w == "object" &&
                w !== null &&
                (w[metaDataSymbol] = g[metaDataSymbol]),
              h[E] !== void 0 && Object.prototype.hasOwnProperty.call(h, E))
            )
              (Array.isArray(h[E]) || (h[E] = [h[E]]), h[E].push(w));
            else {
              let C = i.jPath ? l.toString() : l;
              i.isArray(E, C, A) ? (h[E] = [w]) : (h[E] = w);
            }
            E !== void 0 && E !== i.textNodeName && u.pop();
          }
        }
      }
      return (
        typeof p == "string"
          ? p.length > 0 && (h[i.textNodeName] = p)
          : p !== void 0 && (h[i.textNodeName] = p),
        h
      );
    }
    function qi(n) {
      let keys = Object.keys(n);
      for (let u = 0; u < keys.length; u++) {
        let l = keys[u];
        if (l !== ":@") return l;
      }
    }
    function Hi(n, i, u, l) {
      if (i) {
        let keys = Object.keys(i),
          h = keys.length;
        for (let S = 0; S < h; S++) {
          let g = keys[S],
            E = g.startsWith(l.attributeNamePrefix) ? g.substring(l.attributeNamePrefix.length) : g,
            w = l.jPath ? u.toString() + "." + E : u;
          l.isArray(g, w, !0, !0) ? (n[g] = [i[g]]) : (n[g] = i[g]);
        }
      }
    }
    function Gi(n, i) {
      let { textNodeName: textNodeName } = i,
        l = Object.keys(n).length;
      return (
        l === 0 ||
        !(l !== 1 || (!n[textNodeName] && typeof n[textNodeName] != "boolean" && n[textNodeName] !== 0))
      );
    }
    class Mr {
      constructor(n) {
        ((this.externalEntities = {}), (this.options = Ni(n)));
      }
      parse(n, i) {
        if (typeof n != "string" && n.toString) n = n.toString();
        else if (typeof n != "string") throw Error("XML data is accepted in String or Bytes[] form.");
        if (i) {
          i === !0 && (i = {});
          let p = m(n, i);
          if (p !== !0) throw Error(`${p.err.msg}:${p.err.line}:${p.err.col}`);
        }
        let u = new Cr(this.options);
        u.addExternalEntities(this.externalEntities);
        let xml = u.parseXml(n);
        return this.options.preserveOrder || xml === void 0
          ? xml
          : ji(xml, this.options, u.matcher, u.readonlyMatcher);
      }
      addEntity(n, i) {
        if (i.indexOf("&") !== -1) throw Error("Entity value can't have '&'");
        if (n.indexOf("&") !== -1 || n.indexOf(";") !== -1)
          throw Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        if (i === "&") throw Error("An entity with value '&' is not permitted");
        this.externalEntities[n] = i;
      }
      static getMetaDataSymbol() {
        return oe.getMetaDataSymbol();
      }
    }
    function Xi(n, i) {
      let u = "";
      i.format &&
        i.indentBy.length > 0 &&
        (u = `
`);
      let l = [];
      if (i.stopNodes && Array.isArray(i.stopNodes))
        for (let p = 0; p < i.stopNodes.length; p++) {
          let h = i.stopNodes[p];
          typeof h == "string" ? l.push(new xe(h)) : h instanceof xe && l.push(h);
        }
      return Dr(n, i, u, new Ge(), l);
    }
    function Dr(n, i, u, l, p) {
      let h = "",
        S = !1;
      if (i.maxNestedTags && l.getDepth() > i.maxNestedTags) throw Error("Maximum nested tags exceeded");
      if (!Array.isArray(n)) {
        if (n != null) {
          let str = n.toString();
          return ((str = Et(str, i)), str);
        }
        return "";
      }
      for (let g = 0; g < n.length; g++) {
        let E = n[g],
          w = kr(E);
        if (w === void 0) continue;
        let A = Wi(E[":@"], i);
        l.push(w, A);
        let C = Qi(l, p);
        if (w === i.textNodeName) {
          let B = E[w];
          (C || ((B = i.tagValueProcessor(w, B)), (B = Et(B, i))),
            S && (h += u),
            (h += B),
            (S = !1),
            l.pop());
          continue;
        }
        if (w === i.cdataPropName) {
          (S && (h += u), (h += `<![CDATA[${E[w][0][i.textNodeName]}]]>`), (S = !1), l.pop());
          continue;
        }
        if (w === i.commentPropName) {
          ((h += u + `<!--${E[w][0][i.textNodeName]}-->`), (S = !0), l.pop());
          continue;
        }
        if (w[0] === "?") {
          let B = vr(E[":@"], i, C),
            ne = w === "?xml" ? "" : u,
            H = E[w][0][i.textNodeName];
          ((H = H.length !== 0 ? " " + H : ""), (h += ne + `<${w}${H}${B}?>`), (S = !0), l.pop());
          continue;
        }
        let z = u;
        z !== "" && (z += i.indentBy);
        let D = u + `<${w}${vr(E[":@"], i, C)}`,
          k;
        ((k = C ? Pr(E[w], i) : Dr(E[w], i, z, l, p)),
          i.unpairedTags.indexOf(w) !== -1
            ? i.suppressUnpairedNode
              ? (h += D + ">")
              : (h += D + "/>")
            : (k && k.length !== 0) || !i.suppressEmptyNode
              ? k && k.endsWith(">")
                ? (h += D + `>${k}${u}</${w}>`)
                : ((h += D + ">"),
                  k && u !== "" && (k.includes("/>") || k.includes("</"))
                    ? (h += u + i.indentBy + k + u)
                    : (h += k),
                  (h += `</${w}>`))
              : (h += D + "/>"),
          (S = !0),
          l.pop());
      }
      return h;
    }
    function Wi(n, i) {
      if (!n || i.ignoreAttributes) return null;
      let u = {},
        l = !1;
      for (let key in n)
        Object.prototype.hasOwnProperty.call(n, key) &&
          ((u[key.startsWith(i.attributeNamePrefix) ? key.substr(i.attributeNamePrefix.length) : key] =
            n[key]),
          (l = !0));
      return l ? u : null;
    }
    function Pr(n, i) {
      if (!Array.isArray(n)) return n != null ? n.toString() : "";
      let u = "";
      for (let l = 0; l < n.length; l++) {
        let p = n[l],
          h = kr(p);
        if (h === i.textNodeName) u += p[h];
        else if (h === i.cdataPropName) u += p[h][0][i.textNodeName];
        else if (h === i.commentPropName) u += p[h][0][i.textNodeName];
        else {
          if (h && h[0] === "?") continue;
          if (h) {
            let S = Ki(p[":@"], i),
              g = Pr(p[h], i);
            g && g.length !== 0 ? (u += `<${h}${S}>${g}</${h}>`) : (u += `<${h}${S}/>`);
          }
        }
      }
      return u;
    }
    function Ki(n, i) {
      let u = "";
      if (n && !i.ignoreAttributes)
        for (let key in n) {
          if (!Object.prototype.hasOwnProperty.call(n, key)) continue;
          let p = n[key];
          p === !0 && i.suppressBooleanAttributes
            ? (u += ` ${key.substr(i.attributeNamePrefix.length)}`)
            : (u += ` ${key.substr(i.attributeNamePrefix.length)}="${p}"`);
        }
      return u;
    }
    function kr(n) {
      let keys = Object.keys(n);
      for (let u = 0; u < keys.length; u++) {
        let l = keys[u];
        if (Object.prototype.hasOwnProperty.call(n, l) && l !== ":@") return l;
      }
    }
    function vr(n, i, u) {
      let l = "";
      if (n && !i.ignoreAttributes)
        for (let key in n) {
          if (!Object.prototype.hasOwnProperty.call(n, key)) continue;
          let h;
          (u ? (h = n[key]) : ((h = i.attributeValueProcessor(key, n[key])), (h = Et(h, i))),
            h === !0 && i.suppressBooleanAttributes
              ? (l += ` ${key.substr(i.attributeNamePrefix.length)}`)
              : (l += ` ${key.substr(i.attributeNamePrefix.length)}="${h}"`));
        }
      return l;
    }
    function Qi(n, i) {
      if (!i || i.length === 0) return !1;
      for (let u = 0; u < i.length; u++) if (n.matches(i[u])) return !0;
      return !1;
    }
    function Et(n, i) {
      if (n && n.length > 0 && i.processEntities)
        for (let u = 0; u < i.entities.length; u++) {
          let l = i.entities[u];
          n = n.replace(l.regex, l.val);
        }
      return n;
    }
    let Yi = {
      attributeNamePrefix: "@_",
      attributesGroupName: !1,
      textNodeName: "#text",
      ignoreAttributes: !0,
      cdataPropName: !1,
      format: !1,
      indentBy: "  ",
      suppressEmptyNode: !1,
      suppressUnpairedNode: !0,
      suppressBooleanAttributes: !0,
      tagValueProcessor: function (n, i) {
        return i;
      },
      attributeValueProcessor: function (n, i) {
        return i;
      },
      preserveOrder: !1,
      commentPropName: !1,
      unpairedTags: [],
      entities: [
        { regex: new RegExp("&", "g"), val: "&amp;" },
        { regex: new RegExp(">", "g"), val: "&gt;" },
        { regex: new RegExp("<", "g"), val: "&lt;" },
        { regex: new RegExp("'", "g"), val: "&apos;" },
        { regex: new RegExp('"', "g"), val: "&quot;" },
      ],
      processEntities: !0,
      stopNodes: [],
      oneListGroup: !1,
      maxNestedTags: 100,
      jPath: !0,
    };
    function te(n) {
      if (
        ((this.options = Object.assign({}, Yi, n)),
        this.options.stopNodes &&
          Array.isArray(this.options.stopNodes) &&
          (this.options.stopNodes = this.options.stopNodes.map((stopNode) =>
            typeof stopNode == "string" && stopNode.startsWith("*.")
              ? ".." + stopNode.substring(2)
              : stopNode,
          )),
        (this.stopNodeExpressions = []),
        this.options.stopNodes && Array.isArray(this.options.stopNodes))
      )
        for (let u = 0; u < this.options.stopNodes.length; u++) {
          let l = this.options.stopNodes[u];
          typeof l == "string"
            ? this.stopNodeExpressions.push(new xe(l))
            : l instanceof xe && this.stopNodeExpressions.push(l);
        }
      var i;
      (this.options.ignoreAttributes === !0 || this.options.attributesGroupName
        ? (this.isAttribute = function () {
            return !1;
          })
        : ((this.ignoreAttributesFn =
            typeof (i = this.options.ignoreAttributes) == "function"
              ? i
              : Array.isArray(i)
                ? (u) => {
                    for (let l of i) {
                      if (typeof l == "string" && u === l) return !0;
                      if (l instanceof RegExp && l.test(u)) return !0;
                    }
                  }
                : () => !1),
          (this.attrPrefixLen = this.options.attributeNamePrefix.length),
          (this.isAttribute = eo)),
        (this.processTextOrObjNode = Ji),
        this.options.format
          ? ((this.indentate = Zi),
            (this.tagEndChar = `>
`),
            (this.newLine = `
`))
          : ((this.indentate = function () {
              return "";
            }),
            (this.tagEndChar = ">"),
            (this.newLine = "")));
    }
    function Ji(n, i, u, l) {
      let extractAttributes = this.extractAttributes(n);
      if ((l.push(i, extractAttributes), this.checkStopNode(l))) {
        let rawContent = this.buildRawContent(n),
          attributesForStopNode = this.buildAttributesForStopNode(n);
        return (l.pop(), this.buildObjectNode(rawContent, i, attributesForStopNode, u));
      }
      let j2x = this.j2x(n, u + 1, l);
      return (
        l.pop(),
        n[this.options.textNodeName] !== void 0 && Object.keys(n).length === 1
          ? this.buildTextValNode(n[this.options.textNodeName], i, j2x.attrStr, u, l)
          : this.buildObjectNode(j2x.val, i, j2x.attrStr, u)
      );
    }
    function Zi(n) {
      return this.options.indentBy.repeat(n);
    }
    function eo(n) {
      return (
        !(!n.startsWith(this.options.attributeNamePrefix) || n === this.options.textNodeName) &&
        n.substr(this.attrPrefixLen)
      );
    }
    ((te.prototype.build = function (n) {
      if (this.options.preserveOrder) return Xi(n, this.options);
      {
        Array.isArray(n) &&
          this.options.arrayNodeName &&
          this.options.arrayNodeName.length > 1 &&
          (n = { [this.options.arrayNodeName]: n });
        let i = new Ge();
        return this.j2x(n, 0, i).val;
      }
    }),
      (te.prototype.j2x = function (n, i, u) {
        let l = "",
          p = "";
        if (this.options.maxNestedTags && u.getDepth() >= this.options.maxNestedTags)
          throw Error("Maximum nested tags exceeded");
        let h = this.options.jPath ? u.toString() : u,
          checkStopNode = this.checkStopNode(u);
        for (let key in n)
          if (Object.prototype.hasOwnProperty.call(n, key))
            if (n[key] === void 0) this.isAttribute(key) && (p += "");
            else if (n[key] === null)
              this.isAttribute(key) || key === this.options.cdataPropName
                ? (p += "")
                : key[0] === "?"
                  ? (p += this.indentate(i) + "<" + key + "?" + this.tagEndChar)
                  : (p += this.indentate(i) + "<" + key + "/" + this.tagEndChar);
            else if (n[key] instanceof Date) p += this.buildTextValNode(n[key], key, "", i, u);
            else if (typeof n[key] != "object") {
              let isAttribute = this.isAttribute(key);
              if (isAttribute && !this.ignoreAttributesFn(isAttribute, h))
                l += this.buildAttrPairStr(isAttribute, "" + n[key], checkStopNode);
              else if (!isAttribute)
                if (key === this.options.textNodeName) {
                  let tagValueProcessor = this.options.tagValueProcessor(key, "" + n[key]);
                  p += this.replaceEntitiesValue(tagValueProcessor);
                } else {
                  u.push(key);
                  let checkStopNode = this.checkStopNode(u);
                  if ((u.pop(), checkStopNode)) {
                    let A = "" + n[key];
                    p +=
                      A === ""
                        ? this.indentate(i) + "<" + key + this.closeTag(key) + this.tagEndChar
                        : this.indentate(i) + "<" + key + ">" + A + "</" + key + this.tagEndChar;
                  } else p += this.buildTextValNode(n[key], key, "", i, u);
                }
            } else if (Array.isArray(n[key])) {
              let E = n[key].length,
                w = "",
                A = "";
              for (let C = 0; C < E; C++) {
                let z = n[key][C];
                if (z === void 0);
                else if (z === null)
                  key[0] === "?"
                    ? (p += this.indentate(i) + "<" + key + "?" + this.tagEndChar)
                    : (p += this.indentate(i) + "<" + key + "/" + this.tagEndChar);
                else if (typeof z == "object")
                  if (this.options.oneListGroup) {
                    u.push(key);
                    let j2x = this.j2x(z, i + 1, u);
                    (u.pop(),
                      (w += j2x.val),
                      this.options.attributesGroupName &&
                        z.hasOwnProperty(this.options.attributesGroupName) &&
                        (A += j2x.attrStr));
                  } else w += this.processTextOrObjNode(z, key, i, u);
                else if (this.options.oneListGroup) {
                  let tagValueProcessor = this.options.tagValueProcessor(key, z);
                  ((tagValueProcessor = this.replaceEntitiesValue(tagValueProcessor)),
                    (w += tagValueProcessor));
                } else {
                  u.push(key);
                  let checkStopNode = this.checkStopNode(u);
                  if ((u.pop(), checkStopNode)) {
                    let k = "" + z;
                    w +=
                      k === ""
                        ? this.indentate(i) + "<" + key + this.closeTag(key) + this.tagEndChar
                        : this.indentate(i) + "<" + key + ">" + k + "</" + key + this.tagEndChar;
                  } else w += this.buildTextValNode(z, key, "", i, u);
                }
              }
              (this.options.oneListGroup && (w = this.buildObjectNode(w, key, A, i)), (p += w));
            } else if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
              let keys = Object.keys(n[key]),
                w = keys.length;
              for (let A = 0; A < w; A++)
                l += this.buildAttrPairStr(keys[A], "" + n[key][keys[A]], checkStopNode);
            } else p += this.processTextOrObjNode(n[key], key, i, u);
        return { attrStr: l, val: p };
      }),
      (te.prototype.buildAttrPairStr = function (n, i, u) {
        return (
          u || ((i = this.options.attributeValueProcessor(n, "" + i)), (i = this.replaceEntitiesValue(i))),
          this.options.suppressBooleanAttributes && i === "true" ? " " + n : " " + n + '="' + i + '"'
        );
      }),
      (te.prototype.extractAttributes = function (n) {
        if (!n || typeof n != "object") return null;
        let i = {},
          u = !1;
        if (this.options.attributesGroupName && n[this.options.attributesGroupName]) {
          let l = n[this.options.attributesGroupName];
          for (let key in l)
            Object.prototype.hasOwnProperty.call(l, key) &&
              ((i[
                key.startsWith(this.options.attributeNamePrefix)
                  ? key.substring(this.options.attributeNamePrefix.length)
                  : key
              ] = l[key]),
              (u = !0));
        } else
          for (let key in n) {
            if (!Object.prototype.hasOwnProperty.call(n, key)) continue;
            let isAttribute = this.isAttribute(key);
            isAttribute && ((i[isAttribute] = n[key]), (u = !0));
          }
        return u ? i : null;
      }),
      (te.prototype.buildRawContent = function (n) {
        if (typeof n == "string") return n;
        if (typeof n != "object" || n === null) return String(n);
        if (n[this.options.textNodeName] !== void 0) return n[this.options.textNodeName];
        let i = "";
        for (let key in n) {
          if (!Object.prototype.hasOwnProperty.call(n, key)) continue;
          if (this.isAttribute(key)) continue;
          if (this.options.attributesGroupName && key === this.options.attributesGroupName) continue;
          let l = n[key];
          if (key === this.options.textNodeName) i += l;
          else if (Array.isArray(l)) {
            for (let p of l)
              if (typeof p == "string" || typeof p == "number") i += `<${key}>${p}</${key}>`;
              else if (typeof p == "object" && p !== null) {
                let rawContent = this.buildRawContent(p),
                  attributesForStopNode = this.buildAttributesForStopNode(p);
                i +=
                  rawContent === ""
                    ? `<${key}${attributesForStopNode}/>`
                    : `<${key}${attributesForStopNode}>${rawContent}</${key}>`;
              }
          } else if (typeof l == "object" && l !== null) {
            let rawContent = this.buildRawContent(l),
              attributesForStopNode = this.buildAttributesForStopNode(l);
            i +=
              rawContent === ""
                ? `<${key}${attributesForStopNode}/>`
                : `<${key}${attributesForStopNode}>${rawContent}</${key}>`;
          } else i += `<${key}>${l}</${key}>`;
        }
        return i;
      }),
      (te.prototype.buildAttributesForStopNode = function (n) {
        if (!n || typeof n != "object") return "";
        let i = "";
        if (this.options.attributesGroupName && n[this.options.attributesGroupName]) {
          let u = n[this.options.attributesGroupName];
          for (let key in u) {
            if (!Object.prototype.hasOwnProperty.call(u, key)) continue;
            let p = key.startsWith(this.options.attributeNamePrefix)
                ? key.substring(this.options.attributeNamePrefix.length)
                : key,
              h = u[key];
            h === !0 && this.options.suppressBooleanAttributes
              ? (i += " " + p)
              : (i += " " + p + '="' + h + '"');
          }
        } else
          for (let key in n) {
            if (!Object.prototype.hasOwnProperty.call(n, key)) continue;
            let isAttribute = this.isAttribute(key);
            if (isAttribute) {
              let p = n[key];
              p === !0 && this.options.suppressBooleanAttributes
                ? (i += " " + isAttribute)
                : (i += " " + isAttribute + '="' + p + '"');
            }
          }
        return i;
      }),
      (te.prototype.buildObjectNode = function (n, i, u, l) {
        if (n === "")
          return i[0] === "?"
            ? this.indentate(l) + "<" + i + u + "?" + this.tagEndChar
            : this.indentate(l) + "<" + i + u + this.closeTag(i) + this.tagEndChar;
        {
          let p = "</" + i + this.tagEndChar,
            h = "";
          return (
            i[0] === "?" && ((h = "?"), (p = "")),
            (!u && u !== "") || n.indexOf("<") !== -1
              ? this.options.commentPropName !== !1 && i === this.options.commentPropName && h.length === 0
                ? this.indentate(l) + `<!--${n}-->` + this.newLine
                : this.indentate(l) + "<" + i + u + h + this.tagEndChar + n + this.indentate(l) + p
              : this.indentate(l) + "<" + i + u + h + ">" + n + p
          );
        }
      }),
      (te.prototype.closeTag = function (n) {
        let i = "";
        return (
          this.options.unpairedTags.indexOf(n) !== -1
            ? this.options.suppressUnpairedNode || (i = "/")
            : (i = this.options.suppressEmptyNode ? "/" : `></${n}`),
          i
        );
      }),
      (te.prototype.checkStopNode = function (n) {
        if (!this.stopNodeExpressions || this.stopNodeExpressions.length === 0) return !1;
        for (let i = 0; i < this.stopNodeExpressions.length; i++)
          if (n.matches(this.stopNodeExpressions[i])) return !0;
        return !1;
      }),
      (te.prototype.buildTextValNode = function (n, i, u, l, p) {
        if (this.options.cdataPropName !== !1 && i === this.options.cdataPropName)
          return this.indentate(l) + `<![CDATA[${n}]]>` + this.newLine;
        if (this.options.commentPropName !== !1 && i === this.options.commentPropName)
          return this.indentate(l) + `<!--${n}-->` + this.newLine;
        if (i[0] === "?") return this.indentate(l) + "<" + i + u + "?" + this.tagEndChar;
        {
          let tagValueProcessor = this.options.tagValueProcessor(i, n);
          return (
            (tagValueProcessor = this.replaceEntitiesValue(tagValueProcessor)),
            tagValueProcessor === ""
              ? this.indentate(l) + "<" + i + u + this.closeTag(i) + this.tagEndChar
              : this.indentate(l) + "<" + i + u + ">" + tagValueProcessor + "</" + i + this.tagEndChar
          );
        }
      }),
      (te.prototype.replaceEntitiesValue = function (n) {
        if (n && n.length > 0 && this.options.processEntities)
          for (let i = 0; i < this.options.entities.length; i++) {
            let u = this.options.entities[i];
            n = n.replace(u.regex, u.val);
          }
        return n;
      }));
    let to = te,
      ro = { validate: m };
    ys.exports = t;
  })();
});

export { Es };
