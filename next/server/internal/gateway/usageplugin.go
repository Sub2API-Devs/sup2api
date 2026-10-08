package gateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

// Plugin-reported usage (CONTRACTS §25.3): endpoints whose usage rules
// declare usage.source "plugin" have their token usage read by the plugin
// declaring the platform, through PlatformService.ExtractUsage, instead of by
// the declarative gjson rules.
//
// Two properties of this file are the whole point of the design and must not
// be traded away:
//
//  1. THE STREAM IS NEVER BUFFERED. common.proto's opening contract says
//     request bodies are not shipped whole on the hot path; the same holds
//     for responses, and an SSE stream is unbounded. So a streaming response
//     is relayed exactly as before - event by event, flushed as it goes - and
//     the host keeps only the events whose name the endpoint listed in
//     usage.streamEvents, under a byte budget and an event count cap. A
//     stream that exceeds either stops being collected (and the plugin is
//     told, so it does not report a number computed from a prefix as if it
//     were the total).
//
//  2. THE CALL HAPPENS AFTER THE HANDLER RETURNS. Everything the client is
//     going to receive has been written when the extraction runs, and the
//     gin handler has already returned, so the response is terminated (the
//     last chunk of a chunked or SSE body goes out) without waiting for a
//     plugin. Running it inside forward() would be "after the bytes" but
//     still before the client sees the end of the response - measurably
//     slower for exactly the streaming endpoints this feature exists for.
//     Only the usage record waits, and that was always asynchronous.
const (
	// defaultUsageMaxBytes is what usage.maxBytes defaults to: the whole
	// non-streaming body, or the total size of the collected stream events.
	defaultUsageMaxBytes = 256 << 10
	// maxUsageStreamEvents caps how many events are collected regardless of
	// the byte budget. The allow-list is meant to name a handful of summary
	// events ("message_delta"); an endpoint whose listed name matches every
	// chunk would otherwise turn the byte budget into the only thing
	// standing between a long stream and a large buffer.
	maxUsageStreamEvents = 64
)

// usageCapture holds what PlatformService.ExtractUsage will be given. It is
// nil for every endpoint that does not declare usage.source "plugin", which
// is how those endpoints pay exactly nothing for this feature - not one
// comparison per event, not one allocation, and never a call.
type usageCapture struct {
	want     map[string]bool
	budget   int
	events   []*pluginv1.StreamEvent
	stream   bool
	stopped  bool // the cap was reached; collection has ended
	body     []byte
	tooLarge bool // non-streaming body over usage.maxBytes: not handed over
}

// newUsageCapture returns the capture for the route, or nil when the usage
// comes from the declarative rules.
//
// The three knobs are read off the upstream ENDPOINT, not off the usage rules
// in effect: the rules follow the §13 override chain whose last link belongs
// to a third plugin, so who answers ExtractUsage would otherwise have had two
// readings (CONTRACTS §25.3, manifest.Endpoint.UsageSource).
func newUsageCapture(rt *typeRoute) *usageCapture {
	if !rt.pluginUsage {
		return nil
	}
	budget := int(rt.usageMaxBytes)
	if budget <= 0 {
		budget = defaultUsageMaxBytes
	}
	want := make(map[string]bool, len(rt.usageEvents))
	for _, n := range rt.usageEvents {
		want[n] = true
	}
	return &usageCapture{want: want, budget: budget}
}

// addEvent keeps one upstream SSE event when the endpoint asked for it. data
// belongs to the forwarding loop's reusable buffer, so it is copied.
func (u *usageCapture) addEvent(name string, data []byte) {
	if u == nil {
		return
	}
	u.stream = true
	if u.stopped || !u.want[name] || len(data) == 0 {
		return
	}
	if len(u.events) >= maxUsageStreamEvents || len(data) > u.budget {
		u.stopped = true
		return
	}
	u.budget -= len(data)
	u.events = append(u.events, &pluginv1.StreamEvent{Name: name, Data: append([]byte(nil), data...)})
}

// setBody keeps a non-streaming response body. A body larger than the budget
// is dropped rather than cut: the events of a stream are a list, of which a
// prefix still means something, but a JSON document cut in half is not a
// document at all and a plugin parsing it would report numbers that are
// wrong rather than missing.
func (u *usageCapture) setBody(body []byte) {
	if u == nil {
		return
	}
	if len(body) > u.budget {
		u.tooLarge = true
		return
	}
	u.body = body
}

// dropBody marks that the non-streaming body could not be kept at all (it
// exceeded even the host's own usage buffer), so nothing is handed over.
func (u *usageCapture) dropBody() {
	if u != nil {
		u.tooLarge = true
	}
}

