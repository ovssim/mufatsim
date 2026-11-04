# Mann Co. Unboxing Simulator — Playable Beta

A static TF2-inspired unboxing game for GitHub Pages. Open `index.html` in a browser, or upload all contents of this folder to a GitHub repository and enable **Settings → Pages → Deploy from branch → main / (root)**.

## Included
- **Economy** and **Sandbox** modes, switchable without losing inventory.
- Browse **all numbered Mann Co. series #1–#103**, plus four *illustrative* special-case entries.
- Crate purchasing, type-specific keys, keyless container example, refined-metal wallet, and a repeatable beta stipend.
- An original, reusable animated GIF crate reveal and layered simulated Unusual effect.
- Browser-local persistent backpack, keys, crates, stats, and reset.
- Series #1 regular drop names as a reference example. Other drop pools are **explicitly marked DEMO** and are not historically accurate.

## Data accuracy / limitations
This is a **playable systems beta**, not yet a verified full historical TF2 database. Numbered crates 1–103 are browseable, but their drop pools (except Series #1's listed regular items), prices, rare-item eligibility, and effect availability are placeholders. Some numbered series may have unique mechanics, and not every historical container is represented by a numbered series. Four special containers demonstrate different key requirements; their precise key compatibility, drop pools, and pricing must be checked before production use. The 0.66% Unusual chance is a community-style configurable simulator assumption, **not an official Valve probability**. Regular drops in this beta are selected uniformly, which is **not a claim about real TF2 probabilities**. The unusual roll in this beta is an illustrative prototype and not a faithful series-specific implementation.

No backpack.tf API integration or live prices are included yet. The API key should **never** be placed in client-side code; use a server-side job (such as GitHub Actions with a secret) to fetch and publish a curated JSON price snapshot. All metal and key prices here are arbitrary beta prices, not real market valuations. No real money, Steam items, or trading is involved.

The GIF is original placeholder artwork, not extracted game art. Replace with authorized assets for closer visual fidelity. Items use emoji placeholders.

## Suggested next work
1. Import verified per-container pools and drop metadata, including non-numbered cases.
2. Add real item images and effect assets, plus animation timing based on the chosen GIF.
3. Add a safe, rate-limited backpack.tf pricing snapshot pipeline.
4. Add appropriate rarity, grade, bonus, Strange, and Unusual eligibility logic.
