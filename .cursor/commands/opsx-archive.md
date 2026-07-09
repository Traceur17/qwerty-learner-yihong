# OPSX: Archive

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name after `/opsx-archive` (e.g., `/opsx-archive add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskQuestion tool** to let the user select.

   Show only active changes (not already archived).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace archive is not supported in this slice and STOP.

   **If any artifacts are not `done`:** Display warning and prompt user for confirmation to continue.

3. **Check task completion status**

   Read the tasks file to check for incomplete tasks (`- [ ]` vs `- [x]`).

   **If incomplete tasks found:** Display warning and prompt user for confirmation to continue.

4. **Assess delta spec sync state**

   Use `artifactPaths.specs.existingOutputPaths` from status JSON to check for delta specs.

   **If delta specs exist:** Compare with main specs and offer sync options before archiving.

   If user chooses sync, invoke `/opsx-sync` workflow for the change.

5. **Perform the archive**

   Create an `archive` directory under `planningHome.changesDir` if it doesn't exist.

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   Move `changeRoot` to the archive directory.

6. **Display summary**

   Show archive completion summary including change name, schema, archive location, and spec sync status.

**Guardrails**

- Always prompt for change selection if not provided
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when moving to archive
- If delta specs exist, always run the sync assessment before prompting
