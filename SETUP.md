# Setup guide

## What auto-updates, and how

| Widget | Refreshes when | Mechanism |
|---|---|---|
| Contribution compass | every 6h + on push | `.github/workflows/compass.yml` runs `scripts/generate-compass.js`, which queries GitHub's GraphQL API and commits `assets/compass.svg` to `main` |
| Wanted poster | daily + on demand | `.github/workflows/wanted.yml` runs `scripts/generate_wanted.py`, which pulls your live avatar from `github.com/<user>.png`, composites it onto `assets/wanted-template.jpg`, and commits `assets/wanted-poster.png` |
| Stats/streak/trophy cards | on every profile view | hosted third-party SVG endpoints (anuraghazra, streak-stats, trophy) — no setup needed, already live |

## One-time setup (5 minutes)

1. **Copy this structure into `loveyadav1015/loveyadav1015`** (README.md, `.github/`, `scripts/`, `assets/` — same repo you already have).

2. **Allow Actions to push commits:**
   Repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** → Save.

3. **Create a Personal Access Token for the compass workflow** (the default `GITHUB_TOKEN` can't read your contribution graph — that needs `read:user` scope):
   - GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens (or classic, scope `read:user`)
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `PROFILE_TOKEN`, value: the token

4. **Replace placeholders** in `README.md`: `YOUR_EMAIL`, `YOUR_LEETCODE_OR_CODEFORCES`.

5. **Trigger both workflows once manually** (Actions tab → select workflow → Run workflow) so `assets/compass.svg` and `assets/wanted-poster.png` exist before anyone visits your profile.
   - For the wanted poster you can optionally fill in the `name` and `bounty` inputs when running it manually (e.g. bounty `864,000,000-`); left blank it defaults to "Love Yadav" with no bounty line.

That's it — from then on both widgets update themselves on schedule with zero manual commits.

---

## Prompt for a coding agent (Claude Code, Cursor, etc.)

If you'd rather have an agent do steps above for you against your actual GitHub repo, give it this:

```
You have access to my GitHub repo loveyadav1015/loveyadav1015 (a profile README repo).
I've prepared a local folder with the target files: README.md, .github/workflows/compass.yml,
.github/workflows/wanted.yml, scripts/generate-compass.js, scripts/generate_wanted.py,
assets/wanted-template.jpg.

Please:
1. Clone loveyadav1015/loveyadav1015 locally.
2. Copy in the prepared README.md, .github/workflows/*, scripts/*, assets/wanted-template.jpg
   from this working directory, overwriting existing files.
3. Commit and push all changes to `main` with message "feat: anime theme + live compass + wanted poster automation".
4. Print the two GitHub Settings steps I still need to do manually (repo Action write
   permissions, and creating a PROFILE_TOKEN secret with read:user scope) since you
   can't do those through git.
5. Trigger both workflows via `gh workflow run compass.yml` and `gh workflow run wanted.yml`
   if the gh CLI is authenticated, otherwise tell me to run them manually from the Actions tab.
```

Point it at this folder as the source of the prepared files.
