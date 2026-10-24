package gateway

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// creditTokenField is the response field that carries a fallback credit.
var creditTokenField = []byte("fallback_credit_token")

// creditStreams reports whether a tracked response streams to the client
// (2026-10-25 audit P2-1): an Anthropic event stream relayed as it is. A
// response with resource outputs, a converted one, and a JSON answer are read
// whole, as before.
func (c *call) creditStreams(rt *typeRoute, sse bool) bool {
	return c.creditAccess != nil && sse && rt.conv == nil && !c.jsonArrayStream() &&
		(c.resourceAccess == nil || !c.resourceAccess.outputs)
}

// creditTrailerEvidence moves the Worker's credit evidence sent as trailers
// (its receipt follows the answer it streamed) to the header the observer
// reads. Call it only after the body's EOF; evidence sent twice stays twice,
// which the observer refuses.
func creditTrailerEvidence(resp *http.Response) {
	for _, name := range []string{credits.ReadyHeader, credits.FailureHeader} {
		for _, value := range resp.Trailer.Values(name) {
			resp.Header.Add(name, value)
		}
	}
}

// forwardCreditSSE relays a tracked event stream as it arrives. Only what can
// carry a credit token is held back: every event from the first one that names
// fallback_credit_token. The Worker's receipt arrives after the last byte, and
// the held events are released once the credit is confirmed and recorded. A
// credit that cannot be confirmed or recorded ends the stream with an error
// event in their place, so a client never holds a token the gateway does not
// know.
func (c *call) forwardCreditSSE(ctx context.Context, rt *typeRoute, resp *http.Response, u *usageAcc, cap *usageCapture) error {
	binding := c.creditAccess.binding
	if resources.ValidateIdentityHeaders(resp.Header, resources.Identity{PrincipalID: binding.PrincipalID, Generation: binding.Generation}) != nil {
		// Not this request's issuer: nothing is sent, and the stream is read
		// whole for its usage and refused there.
		return c.forwardResourceResponse(ctx, rt, resp, u, cap)
	}
	w := c.c.Writer
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(resp.StatusCode)
	w.Flush()

	// all is the whole stream the claim is computed from, up to the limit the
	// buffered path has; held is what waits for the receipt.
	var all, held, block []byte
	overflow, holding := false, false
	relay := func() error {
		if len(block) == 0 {
			return nil
		}
		event, data := sseBlockEvent(block)
		c.observeStreamEvent(u, cap, event, data)
		if !overflow && len(all)+len(block) > maxUsageJSONBuf {
			overflow, all = true, nil
		} else if !overflow {
			all = append(all, block...)
		}
		holding = holding || bytes.Contains(block, creditTokenField)
		defer func() { block = block[:0] }()
		if holding {
			held = append(held, block...)
			return nil
		}
		if _, err := w.Write(block); err != nil {
			return errClientGone
		}
		w.Flush()
		return nil
	}
	br := bufio.NewReaderSize(resp.Body, 64<<10)
	for {
		line, rerr := readLine(br, maxSSELine)
		block = append(block, line...)
		if len(bytes.TrimRight(line, "\r\n")) == 0 && len(line) > 0 {
			if err := relay(); err != nil {
				return err
			}
		}
		if rerr == nil {
			continue
		}
		if rerr != io.EOF {
			if ctx.Err() != nil {
				return errClientGone
			}
			return rerr
		}
		if err := relay(); err != nil {
			return err
		}
		break
	}
	creditTrailerEvidence(resp)
	err := c.confirmStreamedCredit(ctx, resp, all, overflow)
	if !holding {
		// Nothing the client received names a credit; evidence that does not
		// add up is the Worker's fault, but there is nothing to withhold.
		if err != nil {
			slog.WarnContext(ctx, "gateway: fallback credit evidence of a streamed answer", "request_id", c.rid, "reason", err.Error())
		}
		return nil
	}
	if err == nil {
		if _, werr := w.Write(held); werr != nil {
			return errClientGone
		}
		w.Flush()
		return nil
	}
	if _, werr := w.Write(creditErrorEvent(err)); werr != nil {
		return errClientGone
	}
	w.Flush()
	var storage *creditStorageError
	if errors.As(err, &storage) {
		return err
	}
	slog.WarnContext(ctx, "gateway: stateful response withheld", "request_id", c.rid, "reason", err.Error())
	return &convertError{err: fmt.Errorf("resource output registration: %w", err)}
}

// confirmStreamedCredit checks the Worker's evidence against the complete
// stream and records the credit it issued.
func (c *call) confirmStreamedCredit(ctx context.Context, resp *http.Response, all []byte, overflow bool) error {
	if overflow {
		return fmt.Errorf("incomplete or oversized stateful response")
	}
	events, err := resourceResponseEvents(all, true)
	if err != nil {
		return err
	}
	return c.observeFallbackCredit(ctx, resp, events, true)
}

// sseBlockEvent is one event block's name and its data lines joined.
func sseBlockEvent(block []byte) (string, []byte) {
	var event string
	var data []byte
	for _, line := range bytes.SplitAfter(block, []byte("\n")) {
		t := bytes.TrimRight(line, "\r\n")
		switch {
		case bytes.HasPrefix(t, []byte("event:")):
			event = strings.TrimSpace(string(t[len("event:"):]))
		case bytes.HasPrefix(t, []byte("data:")):
			d := bytes.TrimPrefix(t[len("data:"):], []byte(" "))
			if len(data) > 0 {
				data = append(data, '\n')
			}
			data = append(data, d...)
		}
	}
	return event, data
}

// creditErrorEvent is the Anthropic error event that ends a stream whose
// credit could not be confirmed or recorded.
func creditErrorEvent(err error) []byte {
	message := "upstream response could not be converted"
	var storage *creditStorageError
	if errors.As(err, &storage) {
		message = err.Error()
	}
	data, _ := json.Marshal(map[string]any{"type": "error", "error": map[string]string{"type": "api_error", "message": message}})
	return append(append([]byte("event: error\ndata: "), data...), "\n\n"...)
}
