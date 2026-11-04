async function* SELF({ messages: $l0, systemPrompt: $l1, thinkingConfig: $l2, tools: $l3, signal: $l4, options: $l5 }) {
  try {
    return yield* $m_b8e($m_$We($l0, async function* () {
      yield* $m_LWe($l3, $l4, ($l6) => $m_ugn($l0, $l1, $l2, $l6, $l4, $l5));
    }), $l5.isNonInteractiveSession);
  } catch ($l7) {
    if (!($l7 instanceof $m_YO)) throw $l7;
    yield { type: "model_fallback_triggered", error: $l7 };
  }
}
;
