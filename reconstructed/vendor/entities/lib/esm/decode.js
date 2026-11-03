/**
 * entities/lib/esm/decode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: entities@4.5.0
 * pieces: chunk-6ja29j2n.js (15)
 * attribution: esm-layout 4, esm-fingerprint 11
 */
import { Re, Le } from "./decode_codepoint.js";

//@ chunk-6ja29j2n.js:57771-57777 esm-layout
var N;
//@ chunk-6ja29j2n.js:57777-58090 esm-fingerprint
(function (e) {
  ((e[(e.NUM = 35)] = "NUM"),
    (e[(e.SEMI = 59)] = "SEMI"),
    (e[(e.EQUALS = 61)] = "EQUALS"),
    (e[(e.ZERO = 48)] = "ZERO"),
    (e[(e.NINE = 57)] = "NINE"),
    (e[(e.LOWER_A = 97)] = "LOWER_A"),
    (e[(e.LOWER_F = 102)] = "LOWER_F"),
    (e[(e.LOWER_X = 120)] = "LOWER_X"),
    (e[(e.LOWER_Z = 122)] = "LOWER_Z"),
    (e[(e.UPPER_A = 65)] = "UPPER_A"),
    (e[(e.UPPER_F = 70)] = "UPPER_F"),
    (e[(e.UPPER_Z = 90)] = "UPPER_Z"));
})(N || (N = {}));
//@ chunk-6ja29j2n.js:58090-58102 esm-layout
var At = 32,
  P;
