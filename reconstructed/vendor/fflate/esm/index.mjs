/**
 * fflate/esm/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fflate@0.8.2
 * pieces: chunk-9t1jcaah.js (33)
 * attribution: esm-layout 18, esm-fingerprint 11, layout 4
 */
import { createRequire } from "module";

//@ chunk-9t1jcaah.js:231-249 esm-layout
var Hr = createRequire("/");
var Worker;
//@ chunk-9t1jcaah.js:249-294 esm-fingerprint
try {
  Worker = Hr("worker_threads").Worker;
} catch (e) {}
//@ chunk-9t1jcaah.js:294-760 esm-layout
/**
 * fflate 解压常量表（第三方库 fflate 的 inflate 实现，被误归到 AnimatedAsterisk）。
 */
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0,
]);
var fdeb = new u8([
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0,
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function (eb, start) {
  var b = new u16(31);
  for (var i_2 = 0; i_2 < 31; ++i_2) b[i_2] = start += 1 << eb[i_2 - 1];
  var r = new i32(b[30]);
  for (var i_2 = 1; i_2 < 30; ++i_2)
    for (var j = b[i_2]; j < b[i_2 + 1]; ++j) r[j] = ((j - b[i_2]) << 5) | i_2;
  return {
    b,
    r,
  };
};
var Tr = freb(fleb, 2);
var { b: Wr, r: revfl } = Tr;
//@ chunk-9t1jcaah.js:760-782 esm-layout
Wr[28] = 258;
revfl[258] = 28;
//@ chunk-9t1jcaah.js:782-829 esm-layout
var Ur = freb(fdeb, 0);
var { b: rn, r: revfd } = Ur;
var rev = new u16(32768);
//@ chunk-9t1jcaah.js:829-967 esm-fingerprint
for (i = 0; i < 32768; ++i) {
  x = ((i & 43690) >> 1) | ((i & 21845) << 1);
  x = ((x & 52428) >> 2) | ((x & 13107) << 2);
  x = ((x & 61680) >> 4) | ((x & 3855) << 4);
  rev[i] = (((x & 65280) >> 8) | ((x & 255) << 8)) >> 1;
}
//@ chunk-9t1jcaah.js:967-1352 esm-layout
var x;
var i;
var hMap = function (cd, mb, r) {
  var s_2 = cd.length;
  var i_2 = 0;
  var l_2 = new u16(mb);
  for (; i_2 < s_2; ++i_2) if (cd[i_2]) ++l_2[cd[i_2] - 1];
  var le = new u16(mb);
  for (i_2 = 1; i_2 < mb; ++i_2) le[i_2] = (le[i_2 - 1] + l_2[i_2 - 1]) << 1;
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i_2 = 0; i_2 < s_2; ++i_2)
      if (cd[i_2]) {
        var sv = (i_2 << 4) | cd[i_2];
        var r_1 = mb - cd[i_2];
        var v = le[cd[i_2] - 1]++ << r_1;
        for (var m = v | ((1 << r_1) - 1); v <= m; ++v) co[rev[v] >> rvb] = sv;
      }
  } else {
    co = new u16(s_2);
    for (i_2 = 0; i_2 < s_2; ++i_2) if (cd[i_2]) co[i_2] = rev[le[cd[i_2] - 1]++] >> (15 - cd[i_2]);
  }
  return co;
};
var flt = new u8(288);
//@ chunk-9t1jcaah.js:1352-1377 esm-layout
for (i = 0; i < 144; ++i) flt[i] = 8;
//@ chunk-9t1jcaah.js:1377-1383 esm-layout
var i;
//@ chunk-9t1jcaah.js:1383-1410 esm-layout
for (i = 144; i < 256; ++i) flt[i] = 9;
//@ chunk-9t1jcaah.js:1410-1416 esm-layout
var i;
//@ chunk-9t1jcaah.js:1416-1443 esm-layout
for (i = 256; i < 280; ++i) flt[i] = 7;
//@ chunk-9t1jcaah.js:1443-1449 esm-layout
var i;
//@ chunk-9t1jcaah.js:1449-1476 esm-layout
for (i = 280; i < 288; ++i) flt[i] = 8;
//@ chunk-9t1jcaah.js:1476-1495 esm-layout
var i;
var fdt = new u8(32);
//@ chunk-9t1jcaah.js:1495-1520 esm-layout
for (i = 0; i < 32; ++i) fdt[i] = 5;
//@ chunk-9t1jcaah.js:1520-1539 esm-layout
var i;
var Rr = hMap(flt, 9, 0);
//@ chunk-9t1jcaah.js:1539-1557 esm-layout
var Yr = hMap(fdt, 5, 0);
//@ chunk-9t1jcaah.js:1557-1697 esm-layout
var shft = function (pos) {
  return ((pos + 7) / 8) | 0;
};
var slc = function (v, s, e) {
  if (s == null || s < 0) s = 0;
  if (e == null || e > v.length) e = v.length;
  return new u8(v.subarray(s, e));
};
//@ chunk-9t1jcaah.js:1697-2102 esm-fingerprint
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data",
];
var err = function (ind, msg, nt) {
  var e = Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace) Error.captureStackTrace(e, err);
  if (!nt) throw e;
  return e;
};
//@ chunk-9t1jcaah.js:2102-6473 esm-layout
var wbits = function (d, p, v) {
  v <<= p & 7;
  var o = (p / 8) | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function (d, p, v) {
  v <<= p & 7;
  var o = (p / 8) | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function (d, mb) {
  var t = [];
  for (var i_2 = 0; i_2 < d.length; ++i_2)
    if (d[i_2])
      t.push({
        s: i_2,
        f: d[i_2],
      });
  var s_2 = t.length;
  var sliced = t.slice();
  if (!s_2)
    return {
      t: et,
      l: 0,
    };
  if (s_2 == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return {
      t: v,
      l: 1,
    };
  }
  t.sort(function (a, b) {
    return a.f - b.f;
  });
  t.push({
    s: -1,
    f: 25001,
  });
  var l_2 = t[0];
  var r = t[1];
  var i0 = 0;
  var i1 = 1;
  var i2 = 2;
  t[0] = {
    s: -1,
    f: l_2.f + r.f,
    l: l_2,
    r,
  };
  while (i1 != s_2 - 1) {
    l_2 = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = {
      s: -1,
      f: l_2.f + r.f,
      l: l_2,
      r,
    };
  }
  var maxSym = sliced[0].s;
  for (var i_2 = 1; i_2 < s_2; ++i_2) if (sliced[i_2].s > maxSym) maxSym = sliced[i_2].s;
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i_2 = 0;
    var dt = 0;
    var lft = mbt - mb;
    var cst = 1 << lft;
    sliced.sort(function (a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i_2 < s_2; ++i_2) {
      var i2_1 = sliced[i_2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << (mbt - tr[i2_1]));
        tr[i2_1] = mb;
      } else break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = sliced[i_2].s;
      if (tr[i2_2] < mb) dt -= 1 << (mb - tr[i2_2]++ - 1);
      else ++i_2;
    }
    for (; i_2 >= 0 && dt; --i_2) {
      var i2_3 = sliced[i_2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return {
    t: new u8(tr),
    l: mbt,
  };
};
var ln = function (n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : (l[n.s] = d);
};
var lc = function (c) {
  var s = c.length;
  while (s && !c[--s]);
  var cl = new u16(++s);
  var cli = 0;
  var cln = c[0];
  var cls = 1;
  var w = function (v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i)
    if (c[i] == cln && i != s) ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138) w(32754);
        if (cls > 2) {
          w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln);
        --cls;
        for (; cls > 6; cls -= 6) w(8304);
        if (cls > 2) {
          w(((cls - 3) << 5) | 8208);
          cls = 0;
        }
      }
      while (cls--) w(cln);
      cls = 1;
      cln = c[i];
    }
  return {
    c: cl.subarray(0, cli),
    n: s,
  };
};
var clen = function (cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
  return l;
};
var wfblk = function (out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p_2) {
  wbits(out, p_2++, final);
  ++lf[256];
  var u = hTree(lf, 15);
  var { t: dlt, l: m } = u;
  var w = hTree(df, 15);
  var { t: ddt, l: x } = w;
  var S = lc(dlt);
  var { c: lclt, n: T } = S;
  var C = lc(ddt);
  var { c: lcdt, n: Z } = C;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
  var c = hTree(lcfreq, 7);
  var { t: lct, l: K } = c;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
  var flen = (bl + 5) << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen =
    clen(lf, dlt) +
    clen(df, ddt) +
    eb +
    14 +
    3 * nlcc +
    clen(lcfreq, lct) +
    2 * lcfreq[16] +
    3 * lcfreq[17] +
    7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p_2, dat.subarray(bs, bs + bl));
  var lm;
  var ll;
  var dm;
  var dl;
  wbits(out, p_2, 1 + (dtlen < ftlen));
  p_2 += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, m, 0);
    ll = dlt;
    dm = hMap(ddt, x, 0);
    dl = ddt;
    var llm = hMap(lct, K, 0);
    wbits(out, p_2, T - 257);
    wbits(out, p_2 + 5, Z - 1);
    wbits(out, p_2 + 10, nlcc - 4);
    p_2 += 14;
    for (var i = 0; i < nlcc; ++i) wbits(out, p_2 + 3 * i, lct[clim[i]]);
    p_2 += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p_2, llm[len]);
        p_2 += lct[len];
        if (len > 15) {
          wbits(out, p_2, (clct[i] >> 5) & 127);
          p_2 += clct[i] >> 12;
        }
      }
    }
  } else {
    lm = Rr;
    ll = flt;
    dm = Yr;
    dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = (sym >> 18) & 31;
      wbits16(out, p_2, lm[len + 257]);
      p_2 += ll[len + 257];
      if (len > 7) {
        wbits(out, p_2, (sym >> 23) & 31);
        p_2 += fleb[len];
      }
      var dst = sym & 31;
      wbits16(out, p_2, dm[dst]);
      p_2 += dl[dst];
      if (dst > 3) {
        wbits16(out, p_2, (sym >> 5) & 8191);
        p_2 += fdeb[dst];
      }
    } else {
      wbits16(out, p_2, lm[sym]);
      p_2 += ll[sym];
    }
  }
  wbits16(out, p_2, lm[256]);
  return p_2 + ll[256];
};
var deo = new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = new u8(0);
var dflt = function (dat, lvl, plvl, pre, post, st) {
  var s_2 = st.z || dat.length;
  var o = new u8(pre + s_2 + 5 * (1 + Math.ceil(s_2 / 7000)) + post);
  var w_2 = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos) w_2[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13;
    var c_2 = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768);
    var head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3);
    var bs2_1 = 2 * bs1_1;
    var hsh = function (i) {
      return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1;
    };
    var syms = new i32(25000);
    var lf = new u16(288);
    var df = new u16(32);
    var lc_1 = 0;
    var eb = 0;
    var i = st.i || 0;
    var li = 0;
    var wi = st.w || 0;
    var bs = 0;
    for (; i + 2 < s_2; ++i) {
      var hv = hsh(i);
      var imod = i & 32767;
      var pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s_2 - i;
        if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w_2, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0;
          bs = i;
          for (var j_2 = 0; j_2 < 286; ++j_2) lf[j_2] = 0;
          for (var j_2 = 0; j_2 < 30; ++j_2) df[j_2] = 0;
        }
        var l = 2;
        var d = 0;
        var ch_1 = c_2;
        var dif = (imod - pimod) & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl);
              if (nl > l) {
                l = nl;
                d = dif;
                if (nl > maxn) break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j_2 = 0; j_2 < mmd; ++j_2) {
                  var ti = (i - dif + j_2) & 32767;
                  var pti = prev[ti];
                  var cd = (ti - pti) & 32767;
                  if (cd > md) {
                    md = cd;
                    pimod = ti;
                  }
                }
              }
            }
            imod = pimod;
            pimod = prev[imod];
            dif += (imod - pimod) & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
          var lin = revfl[l] & 31;
          var din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s_2; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w_2, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = (pos & 7) | (w_2[(pos / 8) | 0] << 3);
      pos -= 7;
      st.h = head;
      st.p = prev;
      st.i = i;
      st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s_2 + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s_2) {
        w_2[(pos / 8) | 0] = lst;
        e = s_2;
      }
      pos = wfblk(w_2, pos + 1, dat.subarray(i, e));
    }
    st.i = s_2;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = (function () {
  var t_2 = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i;
    var k = 9;
    while (--k) c = (c & 1 && -306674912) ^ (c >>> 1);
    t_2[i] = c;
  }
  return t_2;
})();
var crc = function () {
  var c = -1;
  return {
    p: function (d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i) cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
      c = cr;
    },
    d: function () {
      return ~c;
    },
  };
};
//@ chunk-9t1jcaah.js:6473-6857 esm-fingerprint
var Gr = function (dat, opt, pre, post, st) {
  if (!st) {
    st = {
      l: 1,
    };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(
    dat,
    opt.level == null ? 6 : opt.level,
    opt.mem == null
      ? st.l
        ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5)
        : 20
      : 12 + opt.mem,
    pre,
    post,
    st,
  );
};
var mrg = function (a, b) {
  var o = {};
  for (var k in a) o[k] = a[k];
  for (var k in b) o[k] = b[k];
  return o;
};
//@ chunk-9t1jcaah.js:6857-6905 esm-layout
var wbytes = function (n, b, v) {
  for (; v; ++b) {
    n[b] = v;
    v >>>= 8;
  }
};
//@ chunk-9t1jcaah.js:6905-7948 esm-fingerprint
var Deflate = (function () {
  function Deflate(opts, cb) {
    if (typeof opts == "function") {
      cb = opts;
      opts = {};
    }
    this.ondata = cb;
    this.o = opts || {};
    this.s = {
      l: 0,
      i: 32768,
      w: 32768,
      z: 32768,
    };
    this.b = new u8(98304);
    if (this.o.dictionary) {
      var dict = this.o.dictionary.subarray(-32768);
      this.b.set(dict, 32768 - dict.length);
      this.s.i = 32768 - dict.length;
    }
  }
  Deflate.prototype.p = function (c, f) {
    this.ondata(Gr(c, this.o, 0, 0, this.s), f);
  };
  Deflate.prototype.push = function (chunk, final) {
    if (!this.ondata) err(5);
    if (this.s.l) err(4);
    var endLen = chunk.length + this.s.z;
    if (endLen > this.b.length) {
      if (endLen > 2 * this.b.length - 32768) {
        var newBuf = new u8(endLen & -32768);
        newBuf.set(this.b.subarray(0, this.s.z));
        this.b = newBuf;
      }
      var split = this.b.length - this.s.z;
      this.b.set(chunk.subarray(0, split), this.s.z);
      this.s.z = this.b.length;
      this.p(this.b, false);
      this.b.set(this.b.subarray(-32768));
      this.b.set(chunk.subarray(split), 32768);
      this.s.z = chunk.length - split + 32768;
      this.s.i = 32766;
      this.s.w = 32768;
    } else {
      this.b.set(chunk, this.s.z);
      this.s.z += chunk.length;
    }
    this.s.l = final & 1;
    if (this.s.z > this.s.w + 8191 || final) {
      this.p(this.b, final || false);
      this.s.w = this.s.i;
      this.s.i -= 2;
    }
  };
  Deflate.prototype.flush = function () {
    if (!this.ondata) err(5);
    if (this.s.l) err(4);
    this.p(this.b, false);
    this.s.w = this.s.i;
    this.s.i -= 2;
  };
  return Deflate;
})();
//@ chunk-9t1jcaah.js:7948-7988 esm-layout
function deflateSync(file, r) {
  return Gr(file, r || {}, 0, 0);
}
//@ chunk-9t1jcaah.js:7988-8252 esm-layout
var fltn = function (d, p, t, o_2) {
  for (var k in d) {
    var val = d[k];
    var n = p + k;
    var op = o_2;
    if (Array.isArray(val)) {
      op = mrg(o_2, val[1]);
      val = val[0];
    }
    if (val instanceof u8) t[n] = [val, op];
    else {
      t[(n += "/")] = [new u8(0), op];
      fltn(val, n, t, o_2);
    }
  }
};
var te = typeof TextEncoder !== "undefined" && new TextEncoder();
var td = typeof TextDecoder !== "undefined" && new TextDecoder();
var tds = 0;
//@ chunk-9t1jcaah.js:8252-8297 esm-fingerprint
try {
  td.decode(et, {
    stream: true,
  });
  tds = 1;
} catch (e) {}
//@ chunk-9t1jcaah.js:8297-8841 esm-fingerprint
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i_2 = 0; i_2 < str.length; ++i_2) ar_1[i_2] = str.charCodeAt(i_2);
    return ar_1;
  }
  if (te) return te.encode(str);
  var l_2 = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function (v) {
    ar[ai++] = v;
  };
  for (var i_2 = 0; i_2 < l_2; ++i_2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + ((l_2 - i_2) << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i_2);
    if (c < 128 || latin1) w(c);
    else if (c < 2048) {
      w(192 | (c >> 6));
      w(128 | (c & 63));
    } else if (c > 55295 && c < 57344) {
      c = (65536 + (c & 1047552)) | (str.charCodeAt(++i_2) & 1023);
      w(240 | (c >> 18));
      w(128 | ((c >> 12) & 63));
      w(128 | ((c >> 6) & 63));
      w(128 | (c & 63));
    } else {
      w(224 | (c >> 12));
      w(128 | ((c >> 6) & 63));
      w(128 | (c & 63));
    }
  }
  return slc(ar, 0, ai);
}
//@ chunk-9t1jcaah.js:8841-8890 esm-layout
var dbf = function (l) {
  return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0;
};
//@ chunk-9t1jcaah.js:8890-10082 esm-fingerprint
var exfl = function (ex) {
  var le = 0;
  if (ex)
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535) err(9);
      le += l + 4;
    }
  return le;
};
var wzh = function (d, b, f_2, fn, u_2, c, ce, co) {
  var fl = fn.length;
  var ex = f_2.extra;
  var col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752);
  b += 4;
  if (ce != null) {
    d[b++] = 20;
    d[b++] = f_2.os;
  }
  d[b] = 20;
  b += 2;
  d[b++] = (f_2.flag << 1) | (c < 0 && 8);
  d[b++] = u_2 && 8;
  d[b++] = f_2.compression & 255;
  d[b++] = f_2.compression >> 8;
  var dt = new Date(f_2.mtime == null ? Date.now() : f_2.mtime);
  var y_2 = dt.getFullYear() - 1980;
  if (y_2 < 0 || y_2 > 119) err(10);
  wbytes(
    d,
    b,
    (y_2 << 25) |
      ((dt.getMonth() + 1) << 21) |
      (dt.getDate() << 16) |
      (dt.getHours() << 11) |
      (dt.getMinutes() << 5) |
      (dt.getSeconds() >> 1),
  );
  b += 4;
  if (c != -1) {
    wbytes(d, b, f_2.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f_2.size);
  }
  wbytes(d, b + 12, fl);
  wbytes(d, b + 14, exl);
  b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f_2.attrs);
    wbytes(d, b + 10, ce);
    b += 14;
  }
  d.set(fn, b);
  b += fl;
  if (exl)
    for (var k in ex) {
      var exf = ex[k];
      var l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4);
      b += 4 + l;
    }
  if (col) {
    d.set(co, b);
    b += col;
  }
  return b;
};
var wzf = function (o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
var ZipPassThrough = (function () {
  function ZipPassThrough(filename) {
    this.filename = filename;
    this.c = crc();
    this.size = 0;
    this.compression = 0;
  }
  ZipPassThrough.prototype.process = function (chunk, final) {
    this.ondata(null, chunk, final);
  };
  ZipPassThrough.prototype.push = function (chunk, final) {
    if (!this.ondata) err(5);
    this.c.p(chunk);
    this.size += chunk.length;
    if (final) this.crc = this.c.d();
    this.process(chunk, final || false);
  };
  return ZipPassThrough;
})();
//@ chunk-9t1jcaah.js:10082-10411 esm-fingerprint
var ZipDeflate = (function () {
  function ZipDeflate(filename, opts) {
    var _this = this;
    if (!opts) opts = {};
    ZipPassThrough.call(this, filename);
    this.d = new Deflate(opts, function (dat, final) {
      _this.ondata(null, dat, final);
    });
    this.compression = 8;
    this.flag = dbf(opts.level);
  }
  ZipDeflate.prototype.process = function (chunk, final) {
    try {
      this.d.push(chunk, final);
    } catch (error) {
      this.ondata(error, null, final);
    }
  };
  ZipDeflate.prototype.push = function (chunk, final) {
    ZipPassThrough.prototype.push.call(this, chunk, final);
  };
  return ZipDeflate;
})();
//@ chunk-9t1jcaah.js:10411-11990 esm-fingerprint
var tn = (function () {
  function Zip(ondata) {
    this.ondata = ondata;
    this.u = [];
    this.d = 1;
  }
  Zip.prototype.add = function (file) {
    var _this = this;
    if (!this.ondata) err(5);
    if (this.d & 2) this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
    else {
      var f_2 = strToU8(file.filename);
      var fl_1 = f_2.length;
      var com = file.comment;
      var o = com && strToU8(com);
      var u_2 = fl_1 != file.filename.length || (o && com.length != o.length);
      var hl_1 = fl_1 + exfl(file.extra) + 30;
      if (fl_1 > 65535) this.ondata(err(11, 0, 1), null, false);
      var header = new u8(hl_1);
      wzh(header, 0, file, f_2, u_2, -1);
      var chks_1 = [header];
      var pAll_1 = function () {
        for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
          var chk = chks_2[_i];
          _this.ondata(null, chk, false);
        }
        chks_1 = [];
      };
      var tr_1 = this.d;
      this.d = 0;
      var ind_1 = this.u.length;
      var uf_1 = mrg(file, {
        f: f_2,
        u: u_2,
        o,
        t: function () {
          if (file.terminate) file.terminate();
        },
        r: function () {
          pAll_1();
          if (tr_1) {
            var nxt = _this.u[ind_1 + 1];
            if (nxt) nxt.r();
            else _this.d = 1;
          }
          tr_1 = 1;
        },
      });
      var cl_1 = 0;
      file.ondata = function (err, dat, final) {
        if (err) {
          _this.ondata(err, dat, final);
          _this.terminate();
        } else {
          cl_1 += dat.length;
          chks_1.push(dat);
          if (final) {
            var dd = new u8(16);
            wbytes(dd, 0, 134695760);
            wbytes(dd, 4, file.crc);
            wbytes(dd, 8, cl_1);
            wbytes(dd, 12, file.size);
            chks_1.push(dd);
            uf_1.c = cl_1;
            uf_1.b = hl_1 + cl_1 + 16;
            uf_1.crc = file.crc;
            uf_1.size = file.size;
            if (tr_1) uf_1.r();
            tr_1 = 1;
          } else if (tr_1) pAll_1();
        }
      };
      this.u.push(uf_1);
    }
  };
  Zip.prototype.end = function () {
    var _this = this;
    if (this.d & 2) {
      this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
      return;
    }
    if (this.d) this.e();
    else
      this.u.push({
        r: function () {
          if (!(_this.d & 1)) return;
          _this.u.splice(-1, 1);
          _this.e();
        },
        t: function () {},
      });
    this.d = 3;
  };
  Zip.prototype.e = function () {
    var bt = 0;
    var l_2 = 0;
    var tl = 0;
    for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
      var f_2 = _a[_i];
      tl += 46 + f_2.f.length + exfl(f_2.extra) + (f_2.o ? f_2.o.length : 0);
    }
    var out = new u8(tl + 22);
    for (var _b = 0, _c = this.u; _b < _c.length; _b++) {
      var f_2 = _c[_b];
      wzh(out, bt, f_2, f_2.f, f_2.u, -f_2.c - 2, l_2, f_2.o);
      bt += 46 + f_2.f.length + exfl(f_2.extra) + (f_2.o ? f_2.o.length : 0);
      l_2 += f_2.b;
    }
    wzf(out, bt, this.u.length, tl, l_2);
    this.ondata(null, out, true);
    this.d = 2;
  };
  Zip.prototype.terminate = function () {
    for (var _i = 0, _a = this.u; _i < _a.length; _i++) {
      var f = _a[_i];
      f.t();
    }
    this.d = 2;
  };
  return Zip;
})();
//@ chunk-9t1jcaah.js:11990-12619 esm-fingerprint
function en(data, r) {
  if (!r) r = {};
  var r_2 = {};
  var files = [];
  fltn(data, "", r_2, r);
  var o_2 = 0;
  var tot = 0;
  for (var fn in r_2) {
    var _a = r_2[fn];
    var file = _a[0];
    var p_2 = _a[1];
    var compression = p_2.level == 0 ? 0 : 8;
    var f = strToU8(fn);
    var s = f.length;
    var com = p_2.comment;
    var m = com && strToU8(com);
    var ms = m && m.length;
    var exl = exfl(p_2.extra);
    if (s > 65535) err(11);
    var d = compression ? deflateSync(file, p_2) : file;
    var l = d.length;
    var c = crc();
    c.p(file);
    files.push(
      mrg(p_2, {
        size: file.length,
        crc: c.d(),
        c: d,
        f,
        m,
        u: s != fn.length || (m && com.length != ms),
        o: o_2,
        compression,
      }),
    );
    o_2 += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22);
  var I = o_2;
  var Z = tot - o_2;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o_2, f, f.f, f.u, f.c.length, f.o, f.m);
    o_2 += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o_2, files.length, Z, I);
  return out;
}
