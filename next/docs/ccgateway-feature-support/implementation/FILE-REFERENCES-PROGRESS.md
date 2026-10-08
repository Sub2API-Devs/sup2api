# File references: ownership and model dispatch

Shared `contracts/resources.ScanReferences` returns exact JSON paths for Anthropic image/document file sources, media in tool results, document content sources, and container-upload IDs. It does not search tool input/schema or text. Duplicate JSON members are rejected to avoid disagreement between authorization and rewrite parsers. Bounds apply to nesting, IDs and reference count. Container-upload scanning does not itself enable the unfinished container product.

Gateway admission now checks resources both before and after request hooks for Messages and count_tokens. Only ready, unexpired `ccgateway/file` records belonging to the authenticated user and group are accepted. Changing API keys within that same ownership scope does not transfer or lose ownership. All referenced files must use exactly one account/issuer/generation. Candidate scheduling is restricted to that original account; it cannot fail over to another account or copy files.

Immediately before plugin Build, the core rechecks live records and stable Worker identity, then rewrites only admitted paths from public IDs to remote IDs. Converted requests cannot introduce files. Plugin patches cannot add, remove, relocate or replace references. Before dispatch the core strips all supplied `X-CCGateway-Resource-*` headers, rechecks records and identity, and writes its own principal/generation/JSON remote-ID allowlist. No-file requests do not invoke the identity endpoint. Worker must independently validate this contract to close the cross-process race; core mapping alone does not claim that Worker file-source support is released.

## Verification

- Shared scanner tests pass, covering nested known media paths, ignored arbitrary input/schema and duplicate members.
- Gateway actual-HTTP fixtures pass for fixed-account repeat calls, owner/group/deleted/expired/issuer rejection, mixed accounts, API-key rotation, count_tokens, request-hook reauthorization, plugin add/remove/replace rejection and trusted headers. Converter injection and external-header stripping have direct boundary tests.
- These are core HTTP tests with fake upstreams. Worker CLI file-source replay, real provider permissions and production deployment are not established by them.
- Core target tests and vet passed during implementation. PostgreSQL resource lifecycle/filter tests remain assigned to the Git-based Linux checkpoint.

## Expiry storage correction

Completion accepts a nullable expiry pointer: absent means unreported, zero means explicit provider null, nonzero is the actual provider deadline. Effective reference expiry is the earlier of an existing explicit policy deadline and reported provider expiry; default policy has no expiry. Provider metadata remains the original fact rather than being rewritten as a local policy claim. SQL `ExpiredWithin` permits the HTTP metadata/list adapter to show recently expired records, while content/model admission still requires unexpired resources. The filtered-pagination DB regression now covers completion-derived expiry, 30-day visibility and exclusion after 31 days.

## Long-history allocation check

Synthetic local Windows benchmark: 128 messages with 8 KiB text each (about 1.05 MiB JSON), no files. Full scan: 3.57 ms, 1.20 MB allocation, 2,628 allocations per scan. A bounded request-local two-entry SHA-256 scan cache now shares validated results between admission, mapping and patch checks; changed bytes cause a fresh parse and failed validation is never cached. It retains only digest/reference data, not another full history body. Same-fixture cache hits measured 0.464 ms with zero allocations. Hashing still examines every byte; escaped member names, duplicate JSON and in-place caller-buffer changes have regression tests. Numbers are a five-iteration local microbenchmark, not a production latency guarantee.
