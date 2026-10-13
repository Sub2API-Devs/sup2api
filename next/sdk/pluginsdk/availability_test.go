package pluginsdk

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
)

type availabilityPlatform struct {
	Platform
	got *pluginv1.CheckModelAvailabilityRequest
}

func (p *availabilityPlatform) CheckModelAvailability(_ context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
	p.got = in
	return &pluginv1.CheckModelAvailabilityResponse{Results: []*pluginv1.ModelAvailability{{AccountId: 7, Model: "mapped", State: pluginv1.ModelAvailability_AVAILABLE}}}, nil
}

func TestAvailabilityWireCompatibility(t *testing.T) {
	for _, test := range []struct {
		message proto.Message
		fields  []string
		numbers []protoreflect.FieldNumber
	}{
		{&pluginv1.CheckModelAvailabilityRequest{}, []string{"candidates", "now_unix"}, []protoreflect.FieldNumber{1, 2}},
		{&pluginv1.ModelAvailabilityCandidate{}, []string{"account_id", "account_type", "model", "quota", "client_model"}, []protoreflect.FieldNumber{1, 2, 3, 4, 5}},
		{&pluginv1.AccountQuotaSnapshot{}, []string{"windows", "updated_at_unix", "error", "revision"}, []protoreflect.FieldNumber{1, 2, 3, 4}},
		{&pluginv1.CheckModelAvailabilityResponse{}, []string{"results"}, []protoreflect.FieldNumber{1}},
		{&pluginv1.ModelAvailability{}, []string{"account_id", "model", "state", "reason", "retry_at_unix"}, []protoreflect.FieldNumber{1, 2, 3, 4, 5}},
		{&pluginv1.BuildQuotaRequestResponse{}, []string{"method", "url", "headers", "body_json", "runtime_operation"}, []protoreflect.FieldNumber{1, 2, 3, 4, 5}},
		{&pluginv1.QuotaResult{}, []string{"windows", "error_type", "error_message", "next_check_at_unix"}, []protoreflect.FieldNumber{1, 2, 3, 4}},
		{&pluginv1.QuotaWindow{}, []string{"key", "utilization", "resets_at_unix", "status", "used", "limit", "utilization_unknown"}, []protoreflect.FieldNumber{1, 2, 3, 4, 5, 6, 7}},
		{&pluginv1.ClassifyErrorResponse{}, []string{"local_failure", "quota"}, []protoreflect.FieldNumber{10, 12}},
	} {
		fields := test.message.ProtoReflect().Descriptor().Fields()
		for i, name := range test.fields {
			field := fields.ByName(protoreflect.Name(name))
			if field == nil || field.Number() != test.numbers[i] {
				t.Fatalf("%T.%s: %v", test.message, name, field)
			}
		}
	}
	old := &pluginv1.BuildQuotaRequestResponse{Method: "GET", Url: "https://example.test/quota"}
	raw, err := proto.Marshal(old)
	if err != nil {
		t.Fatal(err)
	}
	var restored pluginv1.BuildQuotaRequestResponse
	if err := proto.Unmarshal(raw, &restored); err != nil || !proto.Equal(old, &restored) || restored.RuntimeOperation != "" {
		t.Fatalf("legacy quota request: %v %v", &restored, err)
	}
}

func TestQuotaWindowUnknownUtilizationWire(t *testing.T) {
	fields := (&pluginv1.QuotaWindow{}).ProtoReflect().Descriptor().Fields()
	if fields.ByName("utilization").Kind() != protoreflect.DoubleKind || fields.ByName("utilization_unknown").Kind() != protoreflect.BoolKind {
		t.Fatal("quota window scalar types changed")
	}
	for _, utilization := range []float64{0, 42.5} {
		old := &pluginv1.QuotaWindow{Key: "scoped", Utilization: utilization, Used: 3, Limit: 20}
		raw, err := proto.Marshal(old)
		if err != nil {
			t.Fatal(err)
		}
		var restored pluginv1.QuotaWindow
		if err := proto.Unmarshal(raw, &restored); err != nil || restored.GetUtilizationUnknown() || !proto.Equal(old, &restored) {
			t.Fatalf("legacy utilization %v: %v %v", utilization, &restored, err)
		}
	}
	unknown := &pluginv1.QuotaWindow{Key: "scoped", Status: "rejected", UtilizationUnknown: true}
	raw, err := proto.Marshal(unknown)
	if err != nil {
		t.Fatal(err)
	}
	var restored pluginv1.QuotaWindow
	if err := proto.Unmarshal(raw, &restored); err != nil || !restored.GetUtilizationUnknown() || !proto.Equal(unknown, &restored) {
		t.Fatalf("unknown utilization: %v %v", &restored, err)
	}
}

func TestModelAvailabilityOptional(t *testing.T) {
	ctx := context.Background()
	if _, err := (platformServer{}).CheckModelAvailability(ctx, &pluginv1.CheckModelAvailabilityRequest{}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("absent checker: %v", err)
	}
	p := &availabilityPlatform{}
	in := &pluginv1.CheckModelAvailabilityRequest{Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 7, Model: "mapped", ClientModel: "client"}}, NowUnix: 42}
	out, err := (platformServer{impl: p}).CheckModelAvailability(ctx, in)
	if err != nil || p.got != in || out.GetResults()[0].GetState() != pluginv1.ModelAvailability_AVAILABLE {
		t.Fatalf("forwarded: %v %v", out, err)
	}
	fields := in.Candidates[0].ProtoReflect().Descriptor().Fields()
	for _, name := range []string{"credentials_json", "settings_json", "account"} {
		if fields.ByName(protoreflect.Name(name)) != nil {
			t.Fatalf("metadata leaked field %s", name)
		}
	}
}
