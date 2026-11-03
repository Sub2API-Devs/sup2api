/**
 * @anthropic-ai/sdk/resources/messages/messages.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { Batches_2 } from "./batches.mjs";
import { MODEL_NONSTREAMING_TOKENS } from "../../internal/constants.mjs";
import { stainlessHelperHeader } from "../../internal/stainless-helper-header.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { parseMessage } from "../../lib/parser.mjs";
import { MessageStream } from "../../lib/MessageStream.mjs";

//@ chunk-hwmsct5x.js:158362-159992 esm-fingerprint
var Messages_2 = (() => {
  class Messages extends APIResource {
    constructor() {
      super(...arguments);
      this.batches = new Batches_2(this._client);
    }
    create(params, options) {
      let { user_profile_id, workspace_id, ...body } = params;
      if (body.model in DEPRECATED_MODELS_2)
        console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS_2[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
      if (
        MODELS_TO_WARN_WITH_THINKING_ENABLED_2.includes(body.model) &&
        body.thinking &&
        body.thinking.type === "enabled"
      )
        console.warn(
          `Using Claude with ${body.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`,
        );
      let timeout = options?.timeout ?? this._client._options.timeout;
      if (!body.stream && timeout == null) {
        let maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? undefined;
        timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
      }
      let helperHeader = stainlessHelperHeader(body.tools, body.messages);
      return this._client.post("/v1/messages", {
        body,
        timeout: timeout ?? 600000,
        ...options,
        headers: buildHeaders([
          {
            ...(user_profile_id != null
              ? {
                  "anthropic-user-profile-id": user_profile_id,
                }
              : undefined),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          helperHeader,
          options?.headers,
        ]),
        stream: params.stream ?? false,
      });
    }
    parse(params, options) {
      return this.create(params, options).then((message) =>
        parseMessage(message, params, {
          logger: this._client.logger ?? console,
        }),
      );
    }
    stream(body, options) {
      return MessageStream.createMessage(this, body, options, {
        logger: this._client.logger ?? console,
      });
    }
    countTokens(params, options) {
      let { user_profile_id, workspace_id, ...body } = params;
      return this._client.post("/v1/messages/count_tokens", {
        body,
        ...options,
        headers: buildHeaders([
          {
            ...(user_profile_id != null
              ? {
                  "anthropic-user-profile-id": user_profile_id,
                }
              : undefined),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
      });
    }
  }
  Messages.Batches = Batches_2;
  return Messages;
})();
var DEPRECATED_MODELS_2 = {};
var MODELS_TO_WARN_WITH_THINKING_ENABLED_2 = ["claude-mythos-preview", "claude-opus-4-6"];
export { Messages_2 };
