# Open Conductor

A **deterministic, spec-driven development orchestrator** implemented as an **MCP server**.

Conductor MCP turns “work plans” into a strict, auditable workflow:
- tracks + plans stored in markdown
- tasks executed **sequentially**
- every completed task links to a **git commit SHA**
- phase checkpoints require **explicit user confirmation**
- reverts are **pure git reverts** (no magical state repairs)

Works with:
- **Claude Code** (local MCP server via stdio)  
- **OpenAI Codex** (MCP stdio) *(verify your Codex build’s exact config keys)*  
- **Gemini CLI** via **remote MCP** or a thin adapter (depending on your Gemini setup)  

> This project is a “plumbing layer”: the MCP server enforces state + git invariants; the LLM writes the spec/plan/code.

---

## Why this exists

The original “Conductor” concept is a **protocol encoded in prompts** (not a runtime).
Conductor MCP keeps the protocol, but moves the mechanical parts into a deterministic server:
- parsing and validating state files
- enforcing ordering rules
- updating plan/tracks state
- creating mechanical commits (plan updates + phase checkpoints)
- reverting work via git

This makes the workflow:
- deterministic
- debuggable
- safer for agents
- portable across MCP clients

---

## Features

- ✅ MCP Tools: setup, new track, implement, task start/complete, phase checkpoint, status, revert
- ✅ Strict invariants (no multi-tasking, in-order completion, SHA linkage)
- ✅ Canonical status: `conductor/tracks.md`
- ✅ Canonical task indexing: **global taskIndex**
- ✅ Server commits only when mechanical:
  - `conductor(plan): ...` on task complete
  - `conductor(checkpoint): ...` on phase complete
- ✅ Revert = pure `git revert` of both implementation and server commits

---

## State layout

```text
conductor/
├── setup_state.json
├── product.md
├── product-guidelines.md
├── tech-stack.md
├── workflow.md
├── code_styleguides/
│   └── *.md
├── tracks.md
└── tracks/
    └── <track_id>/
        ├── metadata.json
        ├── spec.md
        └── plan.md
