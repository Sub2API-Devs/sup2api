package resources

// ScanResponseReferences recognizes a complete Anthropic Message or one SSE
// event. It never walks arbitrary tool input, text or encrypted payloads.
func ScanResponseReferences(body []byte) ([]Reference, error) {
	s, err := scanResponse(body)
	if err != nil {
		return nil, err
	}
	return s.refs, nil
}

func ScanResponseSkillVersions(body []byte) ([]SkillReference, error) {
	s, err := scanResponse(body)
	if err != nil {
		return nil, err
	}
	return s.versions, nil
}

func scanResponse(body []byte) (*referenceScanner, error) {
	root, err := referenceObject(body)
	if err != nil {
		return nil, err
	}
	s := &referenceScanner{}
	switch root["type"] {
	case "message":
		if err := s.container(root["container"], "container"); err != nil {
			return nil, err
		}
		if err := s.blocks(root["content"], "content", 0); err != nil {
			return nil, err
		}
	case "message_start":
		message, _ := root["message"].(map[string]any)
		if err := s.container(message["container"], "message.container"); err != nil {
			return nil, err
		}
		if err := s.blocks(message["content"], "message.content", 0); err != nil {
			return nil, err
		}
	case "message_delta":
		// Legacy Worker envelope compatibility: older response-extension
		// handling preserves container at the event root. The provider's
		// documented location is delta.container below.
		if err := s.container(root["container"], "container"); err != nil {
			return nil, err
		}
		delta, _ := root["delta"].(map[string]any)
		if err := s.container(delta["container"], "delta.container"); err != nil {
			return nil, err
		}
	case "message_stop":
		// Likewise, Worker final-stop extension forwarding can retain this
		// registered envelope field. It is not an official stop-event field.
		if err := s.container(root["container"], "container"); err != nil {
			return nil, err
		}
	case "content_block_start":
		block, _ := root["content_block"].(map[string]any)
		if err := s.block(block, "content_block", 0); err != nil {
			return nil, err
		}
	}
	return s, nil
}