// extractUsage asks the plugin declaring the platform to read the usage of a
// response the client has already received in full, and replaces what the
// declarative rules produced with what it answers.
//
// It runs on its own goroutine after the gin handler returned (submit), so
// everything it needs was copied out of the request in armUsageExtraction:
// the gin context is pooled and must not be touched from here.
//
// The declarative rules ran anyway while forwarding: they cost nothing extra
// (they were already applied to every event) and they are the fallback here.
// On any failure - no plugin client, a transport error, a timeout, an
// UNIMPLEMENTED from a plugin that never wrote the method, a nil answer, or a
// body the host would not hand over - the record keeps whatever the rules
// found and is marked core.UsageExtractFallback.
//
// Falling back rather than failing is deliberate: the response was already
// delivered and the upstream was already paid for it, so turning a successful
// request into an error afterwards helps nobody. The cost of that choice is
// real - an endpoint that chose usage.source "plugin" usually has no usable
// gjson rules, so the fallback often bills zero. That is why the fallback is
// never silent: it warns naming the plugin and the reason, and it writes
// usage_extract into usage_logs.billing_detail, so "billed from nothing"
// is a state an operator can find and alert on rather than a gap in a graph.
func (c *call) extractUsage(ctx context.Context, p *pendingExtract) {
	if p == nil || c.rec == nil {
		return
	}
	rt := p.rt
	pb, ok := c.gen.Platform(rt.platform)
	if !ok || pb.Client == nil {
		// Install-time validation requires platform.adapter.v1 of any plugin
		// declaring usage.source "plugin", so this is a package installed
		// before that rule existed, or a built-in platform. Nothing can be
		// asked, so the rules stand.
		c.usageFallback(ctx, rt, "the platform of this response has no plugin client", nil)
		return
	}
	if p.cap.tooLarge {
		c.usageFallback(ctx, rt, "response body larger than usage.maxBytes", nil)
		return
	}
	if p.cap.stopped {
		slog.WarnContext(ctx, "gateway: stopped collecting usage stream events at the cap",
			"request_id", c.rid, "plugin", pb.Plugin.Key, "platform", rt.platform, "protocol", rt.upstream,
			"events", len(p.cap.events), "max_events", maxUsageStreamEvents)
	}
	ectx, cancel := context.WithTimeout(ctx, c.gw.hotpathTimeout())
	rep, err := pb.Client.ExtractUsage(ectx, &pluginv1.ExtractUsageRequest{
		Meta: p.meta, Account: p.account, Status: int32(p.status), Headers: p.headers,
		Body: p.cap.body, Events: p.cap.events, Truncated: p.cap.stopped,
		Fields: p.fields, FieldsOmitted: p.fieldsOmitted,
	})
	cancel()
	if err != nil || rep == nil {
		c.usageFallback(ctx, rt, "ExtractUsage failed", err)
		return
	}
	c.applyUsageReport(ctx, rt, pb.Plugin.Key, rep)
}

// pendingExtract is one armed ExtractUsage call: everything it needs, copied
// out of the request while the handler still owned it.
type pendingExtract struct {
	rt      *typeRoute
	cap     *usageCapture
	meta    *pluginv1.RequestMeta
	account *pluginv1.Account
	headers map[string]string
	status  int
	// fields are the values of the endpoint's usageRequestFields, read out of
	// the request body at arming time; fieldsOmitted names the declared paths
	// whose value was there but over a cap. Both nil for endpoints declaring
	// no request fields. The body itself is NOT kept: this is the whole of
	// what survives the handler.
	fields        map[string]string
	fieldsOmitted []string
	// accountID is the account that served the request; its rate-limit token
	// counter is only updated once the real usage is known.
	accountID int64
}

// armUsageExtraction records what the plugin call will need, at the end of
// forwarding. It does not call anything: the call happens in submit, after
// the handler returned. upBody is the request body as it went upstream
// (converted when the route converts, before the plugin's own patches) - the
// document BuildUpstreamRequest's fields were read from.
func (c *call) armUsageExtraction(rt *typeRoute, acct *pluginv1.Account, resp *http.Response, cap *usageCapture, upBody []byte) {
	if cap == nil || c.rec == nil {
		return
	}
	headers := make(map[string]string, len(resp.Header))
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[strings.ToLower(k)] = v[0]
		}
	}
	// The response is read, not built: credentials are never sent. Settings
	// travel only to the plugin that owns the account type, which is the one
	// that already sees them on every upstream attempt.
	small := &pluginv1.Account{Id: acct.GetId(), Name: acct.GetName(),
		Platform: acct.GetPlatform(), Type: acct.GetType()}
	if pb, ok := c.gen.Platform(rt.platform); ok && pb.Plugin.Key != "" && pb.Plugin.Key == rt.binding.Plugin.Key {
		small.SettingsJson = acct.GetSettingsJson()
	}
	fields, omitted := usageRequestFields(rt.usageRequestFields, upBody)
	c.usage = &pendingExtract{rt: rt, cap: cap, meta: c.metaFor(rt), account: small,
		headers: headers, status: resp.StatusCode, fields: fields, fieldsOmitted: omitted}
}

