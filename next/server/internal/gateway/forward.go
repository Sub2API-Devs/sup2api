package gateway

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

const (
	maxSSELine      = 16 << 20
	maxUsageJSONBuf = 32 << 20
)

var errLineTooLong = errors.New("sse line too long")

// convertError is a failure converting the upstream response to the client
// protocol.
type convertError struct{ err error }

func (e *convertError) Error() string { return "response conversion failed: " + e.err.Error() }
func (e *convertError) Unwrap() error { return e.err }

// forward relays a successful upstream response. From here on bytes reach
// the client, so the attempt is final whatever happens. On a converting
// route the response is converted to the endpoint protocol; usage is always
// read from the upstream response with the upstream protocol's rules.
//
// The declarative rules run here in every case. When the endpoint declares
// usage.source "plugin" they are joined by a capture (see usageplugin.go)
// that keeps the few bytes PlatformService.ExtractUsage will be shown, and
// the plugin is asked once the last byte has left - never before. upBody is
// the request as it went upstream; only its declared usageRequestFields are
// read from it, at the end, and the body itself is not kept.
func (c *call) forward(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, resp *http.Response, upBody []byte) attemptResult {
	httpfacts.Apply(c.c.Writer.Header(), resp.Header)
	u := newUsageAcc(rt.usage).WithLog("request_id", c.rid, "plugin", rt.binding.Plugin.Key,
		"platform", rt.platform, "protocol", rt.upstream)
	u.WithPrimaryModel(c.upstreamPrimaryModel)
	u.WithAttemptAccounting(c.hasRequestedAttemptUsage(rt, upBody))
	cap := newUsageCapture(rt)
	c.rec.StatusCode = resp.StatusCode
	c.rec.Success = true
	c.rec.ErrorType = ""
	c.rec.ErrorMessage = ""
	var err error
	sse := isSSE(resp.Header.Get("Content-Type"))
	c.checkResponseShape(ctx, rt, resp, sse)
	switch {
	case sse:
		err = c.forwardSSE(ctx, resp, u, rt.conv, cap)
	case rt.conv != nil:
		err = c.forwardJSONConverted(resp, u, cap, rt.conv)
	default:
		err = c.forwardJSON(resp, u, cap)
	}
	c.rec.Tokens = u.Tokens()
	c.recordAdditionalUsage(u, rt)
	c.recordReplacementUsage(u, rt)
	if len(u.Metrics) > 0 {
		c.rec.Metrics = u.Metrics
	}
	if c.rec.UpstreamModel == "" && u.Model != "" && u.Model != c.model {
		c.rec.UpstreamModel = u.Model
	}
	var cerr *convertError
	switch {
	case err == nil:
		if u.StreamError != "" {
			c.rec.Success = false
			c.rec.ErrorType = errTypeUpstream
			c.rec.ErrorMessage = truncateUTF8(u.StreamError, 1000)
		}
	case errors.As(err, &cerr):
		c.rec.Success = false
		c.rec.ErrorType = errTypeUpstream
		c.rec.ErrorMessage = truncateUTF8(err.Error(), 1000)
		slog.WarnContext(ctx, "gateway: response conversion failed", "request_id", c.rid,
			"from", rt.upstream, "to", c.ep.Protocol, "err", cerr.err)
		if !c.c.Writer.Written() {
			c.rec.StatusCode = http.StatusBadGateway
			writeError(c.c, c.format, &gwError{Status: http.StatusBadGateway, Code: "upstream_error",
				Message: "upstream response could not be converted"})
		}
	case ctx.Err() != nil || errors.Is(err, errClientGone):
		c.rec.Success = false
		c.rec.ErrorType = errTypeClientCanceled
		c.rec.StatusCode = statusClientClosed
		c.rec.ErrorMessage = "client canceled"
	default:
		c.rec.Success = false
		c.rec.ErrorType = errTypeUpstream
		c.rec.ErrorMessage = truncateUTF8("upstream stream interrupted: "+err.Error(), 1000)
		slog.WarnContext(ctx, "gateway: upstream response interrupted", "request_id", c.rid, "err", err)
	}
	// The client has its bytes. The plugin, if any, is asked in submit -
	// after the handler returns, so the response is terminated first.
	c.armUsageExtraction(rt, acct, resp, cap, upBody)
	return attemptResult{kind: attemptDone}
}

var errClientGone = errors.New("client connection closed")

func isSSE(ct string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(ct)), "text/event-stream")
}

