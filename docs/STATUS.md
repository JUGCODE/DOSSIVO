# Status

Updated 2026-10-26.

## PACI alignment implementation, 2026-10-26

- Added an authenticated, tenant-scoped D1 preparation API and a Chinese/English/Italian panel below the existing outcome workspace.
- Saves immutable application-level dossier snapshots bound to a specific case version. A batch persists each snapshot and its pending request together; stale-version and concurrent-history changes are rejected.
- Added stable-key retry handling, payload conflict detection, private draft export with a digest check, and append-only local challenge/reply/withdrawal history.
- Every request remains `PENDING`, connection is `NOT_CONNECTED`, and exports explicitly contain `proof_package: null`. PACI core 0.1 is reviewed but is not embedded in the production Worker. There is no dispatcher, connected PACI service or PACI receipt yet.
- A business reply is not adjudication. No external reviewer has been configured and no decision UI is offered. Current tenant scope is a single signed-in account, not full organisational roles.
- Fixed Link 1 fallback to mutable current content: links require frozen card and scope snapshots. Consumption rechecks expiry/revocation atomically; unidentified visitors are labelled honestly. Token changes cancel stale viewer requests.
- Added 17 bridge persistence/permission/version tests and 10 proof-link behaviour checks, alongside the 27 existing checks. Full TypeScript check and Worker build pass.
- Browser QA remains incomplete: the managed preview starts, but local D1 migration cannot bind its required loopback listener (`EPERM`). The database-backed page could not be exercised in that preview. SQL behaviour was tested with SQLite, including the real Drizzle route predicates; hosted migration/deployment is verified separately by Sites.

Architecture decisions and upstream acceptance conditions: [PACI alignment](PACI_ALIGNMENT_2026-10-26.md). Core review and reproducible probes: [paci-core 0.1 review](PACI_CORE_0_1_REVIEW.md).

## Implemented and tested

- Persistent tenant-scoped outcome case and generated database migration.
- Eight-stage buyer evidence flow and A01-A06 execution status.
- Adaptive questions, deterministic risk, traceable synthetic facts, gaps and remediation tasks.
- Enterprise confirmation gate and three-language card preview.
- Named-recipient Link 1 with expiry, card version and atomic view decrement.
- Explicitly fictional expert candidates and suitability reasons.
- Responsive working surface, labelled controls and receiving view.
- Hero-first home experience with four task-oriented entry points.
- Complete Chinese/Italian interface switching across the workbench and evidence-card view.
- Collapsible desktop sidebar with expanded and compact navigation states.
- Supplier-owned positioning, two-CTA home page, no-registration quick check and Brussels-time readiness countdown.
- Evidence continuity model with immutable validity periods, historical time-point lookup, gap highlighting and 30/7-day reminders.
- Proof-link snapshots, atomic view consumption, revocation and access logs.
- Complete Chinese, English and Italian product and evidence-link interfaces.
- Single-control flag language menu, site search, FAQ shortcut and visible sign-up/sign-in entry points.
- Revised labour-evidence hero, prominent readiness countdown and formal scope terminology in all three languages.
- Expanded the core self-check to a 17-question regulatory and evidence readiness assessment covering OECD six-step due diligence, worker-risk indicators, evidence continuity and inquiry response; added company governance to the 30-second check.
- Clarified the inventory-cycle selector and the limited meaning of the end-user withdrawal boundary in Chinese, English and Italian.
- Moved the full pricing section directly below the readiness countdown so visitors can assess urgency and cost in one continuous decision flow.
- EU-27 multi-country selection with a highlighted Italy option and multi-select support.
- Upstream evidence-chain self-check question with deterministic scoring and remediation finding.
- Monthly/annual price display, Chinese reference explainer and regional hosting plan disclosure.
- Interactive monthly/annual pricing, clickable plan comparison and initial Free/Starter/Business service bundles.
- Legally corrected readiness and scope copy distinguishing suspicion, investigation and confirmed prohibition decisions.
- Functional return control on the Chinese reference page, with safe in-site fallback.
- Finalised the trilingual hero around progressive file building and on-demand delivery of reviewable evidence.
- Refined the fourth quick-check question and urgent CTA in Chinese, English and Italian to identify buyer questionnaires and competent-authority inquiries precisely.
- Replaced platform-dependent flag emoji with packaged China, UK and Italy flag artwork across the header, market selector and evidence-card language controls.
- Clarified supplier follow-up messages as company-reviewed drafts, added Italian generation, and aligned Starter/Business wording with the implemented language set.
- Made the 30-second hero check collapsible, preserving its current-session result and remembering the compact preference for later visits.
- Added a multilingual, reduced-motion-aware floating return-to-top control that appears once the hero leaves view.
- Added an honest trilingual intelligent-workflow prototype entry in the hero, with Chinese rendered as “原生智能” rather than the English product term.
- Added a natural-language task launcher and three quick tasks that deterministically route Chinese, English and Italian intent into the existing self-check or urgent-response path; the interface makes company approval mandatory before execution or disclosure.
- Added a dedicated Chinese/English/Italian enterprise-action briefing centre, a homepage teaser and a working sidebar route, while preserving the countdown-to-pricing order.
- Added a clearly labelled founding preview with enterprise action cards, evidence-to-retain guidance, official sources and a scenario example that is explicitly not a real customer case.
- Added D1 schemas and authenticated APIs for issue archives, translated issue versions, explicit newsletter preferences and future delivery records. Registration does not create a subscription; users choose a preferred briefing language and can withdraw the preference.
- Kept email delivery visibly disabled until a provider, confirmation and one-click unsubscribe workflow are verified; no open or click tracking is implemented.
- Removed the remaining Chinese “AI 原生” product-positioning phrase in favour of “原生智能”.

