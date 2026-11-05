/**
 * @aws-sdk/xml-builder/dist-cjs/xml-parser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/xml-builder@3.921.0..3.972.5
 * pieces: chunk-3p78mpxm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_fxp } from "../../../fast-xml-parser/lib/fxp.cjs";

//@ chunk-3p78mpxm.js:73699-74087 cjs-fingerprint
var require_xml_parser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseXML = parseXML;
  var fast_xml_parser_1 = require_fxp();
  var parser = new fast_xml_parser_1.XMLParser({
    attributeNamePrefix: "",
    htmlEntities: true,
    ignoreAttributes: false,
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: false,
    tagValueProcessor: (_, val) =>
      val.trim() === "" &&
      val.includes(`
`)
        ? ""
        : undefined,
  });
  parser.addEntity("#xD", "\r");
  parser.addEntity(
    "#10",
    `
`,
  );
  function parseXML(xmlString) {
    return parser.parse(xmlString, true);
  }
});
export { require_xml_parser };
