# MCP streamed input compatibility repair

## Real failure

Public gateway request ID `5ae8b46af2d3009acc298a3c`, Worker account22 request `b8424881-8f9c-4dfa-ad88-cdfc0dd0352f`, returned 502 `incomplete model message` on 2026-10-08. Upstream HTTP was 200 and began a real MCP `read_wiki_structure` call. The recorded prefix was message_start, mcp_tool_use start with input {}, ping, input_json_delta with an empty string. It was not an authentication/eligibility 400. No MCP token was supplied, so secret guard was not active.

CLI emitted block_stop and message_stop with abandoned_blocks (message ID and from_block_index only), with no stop_reason. Production had no stderr artifact. It would be incorrect to infer the provider omitted its terminal events merely from this truncated log.

## Controlled reproduction

Real CLI2.1.292, isolated temporary HOME/config, dummy credential, fake upstream and no safeguards: complete initial MCP input passes. Empty delta, valid nonempty delta, and empty then valid delta each fail with identical incomplete-message 502. The fake endpoint's context is canceled before its scheduled 300ms-later real block_stop, proving the consumer abort truncates the stream. Captured stderr is empty in all cases. This distinguishes a reproducible input-delta transport incompatibility from a permission/classifier rejection; no security checks are removed.

## Repair

`mcp_input_stream.go` and one outbound_relay hook add a CLI-only carrier. Original stream first passes existing credential protection, logging and attributed terminal/source observers. The carrier buffers an MCP input block until its actual content_block_stop, decodes deltas with UseNumber, and emits an equivalent complete initial input object plus that exact real stop. It preserves original block metadata and updates the exact numeric source ledger only after verifying original message ID/index/block identity. No CLI-produced content becomes authoritative source, and no result/stop_reason/message_stop is invented.

The carrier is bounded to 16 MiB per block. Invalid JSON/object shape, conflicting initial input, altered index/order, unsupported delta metadata, incomplete input and oversized blocks fail closed. Source errors remain errors. The normal API message-terminal validator remains required. Internal transport timing changes while one MCP input block is buffered; this is not a claim of byte-identical delta delivery.

## Tests

- Initial probe was red on three delta forms, complete-initial control green.
- After repair, JSON/SSE × complete initial/empty/nonempty/empty+nonempty probes pass; the valid nonempty case includes MCP credential guard. No premature upstream cancellation and matching MCP result required.
- Existing real CLI MCP connector new/continuation/cold/pause tests plus new probes PASS25.825s.
- Unit checks: large integer9007199254740993 retained, empty no-op, whitespace/truncated JSON/array/null rejected, malformed index/type/multiblock/terminal rejected, missing source proof rejected, size bound and EOF reject without success.
- Full engine tests PASS5.019s; vet PASS.

Source frozen for independent review. Not deployed; real DeepWiki retry is reserved for root after the reviewed candidate is deployed, at most one new attempt. The earlier provider query is not called successful merely because HTTP200 began.

## Independent review corrections

Review reproduced a stale Content-Length defect: the source SSE declared 418 bytes while normalized transport was 339 bytes. The carrier now removes Content-Length, sets ContentLength=-1 and clears inherited TransferEncoding/header so the proxy frames the changed stream correctly. Non-MCP responses remain untouched.

Fragment accumulation now uses strings.Builder with Reset, avoiding repeated whole-string copying for tiny deltas. The initial buffered block is immediately rejected above16MiB as well as the cumulative block limit. Added 8192-character one-character-fragment assembly/reset and oversized-start tests. Unexpected remaining Content-Encoding is rejected before parsing; standard transport gzip decompression remains supported, independently verified by the reviewer.

Bridge/review focused tests PASS1.551s. Real CLI eight transport modes plus MCPConnectorGateway history/guard regression PASS25.684s; vet PASS. No deployment or additional live-provider attempt was made during this correction.
