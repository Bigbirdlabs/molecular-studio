# Gauntlet Loop — method reference (source: https://somethingbig.ai/gauntlet-loop, Matt Shumer)

Tagline: "Give the agent a bar it can't talk its way around, let it split the work, and never let the builder grade itself."

Roles: Lead agent (owns goal, chooses decomposition, spawns subagents, maintains progress page) · Builder (makes a piece, fixes gaps) · Critic (fresh, independent agent, judges REAL output against the bar) · Smoothing agent (optional, harmonizes whole artifact after each wave; does not redesign).

1. Give the goal, not the implementation. Do not prescribe architecture, workstreams or steps. Destination, not route.
2. Give a real bar. Concrete and inspectable (reference screenshots, top real sites, test suite, latency target, reference implementation). "Make it amazing" / "production-ready" / "keep improving" are NOT bars. A hard bar need not be reachable. If no bar is known, finding one is part of the task.
3. Let the agent split the work into the smallest pieces that can be improved and judged separately. Do not predefine the pieces.
4. Never let the builder grade itself. Critic sees: goal, bar, relevant rules, actual artifact. Critic does NOT see builder history or explanations, never a builder-written summary. Blind A/B: critic sees ours + reference unnamed, picks the better one; if ours loses it names the LARGEST meaningful gap; builder fixes; re-enter gauntlet.
5. Let it keep going. No arbitrary round count. Stop when: user likes it, gains negligible, or compute budget spent.
6. Watch without interrupting: live HTML progress page or workbench.md.

Anti-patterns: plain chat instead of agent harness; prescribing architecture; vague bars; letting the agent define "good"; units of work too large; self-grading; critics grading summaries; fixed round limits; interrupting long runs.
