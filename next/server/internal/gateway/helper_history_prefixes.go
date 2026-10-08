package gateway

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// Hash each complete assistant prefix without repeatedly encoding the entire
// conversation. Public ingress and private custody have different size limits.
func publicHelperPrefixes(raw []byte) ([]json.RawMessage, []string, error) {
	canonical, err := wire.CanonicalJSON(raw, len(raw))
	if err != nil {
		return nil, nil, err
	}
	var body struct {
		Messages []json.RawMessage `json:"messages"`
	}
	if err = json.Unmarshal(canonical, &body); err != nil {
		return nil, nil, err
	}
	if len(body.Messages) == 0 {
		return nil, nil, fmt.Errorf("helper history requires messages")
	}
	state := sha256.New()
	_, _ = state.Write([]byte("["))
	var prefixes []string
	for i, message := range body.Messages {
		if i > 0 {
			_, _ = state.Write([]byte(","))
		}
		_, _ = state.Write(message)
		var header struct {
			Role string `json:"role"`
		}
		if err = json.Unmarshal(message, &header); err != nil {
			return nil, nil, err
		}
		if header.Role != "assistant" {
			continue
		}
		digest, err := publicPrefixDigest(state, body.Messages[:i+1])
		if err != nil {
			return nil, nil, err
		}
		prefixes = append(prefixes, digest)
	}
	return body.Messages, prefixes, nil
}

func publicPrefixDigest(state hash.Hash, messages []json.RawMessage) (string, error) {
	if cloner, ok := state.(hash.Cloner); ok {
		if prefix, err := cloner.Clone(); err == nil {
			_, _ = prefix.Write([]byte("]"))
			return hex.EncodeToString(prefix.Sum(nil)), nil
		}
	}
	// Some FIPS hash implementations cannot clone. Retain correctness without
	// imposing the private payload limit on ordinary public conversations.
	raw, err := json.Marshal(messages)
	if err != nil {
		return "", err
	}
	return wire.Digest(raw), nil
}