## Synthetic demonstration only

Source files, extraction, translations, rule set and professional profiles. Agent cost is zero because no external model is invoked.

## Not production-ready

Real originals, customer-held keys, confidential execution, Link 2, deletion, full ABAC, real credentials, conflicts, language evaluation, security assessment, recovery and SLA evidence. Product decisions and placeholders are centralized in PENDING_DECISIONS.md.

Do not accept real originals or sell this package as production compliance software.

## 2026-10-23 update

- Added a trilingual compliance scope selector with clear available/planning boundaries.
- Added page-local evidence scope planning and text export; no persistence or real file ingestion.
- Added official regulation, portal, implementation guidelines and scope/process links.
- Retained existing labour workflow; CBAM, EUDR and battery/DPP are planning-only.

## Fixed snapshot review, 2026-10-26 (continuation)

- Added authenticated, tenant-scoped fixed snapshot content review and comparison endpoints without changing the database schema.
- Each requested snapshot is checked against its stored local digest before projecting its saved scope, facts, company confirmations and gaps. Current case content is never substituted.
- Added trilingual baseline selection, additions/removals/field-change tables and fixed-content inspection. Selection changes and refreshes abort obsolete reads and hide stale projections.
- Comparisons match stable local references; duplicate references fail closed. A reordered list is not a content change. Company confirmation changes remain separate from external verification.
- PACI service remains NOT_CONNECTED. Local digest matching is not a PACI receipt, independent verification, trusted timestamp or legal conclusion. This remains a synthetic-data prototype.

## Registration-only HTTP adapter, 2026-10-27

- Added a disabled-by-default, server-owned synthetic registration pilot with tenant-specific credentials, durable input envelopes and stable operation keys.
- Added query-before-post recovery, protocol/digest/content/version receipt validation, atomic receipt-to-request mapping and explicit unconfirmed failures.
- Added a trilingual registration status panel; without configured service credentials it shows that drafts remain local. No external service is contacted in the deployed default configuration.
- Added `PARTIALLY_SUPPORTED` to the proposed vocabulary; automatic assessments, independent verification and challenge dispatch remain disabled.
- Compatibility exercised with real core 0.3 engine outputs in process, not a live HTTP deployment. See PACI_HTTP_ADAPTER_0_3.md for configuration and upstream acceptance items.

## Current continuation (2026-11-05)

Current per-capability evidence supersedes historical status counts: see DOSSIVO_STATUS.md, PACI_COMPATIBILITY.md, ACCEPTANCE_REPORT.md and HANDOFF_DOSSIVO.md. The current application adds private versioned synthetic tasks and locally tested real HTTP registration; it does not claim a deployed on-chain Protocol.
