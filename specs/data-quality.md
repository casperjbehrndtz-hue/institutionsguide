# specs/data-quality.md — Data Quality & Completeness

## Priority: #4

## Job to Be Done
Every institution page should feel complete and trustworthy. No empty sections, no "data ikke tilgængelig", no stale data.

## Requirements

### Data Completeness
- Every institution must have: name, type, address, kommune, at least one quality metric
- If data is missing for a field, show "Ikke opgjort" with explanation — never show blank
- Show data freshness: "Opdateret [dato]" on every data-driven section
- DataFreshness + DataAttribution components should be used consistently

### Quality Score
- institutionScore.ts must produce consistent, explainable scores
- Score breakdown should be visible (what contributed to the score)
- Methodology page (/metode) should explain scoring clearly

### Data Pipeline Reliability
- Scripts in scripts/ should handle API failures gracefully (retry, log, skip)
- Build should not fail if one data source is temporarily unavailable
- Data versions tracked in dataVersions.ts

### Acceptance Criteria
- [ ] Zero institution pages with completely empty quality sections
- [ ] DataFreshness component visible on all data sections
- [ ] Score breakdown available on every institution with a score
- [ ] /metode page clearly explains scoring methodology
- [ ] Build succeeds even if Supabase credentials are missing (graceful skip)
