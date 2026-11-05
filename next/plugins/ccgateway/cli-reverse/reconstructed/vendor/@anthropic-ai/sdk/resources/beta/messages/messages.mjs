/**
 * @anthropic-ai/sdk/resources/beta/messages/messages.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-layout 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Batches } from "./batches.mjs";
import { getOutputFormat, parseMessageContent } from "../../../lib/beta-parser.mjs";
import { MODEL_NONSTREAMING_TOKENS } from "../../../internal/constants.mjs";
import { stainlessHelperHeader_2 } from "../../../internal/stainless-helper-header.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { BetaMessageStream } from "../../../lib/BetaMessageStream.mjs";
import { BetaToolRunner } from "../../../lib/tools/BetaToolRunner.mjs";
import { ToolError } from "../../../lib/tools/ToolError.mjs";

//@ chunk-vn3g7zt8.js:117266-119236 esm-layout
var DEPRECATED_MODELS = {};
var MODELS_TO_WARN_WITH_THINKING_ENABLED = ["claude-mythos-preview", "claude-opus-4-6"];
var Messages = (() => {
  class Messages extends APIResource {
    constructor() {
      super(...arguments);
      this.batches = new Batches(this._client);
    }
    create(params, options) {
      let modifiedParams = getOutputFormat(params);
      let { betas, user_profile_id, workspace_id, ...body } = modifiedParams;
      if (body.model in DEPRECATED_MODELS)
        console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}
Please migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
      if (
        MODELS_TO_WARN_WITH_THINKING_ENABLED.includes(body.model) &&
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
      let helperHeader = stainlessHelperHeader_2(body.tools, body.messages);
      return this._client.post("/v1/messages?beta=true", {
        body,
        timeout: timeout ?? 600000,
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
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
        stream: modifiedParams.stream ?? false,
      });
    }
    parse(params, options) {
      options = {
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(params.betas ?? []), "structured-outputs-2025-12-15"].toString(),
          },
          options?.headers,
        ]),
      };
      return this.create(params, options).then((message) =>
        parseMessageContent(message, params, {
          logger: this._client.logger ?? console,
        }),
      );
    }
    stream(body, options) {
      return BetaMessageStream.createMessage(this, body, options);
    }
    countTokens(params, options) {
      let modifiedParams = getOutputFormat(params);
      let { betas, user_profile_id, workspace_id, ...body } = modifiedParams;
      return this._client.post("/v1/messages/count_tokens?beta=true", {
        body,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "token-counting-2024-11-01"].toString(),
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
    toolRunner(body, options) {
      return new BetaToolRunner(this._client, body, options);
    }
  }
  Messages.Batches = Batches;
  Messages.BetaToolRunner = BetaToolRunner;
  Messages.ToolError = ToolError;
  return Messages;
})();
export { Messages };
