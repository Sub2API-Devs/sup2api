package gateway

import (
	"crypto/sha256"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

type resourceScanEntry struct {
	valid  bool
	digest [32]byte
	refs   []resources.Reference
}
type resourceScanCache struct {
	entries [2]resourceScanEntry
	next    int
}

// Two request-local snapshots avoid repeated full JSON allocation. Hashing all
// bytes still detects escaped keys and in-place edits; no caller buffer or
// parsed tool-input tree is retained. Failed validation is never cached.
func (s *resourceScanCache) scan(body []byte) ([]resources.Reference, error) {
	digest := sha256.Sum256(body)
	for _, entry := range s.entries {
		if entry.valid && entry.digest == digest {
			return entry.refs, nil
		}
	}
	refs, err := resources.ScanReferences(body)
	if err != nil {
		return nil, err
	}
	s.entries[s.next] = resourceScanEntry{true, digest, refs}
	s.next = (s.next + 1) % len(s.entries)
	return refs, nil
}
