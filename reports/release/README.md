# Release evidence

`current.json` and `PRODUCTION_RELEASE_VERDICT.md` describe the **current handoff state**. Older release claims are preserved under `reports/archive/pre-openai-hardening/release/` for history only.

To produce final evidence, restore package-registry access, commit this source in Git, then run the repository's complete release pipeline from that single clean SHA. Do not promote historical evidence to current.
