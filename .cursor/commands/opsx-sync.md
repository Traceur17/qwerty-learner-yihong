# OPSX: Sync

Sync delta specs from a change to main specs.

This is an **agent-driven** operation - you will read delta specs and directly edit main specs to apply the changes.

**Input**: Optionally specify a change name after `/opsx-sync` (e.g., `/opsx-sync add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskQuestion tool** to let the user select.

   Show changes that have delta specs (under `specs/` directory).

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Resolve change context**

   Run:

   ```bash
   openspec status --change "<name>" --json
   ```

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace spec sync is not supported in this slice and STOP.

3. **Find delta specs**

   Use `artifactPaths.specs.existingOutputPaths` from the status JSON as the list of delta spec files.

   If no delta specs found, inform user and stop.

4. **For each delta spec, apply changes to main specs**

   For each repo-local capability delta spec path returned by the CLI:

   a. **Read the delta spec** to understand the intended changes
   b. **Read the main spec** at `openspec/specs/<capability>/spec.md` (may not exist yet)
   c. **Apply changes intelligently** (ADDED / MODIFIED / REMOVED / RENAMED requirements)
   d. **Create new main spec** if capability doesn't exist yet

5. **Show summary**

   After applying all changes, summarize which capabilities were updated and what changes were made.

**Guardrails**

- Read both delta and main specs before making changes
- Preserve existing content not mentioned in delta
- If something is unclear, ask for clarification
- Show what you're changing as you go
