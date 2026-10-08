package gateway

import (
	"crypto/sha256"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

type resourceScanEntry struct {
	valid  bool
	digest [32]byte
	info   resources.RequestInfo
}
type resourceScanCache struct {
	entries [2]resourceScanEntry
	next    int
}

// Two request-local snapshots avoid repeated full JSON allocation. Hashing all
// bytes still detects escaped keys and in-place edits; no caller buffer or
// parsed tool-input tree is retained. Failed validation is never cached.
func (s *resourceScanCache) scan(body []byte) ([]resources.Reference, error) {
	info, err := s.inspect(body)
	return info.References, err
}

func (s *resourceScanCache) inspect(body []byte) (resources.RequestInfo, error) {
	digest := sha256.Sum256(body)
	for _, entry := range s.entries {
		if entry.valid && entry.digest == digest {
			return entry.info, nil
		}
	}
	info, err := resources.InspectRequest(body)
	if err != nil {
		return info, err
	}
	s.entries[s.next] = resourceScanEntry{true, digest, info}
	s.next = (s.next + 1) % len(s.entries)
	return info, nil
}
