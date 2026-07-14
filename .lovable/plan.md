# Conflict banner: per-field merge

The banner already has two one-click actions:

- **Keep this tab's version** → `keepMine` (overwrites the stored draft with the current form)
- **Use other tab's version** → `useTheirs` (loads the incoming draft into the form)

This plan adds a third path: per-section merge, so the user can pick side-by-side which fields to take from each draft and apply the result in one click. The two existing actions stay unchanged as the top-level shortcuts.

## Behaviour

Each row in the diff table gets a two-button pill selector: **Mine** / **Theirs**. Default selection is Mine (matches the current form). A running counter above the action buttons reads e.g. `4 mine · 2 theirs`.

A new **Apply merge** button appears next to Keep/Use, enabled only when at least one row is set to Theirs (otherwise the merge equals Mine and Keep mine is the correct action). Clicking it:

1. Builds a merged snapshot: for each differing field, take the selected side; for all other fields, keep the current form value.
2. Applies the snapshot to the form (same `applySnapshot` path `useTheirs` uses).
3. Calls `overwriteDraft` with the current tabId + a bumped version to persist the merge and clear the conflict.
4. Reports the save via `setSaveStatus` / `setDraftSavedAt`, same as the other two actions.

Selections reset when a new conflict arrives (banner remounts on `conflict` change) or when the user clicks Keep/Use (banner closes).

## Fields covered

Same set the diff already computes:

- `goalkeeper`, `coach`, `team`, `opponent`, `matchDate`
- Each pillar score (`PILLAR_IDS`)
- `comments` (whole field, not line-level)
- `selectedMedia` (whole list, not per-item)

Merging a row applies the whole field value from that side. No sub-field text merge — comments and media attachments are taken atomically.

## UI

```text
Draft conflict detected · 3 fields changed          [Apply merge] [Use other tab] [Keep this tab]

Field           This tab              Other tab              Take
Goalkeeper      Sam Byram             Sam Byram              [Mine|Theirs]
Comments        Strong first half…    Composed under press…  [Mine|Theirs]
Media           2 attached            3 attached             [Mine|Theirs]
                                                             2 mine · 1 theirs
```

The Take column is a compact segmented toggle. Rows highlight amber only on the selected side to reinforce what the merged result will contain.

## Technical details

Files changed:

- `src/components/workflows.tsx` — the banner IIFE. Lift `rows` computation into `useMemo` keyed on `[conflict, mineSnap]` (already effectively derived). Add:
  - `selections` state: `Record<string, "mine" | "theirs">` keyed by row `key`, reset via `useEffect` on `conflict` identity change.
  - `mergedSnapshot` memo: starts from `currentSnapshot()`, then for every row where `selections[key] === "theirs"` overwrites the corresponding field from `conflict` (switch on `row.key`: `goalkeeper|coach|team|opponent|matchDate|comments|selectedMedia` map directly; `score.<pid>` writes into `scores[pid]`).
  - `applyMerge` handler: `applySnapshot(mergedSnapshot)`, then `overwriteDraft(user.id, tabIdRef.current, mergedSnapshot)`, then clear `conflict`, update `localVersionRef`, `draftSavedAt`, `saveStatus`.
- No changes to `src/lib/match-reports/draft-store.ts` — `overwriteDraft` already handles the version bump.

Type-safety: the row `key` union is narrow, so the merge switch is exhaustive without a cast.

## Out of scope

- Line-level or word-level comment merging.
- Per-media-item picking inside `selectedMedia`.
- Persisting merge selections across banner re-mounts.
