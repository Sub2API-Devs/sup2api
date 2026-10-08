package engine

import "fmt"

type imageTransformField struct {
	block   Object
	value   any
	present bool
}

func imageBlocks(blocks []Object) []Object {
	var out []Object
	_ = visitProtocolBlocks(blocks, func(block Object) error {
		if str(block, "type") == "image" {
			out = append(out, block)
		}
		return nil
	})
	return out
}

// CLI 2.1.292 rebuilds base64 image envelopes without transformations. Compare
// every client turn/source before restoring that one field at its exact slot.
// An identical image elsewhere is not sufficient evidence to attach metadata.
func (r *Request) restoreImageTransformations(body Object) error {
	needed := false
	for _, m := range r.Messages {
		for _, image := range imageBlocks(m.Content) {
			_, present := image["transformations"]
			needed = needed || present
		}
	}
	if !needed {
		return nil
	}
	copy, err := jsonCopyObject(body)
	if err != nil {
		return err
	}
	shadow := *r
	shadow.Messages = append([]Message(nil), r.Messages...)
	for i, m := range r.Messages {
		owned, err := jsonCopyObject(Object{"content": m.Content})
		if err != nil {
			return err
		}
		shadow.Messages[i].Content, _ = historyContent(owned["content"])
		for _, image := range imageBlocks(shadow.Messages[i].Content) {
			delete(image, "transformations")
		}
	}
	var fields []imageTransformField
	messages, ok := copy["messages"].([]any)
	if !ok {
		return fmt.Errorf("image metadata messages missing")
	}
	for _, v := range messages {
		message, _ := v.(map[string]any)
		content, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		for _, image := range imageBlocks(content) {
			value, present := image["transformations"]
			fields = append(fields, imageTransformField{image, value, present})
			delete(image, "transformations")
		}
	}
	pairs, err := alignClientHistory(&shadow, copy)
	if err != nil {
		return fmt.Errorf("image metadata history changed: %w", err)
	}
	for _, field := range fields {
		if field.present {
			field.block["transformations"] = field.value
		}
	}
	for i, pair := range pairs {
		expected, actual := imageBlocks(r.Messages[i].Content), imageBlocks(pair.actual)
		if len(expected) != len(actual) {
			return fmt.Errorf("image metadata positions changed")
		}
		for j, image := range expected {
			want, explicit := image["transformations"]
			got, present := actual[j]["transformations"]
			if present && (!explicit || digest(got) != digest(want)) {
				return fmt.Errorf("image transformations conflict at original history position")
			}
			if explicit && !present {
				owned, _ := jsonCopyObject(Object{"value": want})
				actual[j]["transformations"] = owned["value"]
			}
		}
	}
	for key := range body {
		delete(body, key)
	}
	for key, value := range copy {
		body[key] = value
	}
	return nil
}
