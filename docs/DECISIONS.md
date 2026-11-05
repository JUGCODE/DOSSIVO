# Engineering Decisions

## 2026-09-18 WP1 architecture

- Use a modular monolith and D1 persistence for a coherent vertical slice.
- Use deterministic synthetic fixtures so no ordinary model API can be mistaken for unreadable-original processing.
- Persist each workflow step, agent run and disclosure record under an owner-scoped case.
- Make expert profiles fictional and visibly labelled.
- Publish privately. No W2W production system or customer data is touched.