// usageRequestFields reads the declared request paths out of body for
// ExtractUsageRequest.fields, under the SDK's two caps: a value larger than
// check.MaxUsageRequestFieldBytes is left out, and so is every value that
// would take the total past check.MaxUsageRequestFieldsBytes. Left-out paths
// are returned in omitted, so the plugin can tell them from paths the client
// did not send. Declared order decides who wins the budget, so the answer is
// the same on every node.
//
// A value is left out rather than cut for the reason a non-streaming body
// over usage.maxBytes is not handed over: half a JSON value parses into the
// wrong thing, not into nothing. And the raw JSON comes straight from the
// client, so it is sanitised the way every other client byte that enters a
// proto string field is (CONTRACTS §25.1) - readBody already refuses a body
// with invalid UTF-8, this is the belt to that brace.
func usageRequestFields(paths []string, body []byte) (fields map[string]string, omitted []string) {
	if len(paths) == 0 || len(body) == 0 {
		return nil, nil
	}
	budget := check.MaxUsageRequestFieldsBytes
	for _, p := range paths {
		raw := getJSON(body, p)
		if raw == "" {
			continue
		}
		if len(raw) > check.MaxUsageRequestFieldBytes || len(raw) > budget {
			omitted = append(omitted, p)
			continue
		}
		budget -= len(raw)
		if fields == nil {
			fields = make(map[string]string, len(paths))
		}
		fields[p] = strings.ToValidUTF8(raw, "")
	}
	return fields, omitted
}

func (c *call) usageFallback(ctx context.Context, rt *typeRoute, why string, err error) {
	c.rec.UsageExtract = core.UsageExtractFallback
	slog.WarnContext(ctx, "gateway: plugin usage extraction failed, billing from the declarative rules",
		"request_id", c.rid, "plugin", rt.binding.Plugin.Key, "platform", rt.platform,
		"protocol", rt.upstream, "endpoint", c.ep.Path, "reason", why, "err", err,
		"input_tokens", c.rec.Tokens.Input, "output_tokens", c.rec.Tokens.Output)
}

// applyUsageReport writes the upstream facts the plugin stated into the usage
// record - and nothing else.
//
// This is the boundary of PLUGIN-EXECUTES-CORE-RECORDS §4 in code: the only
// fields touched here are the token counts, the declared metering facts, the
// upstream model, the plugin's reading of an upstream error, and its opaque
// detail document. Attribution (user, api key, group, account), the request's
// own facts (status, attempts, latency, client, node, timestamps) and
// everything about money (multiplier, price, mode, tier, cost, billing
// status) are filled by the core elsewhere and are not reachable from here.
// UsageReport has no field for any of them, so a plugin cannot even ask.
func (c *call) applyUsageReport(ctx context.Context, rt *typeRoute, platformKey string, rep *pluginv1.UsageReport) {
	c.rec.UsageExtract = core.UsageExtractPlugin
	t := rep.GetTokens()
	c.rec.Tokens = usagerules.Tokens(t.GetInputTokens(), t.GetOutputTokens(), t.GetCacheReadTokens(),
		t.GetCacheCreationTokens(), t.GetCacheCreation_1HTokens())
	c.rec.Metrics = preserveHostCacheEvidence(c.rec.Metrics, c.reportedFacts(ctx, rt, rep.GetFacts()))
	if m := rep.GetUpstreamModel(); m != "" && m != c.model {
		c.rec.UpstreamModel = truncateUTF8(m, 200)
	}
	// An error the plugin read out of a 2xx response is recorded the same way
	// an error event in a stream already is: the client keeps the bytes it
	// got, the record stops claiming the request succeeded.
	if et := rep.GetErrorType(); et != "" {
		c.rec.Success = false
		c.rec.ErrorType = truncateUTF8(et, 50)
		c.rec.ErrorMessage = truncateUTF8(firstNonEmpty(rep.GetErrorMessage(), c.rec.ErrorMessage), 1000)
	}
	c.rec.PluginDetail = pluginDetail(ctx, c.rid, rt.binding.Plugin.Key, rep.GetDetailJson())
	c.applyReservation(ctx, rt, platformKey, rep.GetReserve())
}

