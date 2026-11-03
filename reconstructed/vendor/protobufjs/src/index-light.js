/**
 * protobufjs/src/index-light.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { tIo } from "./index-minimal.js";
import { Ka } from "./encoder.js";
import { qa } from "./decoder.js";
import { za } from "./verifier.js";
import { ja } from "./converter.js";
import { Kt } from "./object.js";
import { zr } from "./namespace.js";
import { xs } from "./root.js";
import { nt } from "./enum.js";
import { Ps } from "./type.js";
import { Yt } from "./field.js";
import { Sr } from "./oneof.js";
import { Ts } from "./mapfield.js";
import { bs } from "./service.js";
import { Rs } from "./method.js";
import { Os } from "./message.js";
import { Ga } from "./wrappers.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:129796-130453 cjs-fingerprint
var Wd = x(function (CA, Hd) {
  var z = (Hd.exports = tIo());
  z.build = "light";
  function zE(e, t, r) {
    if (typeof t === "function") ((r = t), (t = new z.Root()));
    else if (!t) t = new z.Root();
    return t.load(e, r);
  }
  z.load = zE;
  function HE(e, t) {
    if (!t) t = new z.Root();
    return t.loadSync(e);
  }
  z.loadSync = HE;
  z.encoder = Ka();
  z.decoder = qa();
  z.verifier = za();
  z.converter = ja();
  z.ReflectionObject = Kt();
  z.Namespace = zr();
  z.Root = xs();
  z.Enum = nt();
  z.Type = Ps();
  z.Field = Yt();
  z.OneOf = Sr();
  z.MapField = Ts();
  z.Service = bs();
  z.Method = Rs();
  z.Message = Os();
  z.wrappers = Ga();
  z.types = Cr();
  z.util = de();
  z.ReflectionObject._configure(z.Root);
  z.Namespace._configure(z.Type, z.Service, z.Enum);
  z.Root._configure(z.Type);
  z.Field._configure(z.Type);
});

export { Wd };
