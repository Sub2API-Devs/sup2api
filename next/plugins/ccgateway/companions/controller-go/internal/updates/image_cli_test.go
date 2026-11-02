package updates

import (
	"bytes"
	"context"
	"testing"

	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/pyjson"
)

// Updates without a named CLI (cli-from-image-v1, 2026-11-02): the image's
// one CLI, and the image recorded as the one the runtime now runs.

func (e *env) imageID(ref string) string {
	e.t.Helper()
	img, err := e.h.EnsureImage(context.Background(), ref)
	if err != nil {
		e.t.Fatal(err)
	}
	return img.ID
}

func (e *env) runtimeImage() string {
	ref, _ := e.state().RuntimeImage.Get()
	return ref
}

func pairFromImage() pyjson.Ordered {
	return pyjson.Ordered{{Key: "image", Value: "trusted:release"}, {Key: "components", Value: []any{"worker", "cli"}}}
}

func TestWorkerUpdateRecordsTheRuntimeImage(t *testing.T) {
	e := newEnv(t)
	if _, err := e.update("app:new"); err != nil {
		t.Fatal(err)
	}
	if e.runtimeImage() != e.imageID("app:new") {
		t.Fatal(e.runtimeImage())
	}
	// A rolled back update keeps what runs.
	e.unhealthy(worker, bad)
	if res, err := e.update("app:bad"); err != nil || res[0].Value != "rolled_back" {
		t.Fatal(res, err)
	}
	if e.runtimeImage() != e.imageID("app:new") {
		t.Fatal(e.runtimeImage())
	}
}

func TestPairWithoutVersionActivatesTheImagesCLI(t *testing.T) {
	e := newPairEnv(t)
	res, err := e.u.UpdatePair(context.Background(), aid, pairFromImage())
	if err != nil {
		t.Fatal(err)
	}
	eq(t, res, pyjson.Ordered{{Key: "status", Value: "updated"}, {Key: "sha256", Value: sha(nw)},
		{Key: "cli_version", Value: cliVersion}, {Key: "cli_patch", Value: cliPatch}, {Key: "cli_sha256", Value: sha(cliBinary)},
		{Key: "online", Value: true}})
	if v, _ := e.pointer().Get("version"); v != cliVersion {
		t.Fatal(e.pointer())
	}
	if e.runtimeImage() != e.imageID("trusted:release") {
		t.Fatal(e.runtimeImage())
	}
}

func TestPairWithoutVersionOnTheSameCLIUpdatesOnlyTheWorker(t *testing.T) {
	e := newPairEnv(t)
	e.replaceApp(worker, []string{}, []string{"CCG_CLI_SHA256=" + sha(cliBinary)})
	res, err := e.u.UpdatePair(context.Background(), aid, pairFromImage())
	if err != nil {
		t.Fatal(err)
	}
	if v, _ := res.Get("cli_version"); res[0].Value != "updated" || v != cliVersion || res[len(res)-1].Key != "cli_sha256" {
		t.Fatal(res)
	}
	if !bytes.Equal(e.file(worker), nw) || !bytes.Equal(e.file(ActivePointer), prior) || len(e.cliFiles()) != 0 {
		t.Fatal("only the Worker", e.cliFiles())
	}
	if e.runtimeImage() != e.imageID("trusted:release") {
		t.Fatal(e.runtimeImage())
	}
}

func TestPairWithoutVersionNeedsOneCLIInTheImage(t *testing.T) {
	e := newPairEnv(t)
	two := pyjson.Ordered{{Key: "versions", Value: pyjson.Ordered{{Key: cliVersion, Value: goodEntry()},
		{Key: "2.1.312", Value: goodEntry()}}}}
	e.g.AddImage("trusted:release", fakeguard.ImageSpec{Files: map[string][]byte{
		CLIRoot + "/manifest.json":             pyjson.MustMarshal(two),
		CLIRoot + "/" + cliVersion + "/claude": cliBinary,
		worker:                                 nw,
	}})
	if _, err := e.u.UpdatePair(context.Background(), aid, pairFromImage()); err == nil {
		t.Fatal("two packaged versions")
	}
	if e.w.restartCount() != 0 || !bytes.Equal(e.file(worker), old) {
		t.Fatal("nothing changed")
	}
}
