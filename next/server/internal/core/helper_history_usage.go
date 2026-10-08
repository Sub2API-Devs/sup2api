package core

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
)

type helperHistoryUsageEnvelope struct {
	Version int
	Record  *UsageRecord
}

// HelperHistoryUsageBytes is the single versioned encoding for the durable
// outbox and its persistence receipt. Consumers must hash the actual record,
// not trust a caller-provided digest independently of it.
func HelperHistoryUsageBytes(record *UsageRecord) ([]byte, string, error) {
	raw, err := json.Marshal(helperHistoryUsageEnvelope{Version: 1, Record: record})
	if err != nil {
		return nil, "", err
	}
	h := sha256.Sum256(raw)
	return raw, hex.EncodeToString(h[:]), nil
}

// Original bytes bind the digest across additions of zero-valued fields in a
// newer core. Older cores reject unknown fields rather than acknowledge loss.
func DecodeHelperHistoryUsage(raw []byte) (*UsageRecord, string, error) {
	if len(raw) == 0 || len(raw) > 2<<20 {
		return nil, "", fmt.Errorf("invalid helper usage envelope size")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	d.DisallowUnknownFields()
	var envelope helperHistoryUsageEnvelope
	if err := d.Decode(&envelope); err != nil {
		return nil, "", err
	}
	if err := d.Decode(&struct{}{}); err != io.EOF {
		return nil, "", fmt.Errorf("trailing helper usage envelope")
	}
	if envelope.Version != 1 || envelope.Record == nil {
		return nil, "", fmt.Errorf("unsupported helper usage envelope")
	}
	h := sha256.Sum256(raw)
	return envelope.Record, hex.EncodeToString(h[:]), nil
}
