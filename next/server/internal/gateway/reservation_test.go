package gateway

import (
	"context"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Pre-charged usage on the gateway side (CONTRACTS §25.4): what ends up in the
// usage record when a plugin's ExtractUsage says the work only STARTED.
//
// Everything after that - pricing the estimate, charging it, registering the
// entry and reconciling it - belongs to the usage module and is tested there.
// What has to hold here is the boundary: the plugin states an id, an estimate
// and two durations, and the core decides all the rest.

// reserve builds a UsageReport whose reservation names a task.
func reserve(refID string, in, out int64, nextSec, deadlineSec int32) *pluginv1.UsageReport {
	return &pluginv1.UsageReport{
		Tokens: &pluginv1.UsageTokens{InputTokens: 0, OutputTokens: 0},
		Reserve: &pluginv1.Reservation{
			RefId:             refID,
			Tokens:            &pluginv1.UsageTokens{InputTokens: in, OutputTokens: out},
			Facts:             map[string]string{"images": "4"},
			NextCheckAfterSec: nextSec,
			DeadlineSec:       deadlineSec,
		},
	}
}

// The estimate becomes the record's usage - it is what will be priced and
// charged - and the reservation names the plugin the core will ask, which is
// the plugin that just answered and not anything the plugin chose.
func TestReservationReachesTheRecord(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	pp.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		return reserve("task-77", 1200, 300, 120, 7*24*3600), nil
	}
	if res := e.do("/pu/v1/chat", body(testModel, false), nil); res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	rec := e.record()
	rv := rec.Reservation
	if rv == nil {
		t.Fatal("no reservation on the record")
	}
	if rv.RefID != "task-77" || rv.PluginKey != "pu" {
		t.Fatalf("reservation = %+v", rv)
	}
	if rv.NextCheckAfter != 2*time.Minute || rv.Deadline != 7*24*time.Hour {
		t.Fatalf("durations = %s / %s", rv.NextCheckAfter, rv.Deadline)
	}
	// The estimate replaces the report's own (here zero) counts: until a
	// reconcile says otherwise it IS this request's usage.
	if rec.Tokens != (core.UsageTokens{Input: 1200, Output: 300}) {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
	if rec.Metrics["images"] != float64(4) {
		t.Fatalf("metrics %+v", rec.Metrics)
	}
	if rec.UsageExtract != core.UsageExtractPlugin {
		t.Fatalf("usage extract %q", rec.UsageExtract)
	}
}

// An id the core could never look the entry up by is worse than no
// reservation: it would pre-charge something nothing can ever correct. The
// request is billed normally instead.
func TestReservationWithAnUnusableRefIDIsDropped(t *testing.T) {
	for _, ref := range []string{"", "  ", "task 1", "task\n1", strings201()} {
		t.Run(ref, func(t *testing.T) {
			e, pp := usageEnv(t, pluginUsageRules())
			pp.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
				return reserve(ref, 10, 10, 0, 0), nil
			}
			if res := e.do("/pu/v1/chat", body(testModel, false), nil); res.status != 200 {
				t.Fatalf("status %d", res.status)
			}
			rec := e.record()
			if rec.Reservation != nil {
				t.Fatalf("reservation accepted with ref_id %q", ref)
			}
			// The usage the plugin did report still counts: dropping the
			// reservation must not drop the request.
			if rec.UsageExtract != core.UsageExtractPlugin {
				t.Fatalf("usage extract %q", rec.UsageExtract)
			}
		})
	}
}

func strings201() string {
	b := make([]byte, 201)
	for i := range b {
		b[i] = 'a'
	}
	return string(b)
}

// A plugin that reports usage without reserving leaves the record exactly as
// it was before this feature existed.
func TestUsageReportWithoutReservation(t *testing.T) {
	e, pp := usageEnv(t, pluginUsageRules())
	pp.extract = func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		return report(11, 22), nil
	}
	if res := e.do("/pu/v1/chat", body(testModel, false), nil); res.status != 200 {
		t.Fatalf("status %d", res.status)
	}
	rec := e.record()
	if rec.Reservation != nil {
		t.Fatalf("reservation invented: %+v", rec.Reservation)
	}
	if rec.Tokens != (core.UsageTokens{Input: 11, Output: 22}) {
		t.Fatalf("tokens %+v", rec.Tokens)
	}
}
