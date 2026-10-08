# Nested model reference independent review

Reviewed root-authored fifth-batch `model_reference_locations.go`, gateway model reference integration, SDK declarations/checker, and Anthropic platform rules. This review does not claim independence for the separately authored resource storage service.

Declared intermediate `[]` hops locate inline model declarations without searching tool input or arbitrary JSON trees. Existing pre/post-hook checks admit referenced models; price snapshots and account model mapping remain shared with top-level declarations. Signed compaction declarations require identity mapping and are not rewritten. Plugin transport patches must retain the declared locations and models, and conversion target declarations cannot introduce invocations absent from source authorization.

Two defects were reproduced with independent red tests and corrected:

1. Snapshot bound used the count of serialized model *and override-fact* entries. Legitimate 64-model requests with overrides failed below the 64-model limit. A separate model counter now enforces the intended bound.
2. SDK duplicate-location identity included the usage kind name. Renaming the rule admitted a duplicate location under another billing kind. Duplicate `(arrayPath, modelPath)` now fails, while the same usage kind at distinct locations is allowed.

Independent tests cover declared-path traversal, no recursive tool-input discovery, deletion/replacement in plugin patches, signed model mapping prohibition, target-converter injection, the 64-model bound with override facts, and SDK duplicate rules.

Validation: gateway targeted review/inline/referenced tests and vet pass; full SDK manifest/check tests and vet pass. These are local protocol/core tests, not production resource or provider inference validation.
