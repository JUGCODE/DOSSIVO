# Material lineage — synthetic preparation only

`import_text` optionally accepts `source_material_id`, `source_relation` (`translation`, `summary`, `copy`) and `source_reason`. The source must be readable within the same task and have exactly matching facility and month. Copies require identical saved text. Missing/invalid relationships fail before task persistence. Client-provided root IDs are ignored.

Without an explicit relationship, exact text and matching scope within the task conservatively share the first matching material root. This is duplicate grouping, not an assertion of provenance or independence. Distinct source groups are not automatically independent sources. Existing historical snapshots and cards remain unchanged.

`material.lineage` records the relationship and basis, while field `root_id` inherits the material's root. New assessments include `source_lineage` counts with independent_source_count null. Ambiguous confirmed fields remain inconclusive. Basic buyer projections do not disclose parent IDs, group IDs or relationship notes. No real-data intake, OCR, model call, cross-task reference or upstream PACI modification is enabled by this feature.