// checkResponseShape compares the shape the upstream actually answered with
// against the one the upstream endpoint promises in endpoint.response, and
// records the disagreement without acting on it.
//
// Two different things are declared per endpoint and they must not be
// conflated:
//
//   - request.stream / request.streamPath is what the *client* asks for - an
//     endpoint that always streams, or the body path carrying the client's
//     "stream": true. The gateway reads it before the request goes out
//     (checkModel) and records it as usage_logs.stream.
//   - response.stream / response.nonStream is the shape the endpoint
//     *promises* to answer with. Nothing forces the upstream to keep that
//     promise, so it is only ever a declaration to check against.
//
// The forwarding mode itself still follows the upstream Content-Type
// (forward): a client whose request works must not be cut off because a
// manifest is incomplete. But the declaration is what the usage rules are
// written for - an endpoint that never mentions response.stream almost never
// carries usage.sse rules either, so an unexpected SSE answer is billed by
// whatever facts happen to apply and its token counts are lost. Recording the
// mismatch is what makes that visible; correcting it (adding the missing
// usage.sse rules) stays with the plugin author.
//
// Nothing here blocks the response or changes the amount billed.
func (c *call) checkResponseShape(ctx context.Context, rt *typeRoute, resp *http.Response, sse bool) {
	if !rt.respDeclared || c.rec == nil {
		return
	}
	var mismatch string
	switch {
	case sse && rt.resp.Stream == "":
		mismatch = core.ResponseMismatchSSENotDeclared
	case !sse && rt.resp.NonStream == "" && rt.resp.Stream != "":
		mismatch = core.ResponseMismatchJSONWhileStream
	default:
		return
	}
	c.rec.ResponseMismatch = mismatch
	slog.WarnContext(ctx, "gateway: upstream response shape not declared by the endpoint",
		"request_id", c.rid, "plugin", rt.binding.Plugin.Key, "platform", rt.platform,
		"protocol", rt.upstream, "endpoint", c.ep.Path, "mismatch", mismatch,
		"content_type", resp.Header.Get("Content-Type"),
		"declared_stream", rt.resp.Stream, "declared_non_stream", rt.resp.NonStream)
}

func (c *call) forwardJSON(resp *http.Response, u *usageAcc, cap *usageCapture) error {
	w := c.c.Writer
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "application/json"
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(resp.StatusCode)
	var buf bytes.Buffer
	overflow := false
	chunk := make([]byte, 32<<10)
	for {
		n, rerr := resp.Body.Read(chunk)
		if n > 0 {
			if _, werr := w.Write(chunk[:n]); werr != nil {
				return errClientGone
			}
			if !overflow {
				if buf.Len()+n > maxUsageJSONBuf {
					overflow = true
					buf = bytes.Buffer{}
				} else {
					buf.Write(chunk[:n])
				}
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return rerr
		}
	}
	w.Flush()
	if overflow {
		slog.Warn("gateway: response too large for usage extraction", "request_id", c.rid)
		cap.dropBody()
		return nil
	}
	u.ApplyJSON(buf.Bytes())
	cap.setBody(buf.Bytes())
	return nil
}

// forwardJSONConverted reads the whole upstream response, extracts usage
// from it (upstream rules) and writes the converted body. Nothing is written
// when reading or converting fails.
func (c *call) forwardJSONConverted(resp *http.Response, u *usageAcc, cap *usageCapture, conv convert.Converter) error {
	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxUsageJSONBuf+1))
	if err != nil {
		return err
	}
	if len(raw) > maxUsageJSONBuf {
		return &convertError{err: errors.New("upstream response too large")}
	}
	u.ApplyJSON(raw)
	cap.setBody(raw)
	out, err := conv.Response(raw)
	if err != nil {
		return &convertError{err: err}
	}
	w := c.c.Writer
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	if _, err := w.Write(out); err != nil {
		return errClientGone
	}
	w.Flush()
	return nil
}

