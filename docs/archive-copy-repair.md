# Archive copy identity repair — 22 October 2026

Migration `20261022_archive_copy_identity.sql` replaces name-only archive matching with a fingerprint of development type, JSON configuration and raw XML. This preserves same-label objects across ServiceNow tables, sys_ids, languages and payload versions. Manual developments retain normalized title matching; client/story matching remains name- and parent-scoped. Destination archive fingerprints are computed once per plan.

The normal copy API repairs previous copies additively: it ignores stale many-to-one source links for identity matching and remaps each link to its actual matching target. Existing content and attachments are never overwritten or deleted. Repeating a copy reuses identical payloads. Permission validation, parent inclusion, advisory locking and staged attachment handling remain in the existing API.

Validated with local PGlite integration tests: distinct tables, sys_ids and payload versions sharing a label; an old collapsed copy with stale links; additive repair; repeat/no-op; preservation of target content; existing cross-user/manual matching and permission tests.

Applied on Supabase tqsklgcymeobrkwpdatt. Repaired personal story 872b3bef-b4f8-4aa5-9df7-1fc980b4e408 into existing Iteo story c6382400-d6d7-4c9c-b839-5e96fc9782e0 using the app copy workflow: 276 developments added, 434 reused, zero clients/stories/files created. Source and destination now both show 710 developments, 15 and 35 decision rules, and 172 mobile components. Both decision tables have their input/output columns and result values restored.
