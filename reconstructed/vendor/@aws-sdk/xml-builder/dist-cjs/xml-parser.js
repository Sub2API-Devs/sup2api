/**
 * @aws-sdk/xml-builder/dist-cjs/xml-parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/xml-builder@3.921.0..3.972.5
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Es } from "../../../fast-xml-parser/lib/fxp.cjs";

//@ chunk-edce4vxq.js:73699-74087 cjs-fingerprint
var xs = x(function (ws) {
  Object.defineProperty(ws, "__esModule", { value: !0 });
  ws.parseXML = _a;
  var Ss = Es(),
    Vt = new Ss.XMLParser({
      attributeNamePrefix: "",
      htmlEntities: !0,
      ignoreAttributes: !1,
      ignoreDeclaration: !0,
      parseTagValue: !1,
      trimValues: !1,
      tagValueProcessor: (e, t) =>
        t.trim() === "" &&
        t.includes(`
`)
          ? ""
          : void 0,
    });
  Vt.addEntity("#xD", "\r");
  Vt.addEntity(
    "#10",
    `
`,
  );
  function _a(e) {
    return Vt.parse(e, !0);
  }
});

export { xs };
