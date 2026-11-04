/**
 * highlight.js/lib/languages/jboss-cli.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:213926-214804 cjs-fingerprint
var require_jboss_cli = __commonJS(function (cjsExports, cjsModule) {
  function jbossCli(hljs) {
    let PARAMS = {
      className: "params",
      begin: /\(/,
      end: /\)/,
      contains: [
        {
          begin: /[\w-]+ *=/,
          returnBegin: true,
          relevance: 0,
          contains: [
            {
              className: "attr",
              begin: /[\w-]+/,
            },
          ],
        },
      ],
      relevance: 0,
    };
    let OPERATION = {
      className: "function",
      begin: /:[\w\-.]+/,
      relevance: 0,
    };
    let PATH = {
      className: "string",
      begin: /\B([\/.])[\w\-.\/=]+/,
    };
    let COMMAND_PARAMS = {
      className: "params",
      begin: /--[\w\-=\/]+/,
    };
    return {
      name: "JBoss CLI",
      aliases: ["wildfly-cli"],
      keywords: {
        $pattern: "[a-z-]+",
        keyword:
          "alias batch cd clear command connect connection-factory connection-info data-source deploy deployment-info deployment-overlay echo echo-dmr help history if jdbc-driver-info jms-queue|20 jms-topic|20 ls patch pwd quit read-attribute read-operation reload rollout-plan run-batch set shutdown try unalias undeploy unset version xa-data-source",
        literal: "true false",
      },
      contains: [hljs.HASH_COMMENT_MODE, hljs.QUOTE_STRING_MODE, COMMAND_PARAMS, OPERATION, PATH, PARAMS],
    };
  }
  cjsModule.exports = jbossCli;
});
export { require_jboss_cli };
