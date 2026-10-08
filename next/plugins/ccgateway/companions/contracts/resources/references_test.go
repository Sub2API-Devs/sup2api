package resources

import "testing"

func TestScanReferencesKnownPathsOnly(t *testing.T) {
	body := []byte(`{"messages":[{"content":[{"type":"image","source":{"type":"file","file_id":"file_a"}},{"type":"tool_result","content":[{"type":"document","source":{"type":"content","content":[{"type":"image","source":{"type":"file","file_id":"file_b"}}]}}]},{"type":"tool_use","input":{"file_id":"not_a_reference","content":[{"type":"image","source":{"type":"file","file_id":"ignored"}}]}},{"type":"container_upload","file_id":"file_c"}]}],"tools":[{"input_schema":{"file_id":"ignored"}}]}`)
	refs, err := ScanReferences(body)
	if err != nil || len(refs) != 3 {
		t.Fatalf("%+v %v", refs, err)
	}
	if refs[1].Path != "messages.0.content.1.content.0.source.content.0.source.file_id" {
		t.Fatal(refs)
	}
	if _, err = ScanReferences([]byte(`{"messages":[],"messages":[]}`)); err == nil {
		t.Fatal("ambiguous duplicate JSON accepted")
	}
}