// refIDRe is what a Reservation.ref_id may look like: the kind of opaque id
// an upstream hands out for a job. It has to survive a varchar(200) column
// and a log line, and it is compared for equality and nothing else.
var refIDRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$`)

// applyReservation records that this request only STARTED the work upstream
// (CONTRACTS §25.4). The estimate the plugin gave replaces the report's own
// token counts and facts - it is what will be priced, charged and stored,
// because until a reconcile says otherwise it is this request's usage.
//
// Everything else about the reservation is the core's: which plugin will be
// asked (the one declaring this platform - the one that just answered, not
// something the plugin can name), when, for how long, and what any of it
// costs. UsageReport has no field for a plugin to say otherwise.
func (c *call) applyReservation(ctx context.Context, rt *typeRoute, platformKey string, rv *pluginv1.Reservation) {
	if rv == nil {
		return
	}
	ref := rv.GetRefId()
	if !refIDRe.MatchString(ref) {
		// Without a usable id the entry could never be looked up again, and
		// pre-charging something that can never be reconciled is strictly
		// worse than billing it now. Drop the reservation, keep the usage.
		slog.WarnContext(ctx, "gateway: plugin reserved with an unusable ref_id, the request is billed normally",
			"request_id", c.rid, "plugin", platformKey, "platform", rt.platform, "ref_id", truncateUTF8(ref, 100))
		return
	}
	if platformKey == "" {
		slog.WarnContext(ctx, "gateway: a built-in platform cannot reserve, the request is billed normally",
			"request_id", c.rid, "platform", rt.platform)
		return
	}
	if t := rv.GetTokens(); t != nil {
		c.rec.Tokens = usagerules.Tokens(t.GetInputTokens(), t.GetOutputTokens(), t.GetCacheReadTokens(),
			t.GetCacheCreationTokens(), t.GetCacheCreation_1HTokens())
	}
	if f := rv.GetFacts(); len(f) > 0 {
		c.rec.Metrics = preserveHostCacheEvidence(c.rec.Metrics, c.reportedFacts(ctx, rt, f))
	}
	c.rec.Reservation = &core.UsageReservation{
		PluginKey:      platformKey,
		RefID:          ref,
		NextCheckAfter: time.Duration(rv.GetNextCheckAfterSec()) * time.Second,
		Deadline:       time.Duration(rv.GetDeadlineSec()) * time.Second,
	}
}

// reportedFacts turns the plugin's string facts into the shapes price
// expressions read, using the endpoint's own usage.facts declarations.
//
// Only declared keys survive. The manifest is what tells administrators which
// u("key") exist and what type each one has; a plugin that could add keys at
// runtime would make that list a guess, and a fact nobody declared is one no
// price expression was written against anyway.
func (c *call) reportedFacts(ctx context.Context, rt *typeRoute, facts map[string]string) map[string]any {
	if len(facts) == 0 {
		return nil
	}
	out := make(map[string]any, len(facts))
	for key, raw := range facts {
		if key == core.CacheWriteEvidenceKey {
			continue
		}
		f, ok := rt.usage.Facts[key]
		if !ok {
			slog.WarnContext(ctx, "gateway: plugin reported a usage fact the manifest does not declare, dropped",
				"request_id", c.rid, "plugin", rt.binding.Plugin.Key, "protocol", rt.upstream, "fact", key)
			continue
		}
		v, ok := usagerules.Fact(f, raw)
		if !ok {
			slog.WarnContext(ctx, "gateway: plugin reported a usage fact that does not fit its declared type, dropped",
				"request_id", c.rid, "plugin", rt.binding.Plugin.Key, "protocol", rt.upstream,
				"fact", key, "type", f.Type, "value", truncateUTF8(raw, 200))
			continue
		}
		out[key] = v
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// pluginDetail validates UsageReport.detail_json for usage_logs.plugin_detail:
// a JSON object of at most core.MaxPluginDetailBytes.
//
// An over-long document is replaced by a marker rather than cut off. The
// column is jsonb, so there is no such thing as storing the first 4 KiB of it;
// the choice is between a document and a note saying there was one. A note
// that names the size is the honest half of that pair, and the warning names
// the plugin that should shrink it.
func pluginDetail(ctx context.Context, rid, pluginKey, raw string) core.RawJSON {
	if raw == "" {
		return nil
	}
	if len(raw) > core.MaxPluginDetailBytes {
		slog.WarnContext(ctx, "gateway: plugin detail_json over the limit, stored as a marker",
			"request_id", rid, "plugin", pluginKey, "bytes", len(raw), "limit", core.MaxPluginDetailBytes)
		b, _ := json.Marshal(map[string]any{"_truncated": true, "_bytes": len(raw)})
		return b
	}
	if !gjson.Valid(raw) || !gjson.Parse(raw).IsObject() {
		slog.WarnContext(ctx, "gateway: plugin detail_json is not a JSON object, dropped",
			"request_id", rid, "plugin", pluginKey, "value", truncateUTF8(raw, 200))
		return nil
	}
	return core.RawJSON(raw)
}
