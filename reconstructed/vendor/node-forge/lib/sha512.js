/**
 * node-forge/lib/sha512.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { bo } from "./md.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:252318-259538 cjs-fingerprint
var $S = x(function (Ffe, HA) {
  var Ir = Tn();
  bo();
  Zn();
  var Tf = (HA.exports = Ir.sha512 = Ir.sha512 || {});
  Ir.md.sha512 = Ir.md.algorithms.sha512 = Tf;
  var WA = (Ir.sha384 = Ir.sha512.sha384 = Ir.sha512.sha384 || {});
  WA.create = function () {
    return Tf.create("SHA-384");
  };
  Ir.md.sha384 = Ir.md.algorithms.sha384 = WA;
  Ir.sha512.sha256 = Ir.sha512.sha256 || {
    create: function () {
      return Tf.create("SHA-512/256");
    },
  };
  Ir.md["sha512/256"] = Ir.md.algorithms["sha512/256"] = Ir.sha512.sha256;
  Ir.sha512.sha224 = Ir.sha512.sha224 || {
    create: function () {
      return Tf.create("SHA-512/224");
    },
  };
  Ir.md["sha512/224"] = Ir.md.algorithms["sha512/224"] = Ir.sha512.sha224;
  Tf.create = function (e) {
    if (!GA) v6();
    if (typeof e > "u") e = "SHA-512";
    if (!(e in uc)) throw Error("Invalid SHA-512 algorithm: " + e);
    var n = uc[e],
      r = null,
      buffer = Ir.util.createBuffer(),
      h = Array(80);
    for (var y = 0; y < 80; ++y) h[y] = [, ,];
    var b = 64;
    switch (e) {
      case "SHA-384":
        b = 48;
        break;
      case "SHA-512/256":
        b = 32;
        break;
      case "SHA-512/224":
        b = 28;
        break;
    }
    var S = {
      algorithm: e.replace("-", "").toLowerCase(),
      blockLength: 128,
      digestLength: b,
      messageLength: 0,
      fullMessageLength: null,
      messageLengthSize: 16,
    };
    return (
      (S.start = function () {
        ((S.messageLength = 0), (S.fullMessageLength = S.messageLength128 = []));
        var w = S.messageLengthSize / 4;
        for (var R = 0; R < w; ++R) S.fullMessageLength.push(0);
        ((buffer = Ir.util.createBuffer()), (r = Array(n.length)));
        for (var R = 0; R < n.length; ++R) r[R] = n[R].slice(0);
        return S;
      }),
      S.start(),
      (S.update = function (w, R) {
        if (R === "utf8") w = Ir.util.encodeUtf8(w);
        var D = w.length;
        ((S.messageLength += D), (D = [(D / 4294967296) >>> 0, D >>> 0]));
        for (var O = S.fullMessageLength.length - 1; O >= 0; --O)
          ((S.fullMessageLength[O] += D[1]),
            (D[1] = D[0] + ((S.fullMessageLength[O] / 4294967296) >>> 0)),
            (S.fullMessageLength[O] = S.fullMessageLength[O] >>> 0),
            (D[0] = (D[1] / 4294967296) >>> 0));
        if ((buffer.putBytes(w), VA(r, h, buffer), buffer.read > 2048 || buffer.length() === 0))
          buffer.compact();
        return S;
      }),
      (S.digest = function () {
        var buffer_2 = Ir.util.createBuffer();
        buffer_2.putBytes(buffer.bytes());
        var R = S.fullMessageLength[S.fullMessageLength.length - 1] + S.messageLengthSize,
          D = R & (S.blockLength - 1);
        buffer_2.putBytes(FS.substr(0, S.blockLength - D));
        var O,
          L,
          V = S.fullMessageLength[0] * 8;
        for (var K = 0; K < S.fullMessageLength.length - 1; ++K)
          ((O = S.fullMessageLength[K + 1] * 8),
            (L = (O / 4294967296) >>> 0),
            (V += L),
            buffer_2.putInt32(V >>> 0),
            (V = O >>> 0));
        buffer_2.putInt32(V);
        var q = Array(r.length);
        for (var K = 0; K < r.length; ++K) q[K] = r[K].slice(0);
        VA(q, h, buffer_2);
        var buffer_3 = Ir.util.createBuffer(),
          J;
        if (e === "SHA-512") J = q.length;
        else if (e === "SHA-384") J = q.length - 2;
        else J = q.length - 4;
        for (var K = 0; K < J; ++K)
          if ((buffer_3.putInt32(q[K][0]), K !== J - 1 || e !== "SHA-512/224")) buffer_3.putInt32(q[K][1]);
        return buffer_3;
      }),
      S
    );
  };
  var FS = null,
    GA = !1,
    MS = null,
    uc = null;
  function v6() {
    ((FS = String.fromCharCode(128)),
      (FS += Ir.util.fillString(String.fromCharCode(0), 128)),
      (MS = [
        [1116352408, 3609767458],
        [1899447441, 602891725],
        [3049323471, 3964484399],
        [3921009573, 2173295548],
        [961987163, 4081628472],
        [1508970993, 3053834265],
        [2453635748, 2937671579],
        [2870763221, 3664609560],
        [3624381080, 2734883394],
        [310598401, 1164996542],
        [607225278, 1323610764],
        [1426881987, 3590304994],
        [1925078388, 4068182383],
        [2162078206, 991336113],
        [2614888103, 633803317],
        [3248222580, 3479774868],
        [3835390401, 2666613458],
        [4022224774, 944711139],
        [264347078, 2341262773],
        [604807628, 2007800933],
        [770255983, 1495990901],
        [1249150122, 1856431235],
        [1555081692, 3175218132],
        [1996064986, 2198950837],
        [2554220882, 3999719339],
        [2821834349, 766784016],
        [2952996808, 2566594879],
        [3210313671, 3203337956],
        [3336571891, 1034457026],
        [3584528711, 2466948901],
        [113926993, 3758326383],
        [338241895, 168717936],
        [666307205, 1188179964],
        [773529912, 1546045734],
        [1294757372, 1522805485],
        [1396182291, 2643833823],
        [1695183700, 2343527390],
        [1986661051, 1014477480],
        [2177026350, 1206759142],
        [2456956037, 344077627],
        [2730485921, 1290863460],
        [2820302411, 3158454273],
        [3259730800, 3505952657],
        [3345764771, 106217008],
        [3516065817, 3606008344],
        [3600352804, 1432725776],
        [4094571909, 1467031594],
        [275423344, 851169720],
        [430227734, 3100823752],
        [506948616, 1363258195],
        [659060556, 3750685593],
        [883997877, 3785050280],
        [958139571, 3318307427],
        [1322822218, 3812723403],
        [1537002063, 2003034995],
        [1747873779, 3602036899],
        [1955562222, 1575990012],
        [2024104815, 1125592928],
        [2227730452, 2716904306],
        [2361852424, 442776044],
        [2428436474, 593698344],
        [2756734187, 3733110249],
        [3204031479, 2999351573],
        [3329325298, 3815920427],
        [3391569614, 3928383900],
        [3515267271, 566280711],
        [3940187606, 3454069534],
        [4118630271, 4000239992],
        [116418474, 1914138554],
        [174292421, 2731055270],
        [289380356, 3203993006],
        [460393269, 320620315],
        [685471733, 587496836],
        [852142971, 1086792851],
        [1017036298, 365543100],
        [1126000580, 2618297676],
        [1288033470, 3409855158],
        [1501505948, 4234509866],
        [1607167915, 987167468],
        [1816402316, 1246189591],
      ]),
      (uc = {}),
      (uc["SHA-512"] = [
        [1779033703, 4089235720],
        [3144134277, 2227873595],
        [1013904242, 4271175723],
        [2773480762, 1595750129],
        [1359893119, 2917565137],
        [2600822924, 725511199],
        [528734635, 4215389547],
        [1541459225, 327033209],
      ]),
      (uc["SHA-384"] = [
        [3418070365, 3238371032],
        [1654270250, 914150663],
        [2438529370, 812702999],
        [355462360, 4144912697],
        [1731405415, 4290775857],
        [2394180231, 1750603025],
        [3675008525, 1694076839],
        [1203062813, 3204075428],
      ]),
      (uc["SHA-512/256"] = [
        [573645204, 4230739756],
        [2673172387, 3360449730],
        [596883563, 1867755857],
        [2520282905, 1497426621],
        [2519219938, 2827943907],
        [3193839141, 1401305490],
        [721525244, 746961066],
        [246885852, 2177182882],
      ]),
      (uc["SHA-512/224"] = [
        [2352822216, 424955298],
        [1944164710, 2312950998],
        [502970286, 855612546],
        [1738396948, 1479516111],
        [258812777, 2077511080],
        [2011393907, 79989058],
        [1067287976, 1780299464],
        [286451373, 2446758561],
      ]),
      (GA = !0));
  }
  function VA(e, n, r) {
    var s,
      h,
      y,
      b,
      S,
      w,
      R,
      D,
      O,
      L,
      V,
      K,
      q,
      Z,
      J,
      ie,
      ae,
      Se,
      ue,
      me,
      Ne,
      Ce,
      Ie,
      he,
      ft,
      rt,
      ut,
      we,
      Ae,
      dt,
      Me,
      Ft,
      xn,
      mt,
      Mt,
      mn = r.length();
    while (mn >= 128) {
      for (Ae = 0; Ae < 16; ++Ae) ((n[Ae][0] = r.getInt32() >>> 0), (n[Ae][1] = r.getInt32() >>> 0));
      for (; Ae < 80; ++Ae)
        ((Ft = n[Ae - 2]),
          (dt = Ft[0]),
          (Me = Ft[1]),
          (s = (((dt >>> 19) | (Me << 13)) ^ ((Me >>> 29) | (dt << 3)) ^ (dt >>> 6)) >>> 0),
          (h = (((dt << 13) | (Me >>> 19)) ^ ((Me << 3) | (dt >>> 29)) ^ ((dt << 26) | (Me >>> 6))) >>> 0),
          (mt = n[Ae - 15]),
          (dt = mt[0]),
          (Me = mt[1]),
          (y = (((dt >>> 1) | (Me << 31)) ^ ((dt >>> 8) | (Me << 24)) ^ (dt >>> 7)) >>> 0),
          (b = (((dt << 31) | (Me >>> 1)) ^ ((dt << 24) | (Me >>> 8)) ^ ((dt << 25) | (Me >>> 7))) >>> 0),
          (xn = n[Ae - 7]),
          (Mt = n[Ae - 16]),
          (Me = h + xn[1] + b + Mt[1]),
          (n[Ae][0] = (s + xn[0] + y + Mt[0] + ((Me / 4294967296) >>> 0)) >>> 0),
          (n[Ae][1] = Me >>> 0));
      ((q = e[0][0]),
        (Z = e[0][1]),
        (J = e[1][0]),
        (ie = e[1][1]),
        (ae = e[2][0]),
        (Se = e[2][1]),
        (ue = e[3][0]),
        (me = e[3][1]),
        (Ne = e[4][0]),
        (Ce = e[4][1]),
        (Ie = e[5][0]),
        (he = e[5][1]),
        (ft = e[6][0]),
        (rt = e[6][1]),
        (ut = e[7][0]),
        (we = e[7][1]));
      for (Ae = 0; Ae < 80; ++Ae)
        ((R = (((Ne >>> 14) | (Ce << 18)) ^ ((Ne >>> 18) | (Ce << 14)) ^ ((Ce >>> 9) | (Ne << 23))) >>> 0),
          (D = (((Ne << 18) | (Ce >>> 14)) ^ ((Ne << 14) | (Ce >>> 18)) ^ ((Ce << 23) | (Ne >>> 9))) >>> 0),
          (O = (ft ^ (Ne & (Ie ^ ft))) >>> 0),
          (L = (rt ^ (Ce & (he ^ rt))) >>> 0),
          (S = (((q >>> 28) | (Z << 4)) ^ ((Z >>> 2) | (q << 30)) ^ ((Z >>> 7) | (q << 25))) >>> 0),
          (w = (((q << 4) | (Z >>> 28)) ^ ((Z << 30) | (q >>> 2)) ^ ((Z << 25) | (q >>> 7))) >>> 0),
          (V = ((q & J) | (ae & (q ^ J))) >>> 0),
          (K = ((Z & ie) | (Se & (Z ^ ie))) >>> 0),
          (Me = we + D + L + MS[Ae][1] + n[Ae][1]),
          (s = (ut + R + O + MS[Ae][0] + n[Ae][0] + ((Me / 4294967296) >>> 0)) >>> 0),
          (h = Me >>> 0),
          (Me = w + K),
          (y = (S + V + ((Me / 4294967296) >>> 0)) >>> 0),
          (b = Me >>> 0),
          (ut = ft),
          (we = rt),
          (ft = Ie),
          (rt = he),
          (Ie = Ne),
          (he = Ce),
          (Me = me + h),
          (Ne = (ue + s + ((Me / 4294967296) >>> 0)) >>> 0),
          (Ce = Me >>> 0),
          (ue = ae),
          (me = Se),
          (ae = J),
          (Se = ie),
          (J = q),
          (ie = Z),
          (Me = h + b),
          (q = (s + y + ((Me / 4294967296) >>> 0)) >>> 0),
          (Z = Me >>> 0));
      ((Me = e[0][1] + Z),
        (e[0][0] = (e[0][0] + q + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[0][1] = Me >>> 0),
        (Me = e[1][1] + ie),
        (e[1][0] = (e[1][0] + J + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[1][1] = Me >>> 0),
        (Me = e[2][1] + Se),
        (e[2][0] = (e[2][0] + ae + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[2][1] = Me >>> 0),
        (Me = e[3][1] + me),
        (e[3][0] = (e[3][0] + ue + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[3][1] = Me >>> 0),
        (Me = e[4][1] + Ce),
        (e[4][0] = (e[4][0] + Ne + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[4][1] = Me >>> 0),
        (Me = e[5][1] + he),
        (e[5][0] = (e[5][0] + Ie + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[5][1] = Me >>> 0),
        (Me = e[6][1] + rt),
        (e[6][0] = (e[6][0] + ft + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[6][1] = Me >>> 0),
        (Me = e[7][1] + we),
        (e[7][0] = (e[7][0] + ut + ((Me / 4294967296) >>> 0)) >>> 0),
        (e[7][1] = Me >>> 0),
        (mn -= 128));
    }
  }
});

export { $S };
