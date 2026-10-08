package core

import "encoding/json"

// CacheWriteEvidenceKey is reserved for host-observed cache classification.
const CacheWriteEvidenceKey = "cache_write_evidence"

// CacheCounter distinguishes an absent/null field from a provider-reported zero.
type CacheCounter struct {
	State string `json:"state"`
	Value *int64 `json:"value,omitempty"`
}

// CacheWriteEvidence describes observations, not a new pricing input. The
// compatibility cc bucket continues to use the platform's default write rate.
type CacheWriteEvidence struct {
	Version            int          `json:"version"`
	Total              CacheCounter `json:"total"`
	Explicit5m         CacheCounter `json:"explicit_5m"`
	Explicit1h         CacheCounter `json:"explicit_1h"`
	UnclassifiedTokens *int64       `json:"unclassified_tokens,omitempty"`
	Completeness       string       `json:"completeness"`
	Source             string       `json:"source"`
	PricingPolicy      string       `json:"pricing_policy"`
}

// Metrics decode as map[string]any in the durable envelope. Stable object-key
// order keeps a typed producer and its UseNumber-decoded replay byte-equivalent.
func (e CacheWriteEvidence) MarshalJSON() ([]byte, error) {
	type plain CacheWriteEvidence
	raw, err := json.Marshal(plain(e))
	if err != nil {
		return nil, err
	}
	var fields map[string]json.RawMessage
	if err = json.Unmarshal(raw, &fields); err != nil {
		return nil, err
	}
	return json.Marshal(fields)
}

func (e CacheWriteEvidence) Clone() CacheWriteEvidence {
	for _, p := range []*CacheCounter{&e.Total, &e.Explicit5m, &e.Explicit1h} {
		if p.Value != nil {
			v := *p.Value
			p.Value = &v
		}
	}
	if e.UnclassifiedTokens != nil {
		v := *e.UnclassifiedTokens
		e.UnclassifiedTokens = &v
	}
	return e
}

// CloneUsageMetrics preserves immutable host observations across extraction
// snapshots while leaving the existing scalar plugin-fact contract unchanged.
func CloneUsageMetrics(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
		if k == CacheWriteEvidenceKey {
			out[k] = cloneCacheEvidenceValue(v)
		}
	}
	return out
}

func cloneCacheEvidenceValue(v any) any {
	switch x := v.(type) {
	case CacheWriteEvidence:
		return x.Clone()
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, v := range x {
			out[k] = cloneCacheEvidenceValue(v)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, v := range x {
			out[i] = cloneCacheEvidenceValue(v)
		}
		return out
	default:
		return v
	}
}
