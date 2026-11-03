/**
 * protobufjs/src/writer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { QGe } from "./util/minimal.js";

//@ chunk-798ashq9.js:30944-34145 cjs-fingerprint
var yHr = x(function (Oc, _r) {
  _r.exports = w;
  var j = QGe(),
    Wt,
    { LongBits: LongBits, base64: base64, utf8: utf8 } = j;
  function vt(l, u, f) {
    ((this.fn = l), (this.len = u), (this.next = void 0), (this.val = f));
  }
  function Xt() {}
  function Fi(l) {
    ((this.head = l.head), (this.tail = l.tail), (this.len = l.len), (this.next = l.states));
  }
  function w() {
    ((this.len = 0), (this.head = new vt(Xt, 0, 0)), (this.tail = this.head), (this.states = null));
  }
  var Ir = function () {
    return j.Buffer
      ? function () {
          return (w.create = function () {
            return new Wt();
          })();
        }
      : function () {
          return new w();
        };
  };
  w.create = Ir();
  w.alloc = function (u) {
    return new j.Array(u);
  };
  if (j.Array !== Array) w.alloc = j.pool(w.alloc, j.Array.prototype.subarray);
  w.prototype._push = function (u, f, d) {
    return ((this.tail = this.tail.next = new vt(u, f, d)), (this.len += f), this);
  };
  function Zt(l, u, f) {
    u[f] = l & 255;
  }
  function Ki(l, u, f) {
    while (l > 127) ((u[f++] = (l & 127) | 128), (l >>>= 7));
    u[f] = l;
  }
  function Qt(l, u) {
    ((this.len = l), (this.next = void 0), (this.val = u));
  }
  Qt.prototype = Object.create(vt.prototype);
  Qt.prototype.fn = Ki;
  w.prototype.uint32 = function (u) {
    return (
      (this.len += (this.tail = this.tail.next =
        new Qt((u = u >>> 0) < 128 ? 1 : u < 16384 ? 2 : u < 2097152 ? 3 : u < 268435456 ? 4 : 5, u)).len),
      this
    );
  };
  w.prototype.int32 = function (u) {
    return u < 0 ? this._push(te, 10, LongBits.fromNumber(u)) : this.uint32(u);
  };
  w.prototype.sint32 = function (u) {
    return this.uint32(((u << 1) ^ (u >> 31)) >>> 0);
  };
  function te(l, u, f) {
    while (l.hi) ((u[f++] = (l.lo & 127) | 128), (l.lo = ((l.lo >>> 7) | (l.hi << 25)) >>> 0), (l.hi >>>= 7));
    while (l.lo > 127) ((u[f++] = (l.lo & 127) | 128), (l.lo = l.lo >>> 7));
    u[f++] = l.lo;
  }
  w.prototype.uint64 = function (u) {
    var from = LongBits.from(u);
    return this._push(te, from.length(), from);
  };
  w.prototype.int64 = w.prototype.uint64;
  w.prototype.sint64 = function (u) {
    var zzEncode = LongBits.from(u).zzEncode();
    return this._push(te, zzEncode.length(), zzEncode);
  };
  w.prototype.bool = function (u) {
    return this._push(Zt, 1, u ? 1 : 0);
  };
  function $t(l, u, f) {
    ((u[f] = l & 255), (u[f + 1] = (l >>> 8) & 255), (u[f + 2] = (l >>> 16) & 255), (u[f + 3] = l >>> 24));
  }
  w.prototype.fixed32 = function (u) {
    return this._push($t, 4, u >>> 0);
  };
  w.prototype.sfixed32 = w.prototype.fixed32;
  w.prototype.fixed64 = function (u) {
    var from = LongBits.from(u);
    return this._push($t, 4, from.lo)._push($t, 4, from.hi);
  };
  w.prototype.sfixed64 = w.prototype.fixed64;
  w.prototype.float = function (u) {
    return this._push(j.float.writeFloatLE, 4, u);
  };
  w.prototype.double = function (u) {
    return this._push(j.float.writeDoubleLE, 8, u);
  };
  var ji = j.Array.prototype.set
    ? function (u, f, d) {
        f.set(u, d);
      }
    : function (u, f, d) {
        for (var i = 0; i < u.length; ++i) f[d + i] = u[i];
      };
  w.prototype.bytes = function (u) {
    var f = u.length >>> 0;
    if (!f) return this._push(Zt, 1, 0);
    if (j.isString(u)) {
      var alloc = w.alloc((f = base64.length(u)));
      (base64.decode(u, alloc, 0), (u = alloc));
    }
    return this.uint32(f)._push(ji, f, u);
  };
  w.prototype.string = function (u) {
    var f = utf8.length(u);
    return f ? this.uint32(f)._push(utf8.write, f, u) : this._push(Zt, 1, 0);
  };
  w.prototype.fork = function () {
    return ((this.states = new Fi(this)), (this.head = this.tail = new vt(Xt, 0, 0)), (this.len = 0), this);
  };
  w.prototype.reset = function () {
    if (this.states)
      ((this.head = this.states.head),
        (this.tail = this.states.tail),
        (this.len = this.states.len),
        (this.states = this.states.next));
    else ((this.head = this.tail = new vt(Xt, 0, 0)), (this.len = 0));
    return this;
  };
  w.prototype.ldelim = function () {
    var head = this.head,
      tail = this.tail,
      len = this.len;
    if ((this.reset().uint32(len), len))
      ((this.tail.next = head.next), (this.tail = tail), (this.len += len));
    return this;
  };
  w.prototype.finish = function () {
    var u = this.head.next,
      alloc = this.constructor.alloc(this.len),
      d = 0;
    while (u) (u.fn(u.val, alloc, d), (d += u.len), (u = u.next));
    return alloc;
  };
  w._configure = function (l) {
    ((Wt = l), (w.create = Ir()), Wt._configure());
  };
});

export { yHr };
