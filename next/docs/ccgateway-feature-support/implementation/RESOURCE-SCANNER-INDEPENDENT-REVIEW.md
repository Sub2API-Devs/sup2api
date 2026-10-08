# Sixth-batch resource scanner independent review

Reviewed root-authored `capabilities.go`, `references_walk.go`, `response_references.go` and changes integrating the new walkers. The earlier generic duplicate-key decoder was authored by this reviewer; tests of that existing helper are regression evidence rather than an independent authorship claim.

Official SDK verification:

- [Container request parameters](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_container_params.py): optional ID and skill list.
- [Container response](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_container.py) and [container skill](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_container_skill.py): container identity, expiry and resolved skill details.
- [Message delta event](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_raw_message_delta_event.py): the official response location is `delta.container`.
- [Encrypted execution result](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_encrypted_code_execution_result_block.py): output-file records are public structured content; encrypted stdout is opaque.

Independent tests establish exact request/history/response paths for container strings and objects, custom skills, Python/bash/encrypted execution files. Built-in skill names, arbitrary tool input/schema, stdout/text, encrypted strings and partial JSON deltas are not interpreted as resource IDs. Large JSON integers remain `json.Number`, input bytes are unchanged, duplicate escaped member names fail, and conflicting execution-result/output types are rejected.

One compatibility omission was corrected: Worker already forwards registered response extensions on `message_stop`, but the new response scanner did not inspect its root container. It now covers that field. Root `message_delta.container` was retained after checking the existing Worker extension contract. Both root-event locations are explicitly documented as **Worker compatibility**, not official provider fields or real-provider evidence. Official `delta.container` remains covered separately; unrelated nested metadata is not scanned.

`contracts/resources` full tests and vet pass (latest 3.311s). These parser tests do not establish real provider signatures, model eligibility, artifact ownership or quota settlement. PTC scanning belongs to the separate owner and was not edited in this review.
