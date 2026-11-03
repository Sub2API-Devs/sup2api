/**
 * highlight.js/lib/languages/jboss-cli.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:213926-214804 cjs-fingerprint
var cr = x(function (xE, or) {
  function Ud(e) {
    let n = {
        className: "params",
        begin: /\(/,
        end: /\)/,
        contains: [
          {
            begin: /[\w-]+ *=/,
            returnBegin: !0,
            relevance: 0,
            contains: [{ className: "attr", begin: /[\w-]+/ }],
          },
        ],
        relevance: 0,
      },
      a = { className: "function", begin: /:[\w\-.]+/, relevance: 0 },
      s = { className: "string", begin: /\B([\/.])[\w\-.\/=]+/ },
      o = { className: "params", begin: /--[\w\-=\/]+/ };
    return {
      name: "JBoss CLI",
      aliases: ["wildfly-cli"],
      keywords: {
        $pattern: "[a-z-]+",
        keyword:
          "alias batch cd clear command connect connection-factory connection-info data-source deploy deployment-info deployment-overlay echo echo-dmr help history if jdbc-driver-info jms-queue|20 jms-topic|20 ls patch pwd quit read-attribute read-operation reload rollout-plan run-batch set shutdown try unalias undeploy unset version xa-data-source",
        literal: "true false",
      },
      contains: [e.HASH_COMMENT_MODE, e.QUOTE_STRING_MODE, o, a, s, n],
    };
  }
  or.exports = Ud;
});

export { cr };
