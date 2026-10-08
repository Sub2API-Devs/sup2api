package engine

import (
	"encoding/json"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// Only gaps between identified public messages belong here. A public inline
// directive is a boundary, never part of private history or its replacement.
func helperInterleavedSystems(messages []any, boundaries []int) (map[int][]any, error) {
	if len(boundaries) == 0 || boundaries[0] != 0 {
		return nil, fmt.Errorf("helper history cannot anchor a private system before the first public message")
	}
	out := make(map[int][]any)
	for after := 0; after+1 < len(boundaries); after++ {
		gap := messages[boundaries[after]+1 : boundaries[after+1]]
		if len(gap) == 0 {
			continue
		}
		systems, rest, err := splitHelperSystems(gap)
		if err != nil || len(rest) != 0 {
			return nil, fmt.Errorf("helper public gap contains unregistered messages")
		}
		out[after] = systems
	}
	return out, nil
}

func sameHelperSystemPositions(before, after map[int][]any) bool {
	if len(before) != len(after) {
		return false
	}
	for index, systems := range before {
		if !helperSystemsMatchSource(systems, after[index]) {
			return false
		}
	}
	return true
}

func helperSystemSegment(public, tools json.RawMessage, after int, systems []any) (helperhistory.Segment, error) {
	anchor, catalog, err := helperHistoryAnchors(public, tools, after)
	if err != nil {
		return helperhistory.Segment{}, err
	}
	segment := helperhistory.Segment{Kind: helperhistory.SegmentSystemOnly, AfterMessage: after, PublicAnchorDigest: anchor, ToolCatalogDigest: catalog}
	for _, message := range systems {
		raw, err := json.Marshal(message)
		if err != nil {
			return helperhistory.Segment{}, err
		}
		segment.Messages = append(segment.Messages, raw)
	}
	return segment, nil
}
