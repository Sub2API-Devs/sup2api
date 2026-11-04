package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func jobsManifest(jobs ...manifest.Job) *manifest.Manifest {
	m := minimal()
	m.HostCompat = ">=0.1.237 <0.2.0"
	m.Capabilities = []manifest.Capability{{ID: manifest.CapAppJobs}}
	m.HostPermissions = []manifest.HostPermission{{ID: "jobs"}}
	m.Jobs = jobs
	return m
}

func jobCodes(m *manifest.Manifest) map[string]string {
	return codes(Validate(m, nil, ValidateOptions{Tooling: true}))
}

func TestJobScopeAndTitle(t *testing.T) {
	ok := jobsManifest(
		manifest.Job{ID: "evaluate", Schedule: "@every 10s", TimeoutSec: 60},
		manifest.Job{ID: "cleanup", Schedule: "17 * * * *", TimeoutSec: 300, Scope: manifest.JobScopeCluster,
			Title: manifest.LocalizedText{"en": "Clean up", "zh": "清理"}},
		manifest.Job{ID: "refresh", Schedule: "@every 30s", TimeoutSec: 10, Scope: manifest.JobScopeNode},
	)
	if c := jobCodes(ok); len(c) > 0 {
		t.Fatalf("valid jobs rejected: %v", c)
	}

	cases := []struct {
		name  string
		job   manifest.Job
		field string
		code  string
	}{
		{"unknown scope", manifest.Job{ID: "a", Schedule: "@every 1m", Scope: "everywhere"}, "jobs[0].scope", "invalid"},
		{"node job too frequent", manifest.Job{ID: "a", Schedule: "@every 2s", Scope: manifest.JobScopeNode}, "jobs[0].schedule", "out_of_range"},
		{"node job too long", manifest.Job{ID: "a", Schedule: "@every 1m", TimeoutSec: 601, Scope: manifest.JobScopeNode}, "jobs[0].timeoutSec", "out_of_range"},
		{"blank title", manifest.Job{ID: "a", Schedule: "@every 1m", Title: manifest.LocalizedText{"zh": " "}}, "jobs[0].title.zh", "invalid"},
	}
	for _, tc := range cases {
		c := jobCodes(jobsManifest(tc.job))
		if c[tc.field] != tc.code {
			t.Errorf("%s: want %s=%s, got %v", tc.name, tc.field, tc.code, c)
		}
	}

	// A cluster job runs for at most an hour and at most every 5 seconds,
	// what the task framework runs (core 0.1.237 cut longer ones silently).
	if c := jobCodes(jobsManifest(manifest.Job{ID: "a", Schedule: "0 3 * * *", TimeoutSec: 3600})); len(c) > 0 {
		t.Fatalf("an hour is allowed: %v", c)
	}
	if c := jobCodes(jobsManifest(manifest.Job{ID: "a", Schedule: "0 3 * * *", TimeoutSec: 3601})); c["jobs[0].timeoutSec"] != "out_of_range" {
		t.Fatalf("a cluster job over an hour must be rejected: %v", c)
	}
	if c := jobCodes(jobsManifest(manifest.Job{ID: "a", Schedule: "@every 2s"})); c["jobs[0].schedule"] != "out_of_range" {
		t.Fatalf("a cluster job every 2s must be rejected: %v", c)
	}
	if c := jobCodes(jobsManifest(manifest.Job{ID: "a", Schedule: "@every 5s"})); len(c) > 0 {
		t.Fatalf("every 5s is allowed: %v", c)
	}
}

func TestNodeJobsLimit(t *testing.T) {
	var jobs []manifest.Job
	for _, id := range []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"} {
		jobs = append(jobs, manifest.Job{ID: id, Schedule: "@every 1m", Scope: manifest.JobScopeNode})
	}
	if c := jobCodes(jobsManifest(jobs...)); c["jobs"] != "out_of_range" {
		t.Fatalf("eleven node jobs must be rejected: %v", c)
	}
	if c := jobCodes(jobsManifest(jobs[:10]...)); len(c) > 0 {
		t.Fatalf("ten node jobs are allowed: %v", c)
	}
}

// Core 0.1.236 and older ignore scope: a node job would run once per cluster
// there, so hostCompat must keep those cores out.
func TestNodeJobsNeedNodeJobsCore(t *testing.T) {
	m := jobsManifest(manifest.Job{ID: "refresh", Schedule: "@every 30s", Scope: manifest.JobScopeNode})
	m.HostCompat = ">=0.1.229 <0.2.0"
	if c := jobCodes(m); c["hostCompat"] != "below_node_jobs_core" {
		t.Fatalf("hostCompat admitting 0.1.236 must be rejected: %v", c)
	}
	m.Jobs[0].Scope = manifest.JobScopeCluster
	if c := jobCodes(m); len(c) > 0 {
		t.Fatalf("cluster jobs run on any core: %v", c)
	}
}
