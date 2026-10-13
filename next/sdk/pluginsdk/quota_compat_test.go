package pluginsdk

import (
	"context"
	"fmt"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestQuotaCapabilitiesRequireCompatibleHost(t *testing.T) {
	for _, declaration := range []string{
		`{"id":"managed","modelAvailability":true}`,
		`{"id":"managed","quota":{"query":true,"autoRefresh":true}}`,
	} {
		raw := []byte(fmt.Sprintf(`{"key":"quota-probe","version":"1.0.0","accountTypes":[%s]}`, declaration))
		rt, err := newRuntime(&availabilityPlatform{}, buildOptions([]Option{WithManifest(raw)}), nil)
		if err != nil {
			t.Fatal(err)
		}
		for _, version := range []int32{0, 6} {
			_, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: version})
			if status.Code(err) != codes.FailedPrecondition || status.Convert(err).Message() != "quota capabilities require host API version 7 or newer" {
				t.Fatalf("declaration %s accepted old host %d: %v", declaration, version, err)
			}
		}
		_, err = rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: 7})
		if status.Convert(err).Message() != "no host dialer" {
			t.Fatalf("current host did not reach normal initialization: %v", err)
		}
	}
	legacy, err := newRuntime(ordinaryTestPlatform{}, buildOptions([]Option{WithInfo("legacy", "1.0.0")}), nil)
	if err != nil {
		t.Fatal(err)
	}
	_, err = legacy.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: 6})
	if status.Convert(err).Message() != "no host dialer" {
		t.Fatalf("legacy plugin was restricted: %v", err)
	}
}