// forwardSSE relays the event stream, flushing at every event boundary and
// whenever the upstream has nothing buffered, and extracts usage from the
// upstream events on the way. Without a converter lines pass through
// verbatim; with one each upstream event goes through the stream converter
// and its output events are written instead. When the client asked for a
// JSON array stream (jsonArrayStream) the event data are written as the
// elements of one JSON array instead of SSE.
func (c *call) forwardSSE(ctx context.Context, resp *http.Response, u *usageAcc, conv convert.Converter, cap *usageCapture) error {
	arr := c.jsonArrayStream()
	w := c.c.Writer
	h := w.Header()
	if arr {
		h.Set("Content-Type", "application/json; charset=utf-8")
	} else {
		h.Set("Content-Type", "text/event-stream")
		h.Set("Cache-Control", "no-cache")
	}
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(resp.StatusCode)
	w.Flush()

	var sc convert.StreamConverter
	if conv != nil {
		sc = conv.NewStream()
	}
	passthrough := sc == nil && !arr
	var out []byte
	elements := 0
	emit := func(evs []convert.Event, err error) error {
		if err != nil {
			return &convertError{err: err}
		}
		out = out[:0]
		for _, ev := range evs {
			if !arr {
				out = convert.AppendSSE(out, ev)
				continue
			}
			d := bytes.TrimSpace(ev.Data)
			if len(d) == 0 || string(d) == "[DONE]" {
				continue
			}
			if elements == 0 {
				out = append(out, '[')
			} else {
				out = append(out, ",\r\n"...)
			}
			elements++
			out = append(out, d...)
		}
		if len(out) == 0 {
			return nil
		}
		if _, werr := w.Write(out); werr != nil {
			return errClientGone
		}
		w.Flush()
		return nil
	}
	closeArray := func() error {
		if !arr {
			return nil
		}
		end := "]"
		if elements == 0 {
			end = "[]"
		}
		if _, werr := w.Write([]byte(end)); werr != nil {
			return errClientGone
		}
		return nil
	}

	br := bufio.NewReaderSize(resp.Body, 64<<10)
	var event string
	var data []byte
	dispatch := func() error {
		if event == "" && len(data) == 0 {
			return nil
		}
		if c.rec.FirstTokenMs == 0 && len(data) > 0 {
			c.rec.FirstTokenMs = max(1, int(c.g.now().Sub(c.start)/time.Millisecond))
		}
		u.ApplySSE(event, data)
		// Only the events the endpoint named are kept, and only while the
		// caps allow: the stream itself is relayed and dropped, never
		// accumulated (usageplugin.go).
		if cap != nil && gjson.ValidBytes(data) {
			cap.addEvent(usagerules.EventName(event, data), data)
		}
		var err error
		switch {
		case sc != nil:
			err = emit(sc.Event(convert.Event{Name: event, Data: data}))
		case arr:
			err = emit([]convert.Event{{Name: event, Data: data}}, nil)
		}
		event, data = "", data[:0]
		return err
	}
	for {
		line, rerr := readLine(br, maxSSELine)
		if len(line) > 0 {
			if passthrough {
				if _, werr := w.Write(line); werr != nil {
					return errClientGone
				}
			}
			t := bytes.TrimRight(line, "\r\n")
			switch {
			case len(t) == 0:
				if err := dispatch(); err != nil {
					return err
				}
			case bytes.HasPrefix(t, []byte("event:")):
				event = strings.TrimSpace(string(t[len("event:"):]))
			case bytes.HasPrefix(t, []byte("data:")):
				d := t[len("data:"):]
				if len(d) > 0 && d[0] == ' ' {
					d = d[1:]
				}
				if len(data) > 0 {
					data = append(data, '\n')
				}
				data = append(data, d...)
			}
			if passthrough && (len(t) == 0 || br.Buffered() == 0) {
				w.Flush()
			}
		}
		if rerr != nil {
			derr := dispatch()
			if sc != nil && derr == nil {
				derr = emit(sc.Flush())
			}
			if derr == nil && rerr == io.EOF {
				// An interrupted stream leaves the array open, so the
				// client notices the truncation.
				derr = closeArray()
			}
			w.Flush()
			if derr != nil {
				return derr
			}
			if rerr == io.EOF {
				return nil
			}
			if ctx.Err() != nil {
				return errClientGone
			}
			return rerr
		}
	}
}

// jsonArrayStream reports whether the client of a streaming Gemini endpoint
// expects Google's default stream framing (one JSON array whose elements
// arrive progressively) rather than SSE (?alt=sse). Upstream events are
// re-framed accordingly.
func (c *call) jsonArrayStream() bool {
	return c.ep.Protocol == protocolGeminiStream && !strings.EqualFold(c.c.Query("alt"), "sse")
}

const protocolGeminiStream = manifest.PlatformGemini + ".stream_generate"

// readLine returns the next line including its '\n' (the last line may lack
// it). The slice is only valid until the next read.
func readLine(br *bufio.Reader, limit int) ([]byte, error) {
	line, err := br.ReadSlice('\n')
	if !errors.Is(err, bufio.ErrBufferFull) {
		return line, err
	}
	buf := append([]byte(nil), line...)
	for {
		line, err = br.ReadSlice('\n')
		buf = append(buf, line...)
		if len(buf) > limit {
			return buf, errLineTooLong
		}
		if !errors.Is(err, bufio.ErrBufferFull) {
			return buf, err
		}
	}
}

// ---------------------------------------------------------------- usage extraction

// usageAcc applies the platform's declarative usage rules. The extraction
// itself lives in usagerules, shared with the console "test account" action.
type usageAcc = usagerules.Acc

func newUsageAcc(rules manifest.UsageRules) *usageAcc { return usagerules.New(rules) }

// readPrefix reads at most n bytes of r.
func readPrefix(r io.Reader, n int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, n))
}
