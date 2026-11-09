package goldentest

import (
	"bytes"
	"context"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// maxDiffs bounds the case differences one comparison reports.
const maxDiffs = 20

// Golden runs m against s and compares the answers with the golden file of
// m.Plugin; with -update-golden it rewrites the file instead. It also
// replays the file's recorded inputs, which checks that they decode back to
// the same requests (the path Replay takes).
func Golden(t testing.TB, m Matrix, s Subject) {
	t.Helper()
	got, err := m.Record(s)
	if err != nil {
		t.Fatal(err)
	}
	if *update {
		if err := got.write(); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := Load(m.Plugin)
	if err != nil {
		t.Fatalf("%v (run with -args -update-golden to create it)", err)
	}
	compare(t, want, got)
	compare(t, want, replay(t, want, s))
}

// Replay runs every input recorded in the golden file of plugin against s
// and fails t where an answer differs from the recorded one.
func Replay(t testing.TB, plugin string, s Subject) {
	t.Helper()
	want, err := Load(plugin)
	if err != nil {
		t.Fatal(err)
	}
	compare(t, want, replay(t, want, s))
}

// replay runs the inputs recorded in want against s.
func replay(t testing.TB, want *File, s Subject) *File {
	t.Helper()
	got := &File{Plugin: want.Plugin, AccountType: want.AccountType}
	for _, r := range want.Cases {
		c, err := r.Case()
		if err != nil {
			t.Fatal(err)
		}
		res, err := Run(s, c)
		if err != nil {
			t.Fatal(err)
		}
		got.Cases = append(got.Cases, res)
	}
	return got
}

// compare reports, by case name, what differs between two golden files.
func compare(t testing.TB, want, got *File) {
	t.Helper()
	if want.Plugin != got.Plugin || want.AccountType != got.AccountType {
		t.Errorf("header: got %s/%s, want %s/%s", got.Plugin, got.AccountType, want.Plugin, want.AccountType)
	}
	gotByName := make(map[string]Result, len(got.Cases))
	for _, r := range got.Cases {
		gotByName[r.Name] = r
	}
	diffs := 0
	fail := func(format string, args ...any) {
		if diffs++; diffs <= maxDiffs {
			t.Errorf(format, args...)
		}
	}
	for _, w := range want.Cases {
		g, ok := gotByName[w.Name]
		delete(gotByName, w.Name)
		if !ok {
			fail("case %q: missing", w.Name)
			continue
		}
		if wb, gb := mustEncode(t, w), mustEncode(t, g); !bytes.Equal(wb, gb) {
			fail("case %q differs\n--- got\n%s\n--- want\n%s", w.Name, gb, wb)
		}
	}
	for name := range gotByName {
		fail("case %q: not in the golden file", name)
	}
	if diffs > maxDiffs {
		t.Errorf("%d more differences", diffs-maxDiffs)
	}
}

func mustEncode(t testing.TB, r Result) []byte {
	t.Helper()
	b, err := encodeJSON(r, "  ")
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// Plugin is a code plugin's account type implementation.
type Plugin interface {
	pluginsdk.Platform
	pluginsdk.ModelLister
}

// FromPlugin adapts a code plugin to Subject; now is the plugin's clock,
// which Classify sets to the case's time.
func FromPlugin(p Plugin, now *func() time.Time) Subject {
	return pluginSubject{p: p, now: now}
}

type pluginSubject struct {
	p   Plugin
	now *func() time.Time
}

func (s pluginSubject) Validate(in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return s.p.ValidateCredentials(context.Background(), in)
}

func (s pluginSubject) Build(in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return s.p.BuildUpstreamRequest(context.Background(), in)
}

func (s pluginSubject) Test(in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return s.p.BuildTestRequest(context.Background(), in)
}

func (s pluginSubject) Models(in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	return s.p.BuildModelsRequest(context.Background(), in)
}

func (s pluginSubject) Classify(now time.Time, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	*s.now = func() time.Time { return now }
	return s.p.ClassifyError(context.Background(), in)
}
