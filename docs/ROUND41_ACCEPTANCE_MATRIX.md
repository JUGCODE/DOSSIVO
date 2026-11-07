# Round 41 attachment acceptance matrix

Status distinguishes code/backend checks from unperformed browser acceptance. This is not a claim of complete commercial readiness.

| Item | Implementation and evidence | Remaining acceptance |
|---|---|---|
| U1 | Real private task, bounded auto-title, durable messages; unit + D1 verified | Browser flow |
| U2 | Rename persists with user source; unit verified | Double-click/refresh browser flow |
| U3 | Rule-based result card and auto-open wired | Live AI absent; browser flow |
| U4 | Closing only changes UI; result immutable and persistent | Reopen browser flow |
| U5 | Up to 8 result tabs wired | Browser switching |
| U6 | New generations append versions; old bytes retained; SQL triggers verified | Manual document editing not implemented; version selector browser flow |
| U7 | Share denied server-side when entitlement unavailable; pricing message | Browser flow |
| U8 | Not implemented: starter 3-buyer entitlement and organization verification unavailable | Implement against verified billing/organization authority; all sharing currently denied |
| U9 | No new workspace external link issued | Connect existing revocation service when eligible sharing is enabled |
| U10 | Private results owner-only; no new external response; cross-owner denial verified | External disclosure projection once enabled |
| U11 | Restricted option disabled; all share creation denied server-side | Connect separate approved restricted disclosure workflow |
| U12 | 1024px overlay and center minimum coded | Browser viewport QA blocked |
| U13 | Mobile bottom sheet, swipe/fullscreen control coded | Touch browser QA blocked |
| U14 | Hide task, preserve evidence; unit verified | Browser flow |
| U15 | Version/time/snapshot/scope at top of print document; fixed JSON/DOCX | Browser PDF print layout not verified; not a native PDF generation service |

Other gaps: external expiry choices, QR sharing, organization switching and actual paid plan state require their authoritative backend integrations. Access-record menu currently explains there is no external grant; task action auditing exists in the database but this is not a new external viewer audit UI. Copy is plain text, not a separate Markdown mode. Uploaded documents and confidential instructions were not copied into the source repository. Source is synchronized only to Sites for publication, not the public GitHub repository.

Next: verify authenticated desktop/tablet/mobile workspace interaction in a working preview; then integrate eligibility-gated sharing with the existing authorization service and real verified organization/billing sources. Do not loosen the existing server-side gate merely to demonstrate sharing.

## Round 42 delta

The access-record placeholder is now an owner-only workspace action/read/export-preparation log with server authorization and pagination. This does not replace external buyer access logs. Plain-text and Markdown copy are both available. U15 export now rechecks authorization and fixes the exported version server-side; browser PDF layout still awaits verification. U8–U10 external sharing integration and U12–U13 browser validation remain open.

## Round 43 delta

U6 now supports explicit human note revisions, immutable parent lineage, conflict detection and exact-version export. Old versions remain untouched. Evidence facts, calculated coverage and rule-based narrative cannot be edited through this operation. Backend/unit/runtime checks pass; browser interaction remains unverified. Other previously open sharing and mobile acceptance items remain open.

## Round 44 delta

Result source chips now open the authenticated historical material from the exact evidence snapshot. The separate file staging service is not falsely presented as a cited-file preview. Result panels warn about newer loaded task versions and allow explicit regeneration; no historical snapshot is overwritten. Source accesses enter the owner audit. Browser acceptance and eligible external-sharing integration remain open.

## Round 45 delta

Workspace checklist actions now support synthetic text intake and explicit missing-material records through existing private-task commands. Saving refreshes current task state; the original result remains fixed until explicit regeneration creates a new version. File staging is still separate. Browser acceptance and verified-billing/buyer sharing remain outstanding.
