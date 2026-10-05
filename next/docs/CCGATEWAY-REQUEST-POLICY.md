# CCGateway request policy

The plugin settings page saves `request_policy` through the existing
`GET/PUT /system/ccgateway/remote-config` routes and `settings:manage` permission.
Omitting the policy retains the saved value. An explicitly empty `betas` array
means no client beta is allowlisted. Missing legacy policy uses these defaults:

```json
{
  "unknown_beta": "ignore",
  "unknown_field": "reject",
  "allow_fast": false,
  "allow_effort": true,
  "betas": [
    {"name": "claude-code-20250219", "mapping": "native"},
    {"name": "oauth-2025-04-20", "mapping": "native"},
    {"name": "interleaved-thinking-2025-05-14", "mapping": "forward"},
    {"name": "fine-grained-tool-streaming-2025-05-14", "mapping": "fine_grained_tools"},
    {"name": "context-1m-2025-08-07", "mapping": "forward"},
    {"name": "fast-mode-2026-02-01", "mapping": "fast"}
  ]
}
```

The authenticated host stamps `X-CCGateway-Request-Policy` on each model request,
replacing any existing value. The controller preserves it on its authenticated
account route. Public caller headers cannot select or override the policy.
No configuration writes, network rebuilds or container restarts occur on this path.

Supported mappings:

| Mapping | Behavior |
| --- | --- |
| `native` | Do not resend the client value; Claude Code owns its native/auth headers. |
| `forward` | Add the approved value to the request-scoped `ANTHROPIC_BETAS`. This does not implement additional body fields or response blocks. |
| `fine_grained_tools` | Forward the exact official beta and enable `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`. |
| `fast` | Forward the exact fast beta when Fast is allowed. The header alone never enables Fast. |

`unknown_beta` and `unknown_field` accept `reject` or `ignore`. Rejection returns
Anthropic-shaped HTTP 400 `invalid_request_error` naming the unsupported parameter.
Ignore removes only unsupported top-level fields and `output_config` subfields;
known fields and message/tool content still undergo strict validation.

When `allow_fast` is false, `speed` and the mapped fast beta are ignored. Otherwise
`speed` accepts `fast` or `standard`, setting the request-local CLI `fastMode` value.
Absent `speed` explicitly keeps standard mode, preventing a previous session's Fast
setting from leaking into another request. Actual access and pricing remain subject
to the upstream account/model. `allow_effort` controls `output_config.effort`, mapped
to `--effort` with `low`, `medium`, `high`, `xhigh`, or `max`.

Arbitrary extra bodies, environment variables, structured-output formats, server
tools and context-management fields are not exposed by this policy. The runner
clears inherited extra-body and effort/beta overrides, then supplies only approved
request-specific settings. Effective capability values join the history config key.

Validation uses isolated fake CLI processes plus installed Claude Code 2.1.288 and
a local fake Anthropic upstream. The real-CLI test checks Fast enable/disable,
effort, beta filtering, SSE, tool roundtrips and history without cloud model calls.