//@ chunk-6ja29j2n.js:58102-58241 esm-fingerprint
(function (e) {
  ((e[(e.VALUE_LENGTH = 49152)] = "VALUE_LENGTH"),
    (e[(e.BRANCH_LENGTH = 16256)] = "BRANCH_LENGTH"),
    (e[(e.JUMP_TABLE = 127)] = "JUMP_TABLE"));
})(P || (P = {}));
//@ chunk-6ja29j2n.js:58241-58284 esm-fingerprint
function Te(e) {
  return e >= N.ZERO && e <= N.NINE;
}
//@ chunk-6ja29j2n.js:58284-58361 esm-fingerprint
function Nt(e) {
  return (e >= N.UPPER_A && e <= N.UPPER_F) || (e >= N.LOWER_A && e <= N.LOWER_F);
}
//@ chunk-6ja29j2n.js:58361-58445 esm-fingerprint
function It(e) {
  return (e >= N.UPPER_A && e <= N.UPPER_Z) || (e >= N.LOWER_A && e <= N.LOWER_Z) || Te(e);
}
//@ chunk-6ja29j2n.js:58445-58487 esm-fingerprint
function Ct(e) {
  return e === N.EQUALS || It(e);
}
//@ chunk-6ja29j2n.js:58487-58493 esm-layout
var A;
//@ chunk-6ja29j2n.js:58493-58690 esm-fingerprint
(function (e) {
  ((e[(e.EntityStart = 0)] = "EntityStart"),
    (e[(e.NumericStart = 1)] = "NumericStart"),
    (e[(e.NumericDecimal = 2)] = "NumericDecimal"),
    (e[(e.NumericHex = 3)] = "NumericHex"),
    (e[(e.NamedEntity = 4)] = "NamedEntity"));
})(A || (A = {}));
//@ chunk-6ja29j2n.js:58690-58696 esm-layout
var D;
//@ chunk-6ja29j2n.js:58696-58797 esm-fingerprint
(function (e) {
  ((e[(e.Legacy = 0)] = "Legacy"), (e[(e.Strict = 1)] = "Strict"), (e[(e.Attribute = 2)] = "Attribute"));
})(D || (D = {}));
//@ chunk-6ja29j2n.js:58797-62166 esm-fingerprint
class J {
  constructor(e, t, a) {
    ((this.decodeTree = e),
      (this.emitCodePoint = t),
      (this.errors = a),
      (this.state = A.EntityStart),
      (this.consumed = 1),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.decodeMode = D.Strict));
  }
  startEntity(e) {
    ((this.decodeMode = e),
      (this.state = A.EntityStart),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.consumed = 1));
  }
  write(e, t) {
    switch (this.state) {
      case A.EntityStart: {
        if (e.charCodeAt(t) === N.NUM)
          return ((this.state = A.NumericStart), (this.consumed += 1), this.stateNumericStart(e, t + 1));
        return ((this.state = A.NamedEntity), this.stateNamedEntity(e, t));
      }
      case A.NumericStart:
        return this.stateNumericStart(e, t);
      case A.NumericDecimal:
        return this.stateNumericDecimal(e, t);
      case A.NumericHex:
        return this.stateNumericHex(e, t);
      case A.NamedEntity:
        return this.stateNamedEntity(e, t);
    }
  }
  stateNumericStart(e, t) {
    if (t >= e.length) return -1;
    if ((e.charCodeAt(t) | At) === N.LOWER_X)
      return ((this.state = A.NumericHex), (this.consumed += 1), this.stateNumericHex(e, t + 1));
    return ((this.state = A.NumericDecimal), this.stateNumericDecimal(e, t));
  }
  addToNumericResult(e, t, a, n) {
    if (t !== a) {
      let d = a - t;
      ((this.result = this.result * Math.pow(n, d) + parseInt(e.substr(t, d), n)), (this.consumed += d));
    }
  }
  stateNumericHex(e, t) {
    let a = t;
    while (t < e.length) {
      let code = e.charCodeAt(t);
      if (Te(code) || Nt(code)) t += 1;
      else return (this.addToNumericResult(e, a, t, 16), this.emitNumericEntity(code, 3));
    }
    return (this.addToNumericResult(e, a, t, 16), -1);
  }
  stateNumericDecimal(e, t) {
    let a = t;
    while (t < e.length) {
      let code = e.charCodeAt(t);
      if (Te(code)) t += 1;
      else return (this.addToNumericResult(e, a, t, 10), this.emitNumericEntity(code, 2));
    }
    return (this.addToNumericResult(e, a, t, 10), -1);
  }
  emitNumericEntity(e, t) {
    var a;
    if (this.consumed <= t)
      return (
        (a = this.errors) === null ||
          a === void 0 ||
          a.absenceOfDigitsInNumericCharacterReference(this.consumed),
        0
      );
    if (e === N.SEMI) this.consumed += 1;
    else if (this.decodeMode === D.Strict) return 0;
    if ((this.emitCodePoint(Re(this.result), this.consumed), this.errors)) {
      if (e !== N.SEMI) this.errors.missingSemicolonAfterCharacterReference();
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  stateNamedEntity(e, t) {
    let { decodeTree: decodeTree } = this,
      n = decodeTree[this.treeIndex],
      d = (n & P.VALUE_LENGTH) >> 14;
    for (; t < e.length; t++, this.excess++) {
      let code = e.charCodeAt(t);
      if (((this.treeIndex = Ot(decodeTree, n, this.treeIndex + Math.max(1, d), code)), this.treeIndex < 0))
        return this.result === 0 || (this.decodeMode === D.Attribute && (d === 0 || Ct(code)))
          ? 0
          : this.emitNotTerminatedNamedEntity();
      if (((n = decodeTree[this.treeIndex]), (d = (n & P.VALUE_LENGTH) >> 14), d !== 0)) {
        if (code === N.SEMI) return this.emitNamedEntityData(this.treeIndex, d, this.consumed + this.excess);
        if (this.decodeMode !== D.Strict)
          ((this.result = this.treeIndex), (this.consumed += this.excess), (this.excess = 0));
      }
    }
    return -1;
  }
  emitNotTerminatedNamedEntity() {
    var e;
    let { result: t, decodeTree: decodeTree } = this,
      n = (decodeTree[t] & P.VALUE_LENGTH) >> 14;
    return (
      this.emitNamedEntityData(t, n, this.consumed),
      (e = this.errors) === null || e === void 0 || e.missingSemicolonAfterCharacterReference(),
      this.consumed
    );
  }
  emitNamedEntityData(e, t, a) {
    let { decodeTree: decodeTree } = this;
    if ((this.emitCodePoint(t === 1 ? decodeTree[e] & ~P.VALUE_LENGTH : decodeTree[e + 1], a), t === 3))
      this.emitCodePoint(decodeTree[e + 2], a);
    return a;
  }
  end() {
    var e;
    switch (this.state) {
      case A.NamedEntity:
        return this.result !== 0 && (this.decodeMode !== D.Attribute || this.result === this.treeIndex)
          ? this.emitNotTerminatedNamedEntity()
          : 0;
      case A.NumericDecimal:
        return this.emitNumericEntity(0, 2);
      case A.NumericHex:
        return this.emitNumericEntity(0, 3);
      case A.NumericStart:
        return (
          (e = this.errors) === null ||
            e === void 0 ||
            e.absenceOfDigitsInNumericCharacterReference(this.consumed),
          0
        );
      case A.EntityStart:
        return 0;
    }
  }
}
//@ chunk-6ja29j2n.js:62166-62413 esm-fingerprint
function De(e) {
  let t = "",
    a = new J(e, (n) => (t += Le(n)));
  return function (d, h) {
    let l = 0,
      _ = 0;
    while ((_ = d.indexOf("&", _)) >= 0) {
      ((t += d.slice(l, _)), a.startEntity(h));
      let write = a.write(d, _ + 1);
      if (write < 0) {
        l = _ + a.end();
        break;
      }
      ((l = _ + write), (_ = write === 0 ? l + 1 : l));
    }
    let b = t + d.slice(l);
    return ((t = ""), b);
  };
}
//@ chunk-6ja29j2n.js:62413-62667 esm-fingerprint
function Ot(e, t, a, n) {
  let d = (t & P.BRANCH_LENGTH) >> 7,
    h = t & P.JUMP_TABLE;
  if (d === 0) return h !== 0 && n === h ? a : -1;
  if (h) {
    let b = n - h;
    return b < 0 || b >= d ? -1 : e[a + b] - 1;
  }
  let l = a,
    _ = l + d - 1;
  while (l <= _) {
    let b = (l + _) >>> 1,
      S = e[b];
    if (S < n) l = b + 1;
    else if (S > n) _ = b - 1;
    else return e[b + d];
  }
  return -1;
}

export { De, J, D };
