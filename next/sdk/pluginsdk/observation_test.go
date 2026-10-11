package pluginsdk

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type testObservationPlugin struct{}

func (testObservationPlugin) OnObservations(context.Context, *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	return &pluginv1.ObservationResult{}, nil
}

func TestObservationRequiresCompatibleHost(t *testing.T) {
	rt, err := newRuntime(testObservationPlugin{}, buildOptions([]Option{WithInfo("probe", "1.0.0")}), nil)
	if err != nil {
		t.Fatal(err)
	}
	info, err := rt.GetInfo(context.Background(), &pluginv1.GetInfoRequest{})
	if err != nil || len(info.Capabilities) != 1 || info.Capabilities[0] != observation.Capability {
		t.Fatal(info, err)
	}
	_, err = rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: protocol.ObservationHostAPIVersion - 1})
	if status.Code(err) != codes.FailedPrecondition || !strings.Contains(err.Error(), "observations require") {
		t.Fatal(err)
	}
	_, err = ReadObservationMetrics(context.Background(), nil, &pluginv1.ReadObservationMetricsRequest{})
	if err != ErrHostNotReady {
		t.Fatal(err)
	}
}
