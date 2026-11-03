/**
 * @aws-sdk/xml-builder/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/xml-builder@3.921.0..3.972.5
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xs } from "./xml-parser.js";

//@ chunk-edce4vxq.js:74087-75638 cjs-fingerprint
var jt = x(function (bs) {
  var Aa = xs();
  function Ra(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function Ia(e) {
    return e
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r/g, "&#x0D;")
      .replace(/\n/g, "&#x0A;")
      .replace(/\u0085/g, "&#x85;")
      .replace(/\u2028/, "&#x2028;");
  }
  class Ft {
    value;
    constructor(e) {
      this.value = e;
    }
    toString() {
      return Ia("" + this.value);
    }
  }
  class Ue {
    name;
    children;
    attributes = {};
    static of(e, t, r) {
      let s = new Ue(e);
      if (t !== void 0) s.addChildNode(new Ft(t));
      if (r !== void 0) s.withName(r);
      return s;
    }
    constructor(e, t = []) {
      ((this.name = e), (this.children = t));
    }
    withName(e) {
      return ((this.name = e), this);
    }
    addAttribute(e, t) {
      return ((this.attributes[e] = t), this);
    }
    addChildNode(e) {
      return (this.children.push(e), this);
    }
    removeAttribute(e) {
      return (delete this.attributes[e], this);
    }
    n(e) {
      return ((this.name = e), this);
    }
    c(e) {
      return (this.children.push(e), this);
    }
    a(e, t) {
      if (t != null) this.attributes[e] = t;
      return this;
    }
    cc(e, t, r = t) {
      if (e[t] != null) {
        let withName = Ue.of(t, e[t]).withName(r);
        this.c(withName);
      }
    }
    l(e, t, r, s) {
      if (e[t] != null)
        s().map((a) => {
          (a.withName(r), this.c(a));
        });
    }
    lc(e, t, r, s) {
      if (e[t] != null) {
        let o = s(),
          a = new Ue(r);
        (o.map((c) => {
          a.c(c);
        }),
          this.c(a));
      }
    }
    toString() {
      let e = Boolean(this.children.length),
        t = `<${this.name}`,
        attributes = this.attributes;
      for (let s of Object.keys(attributes)) {
        let o = attributes[s];
        if (o != null) t += ` ${s}="${Ra("" + o)}"`;
      }
      return (t += !e ? "/>" : `>${this.children.map((s) => s.toString()).join("")}</${this.name}>`);
    }
  }
  Object.defineProperty(bs, "parseXML", {
    enumerable: !0,
    get: function () {
      return Aa.parseXML;
    },
  });
  bs.XmlNode = Ue;
  bs.XmlText = Ft;
});

export { jt };
