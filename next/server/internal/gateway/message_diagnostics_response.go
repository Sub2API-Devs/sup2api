package gateway

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
	"github.com/tidwall/gjson"
	"io"
	"net/http"
)

type diagnosticStorageError struct{ err error }

func (e *diagnosticStorageError) Error() string {
	return "diagnostics correlation could not be secured"
}
func (e *diagnosticStorageError) Unwrap() error { return e.err }

type diagnosticReplay struct {
	io.Reader
	io.Closer
}

// Only the initial SSE envelope is buffered; subsequent tokens remain live.
func (c *call) prepareDiagnosticResponse(ctx context.Context, resp *http.Response, u *usageAcc, capture *usageCapture) (retErr error) {
	if c.diagnosticAccess == nil {
		return nil
	}
	var prefix bytes.Buffer
	remaining := io.Reader(resp.Body)
	defer func() {
		if retErr != nil {
			retainDiagnosticFailureUsage(prefix.Bytes(), remaining, isSSE(resp.Header.Get("Content-Type")), u, capture)
		}
	}()
	fail := func(err error) error { return &diagnosticStorageError{err} }
	binding := c.diagnosticAccess.binding
	if resp.Header.Get(diag.ReadyHeader) != "1" || len(resp.Header.Values(diag.ReadyHeader)) != 1 || len(resp.Header.Values(resources.PrincipalHeader)) != 1 || len(resp.Header.Values(resources.GenerationHeader)) != 1 || resp.Header.Get(resources.PrincipalHeader) != binding.PrincipalID || resp.Header.Get(resources.GenerationHeader) != binding.Generation {
		return fail(fmt.Errorf("Worker diagnostics capability or identity not verified"))
	}
	if !isSSE(resp.Header.Get("Content-Type")) {
		raw, err := io.ReadAll(io.LimitReader(resp.Body, maxUsageJSONBuf+1))
		prefix.Write(raw)
		if err != nil {
			return fail(err)
		}
		if len(raw) > maxUsageJSONBuf {
			return fail(fmt.Errorf("oversized diagnostics response"))
		}
		if gjson.GetBytes(raw, "type").String() != "error" {
			if err = validateDiagnosticMessage(raw); err != nil {
				return fail(err)
			}
			if err = c.recordDiagnosticID(ctx, gjson.GetBytes(raw, "id").String()); err != nil {
				return fail(err)
			}
		}
		resp.Body = &diagnosticReplay{Reader: bytes.NewReader(raw), Closer: resp.Body}
		return nil
	}
	br := bufio.NewReader(resp.Body)
	remaining = br
	var event bytes.Buffer
	for {
		line, err := readLine(br, maxSSELine)
		if len(line) > 0 {
			prefix.Write(line)
			event.Write(line)
		}
		if prefix.Len() > maxUsageJSONBuf {
			return fail(fmt.Errorf("diagnostics initial envelope exceeds limit"))
		}
		if len(bytes.TrimSpace(line)) == 0 && event.Len() > 0 {
			events, parseErr := diagnosticInitialEvent(event.Bytes())
			if parseErr != nil {
				return fail(parseErr)
			}
			for _, ev := range events {
				typ := gjson.GetBytes(ev.data, "type").String()
				if typ == "message_start" {
					if err := validateDiagnosticMessage([]byte(gjson.GetBytes(ev.data, "message").Raw)); err != nil {
						return fail(err)
					}
					if err := c.recordDiagnosticID(ctx, gjson.GetBytes(ev.data, "message.id").String()); err != nil {
						return fail(err)
					}
					resp.Body = &diagnosticReplay{Reader: io.MultiReader(bytes.NewReader(prefix.Bytes()), br), Closer: resp.Body}
					return nil
				}
				if typ == "error" {
					resp.Body = &diagnosticReplay{Reader: io.MultiReader(bytes.NewReader(prefix.Bytes()), br), Closer: resp.Body}
					return nil
				}
			}
			event.Reset()
		}
		if err != nil {
			return fail(fmt.Errorf("diagnostics response ended before message identity: %w", err))
		}
	}
}

// Decode one bounded complete frame without requiring an entire model response.
func diagnosticInitialEvent(raw []byte) ([]resourceResponseEvent, error) {
	var data []byte
	name := ""
	for _, line := range bytes.Split(raw, []byte("\n")) {
		line = bytes.TrimSuffix(line, []byte("\r"))
		if bytes.HasPrefix(line, []byte("event:")) {
			name = string(bytes.TrimSpace(line[6:]))
		}
		if bytes.HasPrefix(line, []byte("data:")) {
			if len(data) > 0 {
				data = append(data, '\n')
			}
			data = append(data, bytes.TrimPrefix(line[5:], []byte(" "))...)
		}
	}
	if len(data) == 0 {
		return nil, nil
	}
	if !gjson.ValidBytes(data) {
		return nil, fmt.Errorf("invalid diagnostics SSE envelope")
	}
	typ := gjson.GetBytes(data, "type").String()
	if name != "" && name != typ {
		return nil, fmt.Errorf("diagnostics SSE type mismatch")
	}
	if typ != "ping" && typ != "message_start" && typ != "error" {
		return nil, fmt.Errorf("diagnostics SSE precedes message identity")
	}
	return []resourceResponseEvent{{name: name, data: data}}, nil
}

func validateDiagnosticMessage(raw []byte) error {
	v := gjson.ParseBytes(raw)
	if !gjson.ValidBytes(raw) || !v.IsObject() || v.Get("type").String() != "message" || v.Get("role").String() != "assistant" || v.Get("id").Type != gjson.String || v.Get("model").Type != gjson.String || v.Get("model").String() == "" || !v.Get("content").IsArray() || !v.Get("usage").IsObject() {
		return fmt.Errorf("invalid diagnostics message envelope")
	}
	_, err := diag.Hash(v.Get("id").String())
	return err
}

// A registry failure must not erase charges already incurred. Consume only the
// same bounded response envelope used by stateful forwarding; never emit it.
func retainDiagnosticFailureUsage(prefix []byte, remaining io.Reader, sse bool, u *usageAcc, capture *usageCapture) {
	if len(prefix) > maxUsageJSONBuf {
		return
	}
	tail, _ := io.ReadAll(io.LimitReader(remaining, int64(maxUsageJSONBuf-len(prefix))+1))
	raw := append(append([]byte(nil), prefix...), tail...)
	events, _ := resourceResponseEvents(raw, sse)
	for _, event := range events {
		if sse {
			u.ApplySSE(event.name, event.data)
			if capture != nil {
				capture.addEvent(usagerules.EventName(event.name, event.data), event.data)
			}
		} else {
			u.ApplyJSON(event.data)
			if capture != nil {
				capture.setBody(event.data)
			}
		}
	}
}
