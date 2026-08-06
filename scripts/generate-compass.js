/**
 * generate-compass.js
 * ----------------------------------------------------
 * Fetches live contribution stats (commits, PRs, issues, reviews)
 * from GitHub's GraphQL API and renders them as an anime-neon
 * "compass" SVG, matching the four-axis chart style:
 *
 *        Code Review
 *             |
 * Commits --- o --- Issues
 *             |
 *      Pull Requests
 *
 * Run by .github/workflows/compass.yml on a schedule so the SVG
 * (assets/compass.svg) always reflects current activity, the same
 * way the contribution snake stays live.
 *
 * Requires env vars:
 *   GH_LOGIN          - your GitHub username
 *   GH_TOKEN          - a token with `read:user` scope (see workflow)
 */

const fs = require("fs");
const path = require("path");

const GH_LOGIN = process.env.GH_LOGIN;
const GH_TOKEN = process.env.GH_TOKEN;

if (!GH_LOGIN || !GH_TOKEN) {
  console.error("Missing GH_LOGIN or GH_TOKEN environment variables.");
  process.exit(1);
}

const QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
      }
    }
  }
`;

async function fetchStats() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: GH_LOGIN } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const c = json.data.user.contributionsCollection;
  return {
    commits: c.totalCommitContributions,
    prs: c.totalPullRequestContributions,
    issues: c.totalIssueContributions,
    reviews: c.totalPullRequestReviewContributions,
  };
}

function toPercentages(stats) {
  const total = stats.commits + stats.prs + stats.issues + stats.reviews || 1;
  return {
    commits: (stats.commits / total) * 100,
    issues: (stats.issues / total) * 100,
    prs: (stats.prs / total) * 100,
    reviews: (stats.reviews / total) * 100,
  };
}

// Scale a percentage to a line length so small values (e.g. 1%) stay visible
function armLength(pct, maxLen = 150, minLen = 30) {
  return minLen + (Math.sqrt(pct) / 10) * (maxLen - minLen);
}

function renderSVG(pct) {
  const cx = 250;
  const cy = 200;

  const top = armLength(pct.reviews);
  const bottom = armLength(pct.prs);
  const left = armLength(pct.commits);
  const right = armLength(pct.issues);

  const fmt = (n) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1));

  return `<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" font-family="'Segoe UI', 'Fira Code', monospace">
  <defs>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#845EC2"/>
      <stop offset="100%" stop-color="#FF6F91"/>
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#181524"/>
      <stop offset="100%" stop-color="#0d0b14"/>
    </radialGradient>
    <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="1" y="1" width="498" height="398" rx="18" fill="url(#bg)" stroke="#845EC2" stroke-width="1.5" opacity="0.9"/>

  <text x="250" y="34" text-anchor="middle" fill="#FF6F91" font-size="15" font-weight="700" letter-spacing="2">✦ CONTRIBUTION COMPASS ✦</text>

  <!-- axes -->
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - top}" stroke="url(#glow)" stroke-width="2.5" filter="url(#softGlow)"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + bottom}" stroke="url(#glow)" stroke-width="2.5" filter="url(#softGlow)"/>
  <line x1="${cx}" y1="${cy}" x2="${cx - left}" y2="${cy}" stroke="url(#glow)" stroke-width="2.5" filter="url(#softGlow)"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + right}" y2="${cy}" stroke="url(#glow)" stroke-width="2.5" filter="url(#softGlow)"/>

  <!-- endpoint nodes -->
  <circle cx="${cx}" cy="${cy - top}" r="5" fill="#FF6F91" filter="url(#softGlow)"/>
  <circle cx="${cx}" cy="${cy + bottom}" r="5" fill="#FF6F91" filter="url(#softGlow)"/>
  <circle cx="${cx - left}" cy="${cy}" r="5" fill="#FF6F91" filter="url(#softGlow)"/>
  <circle cx="${cx + right}" cy="${cy}" r="5" fill="#FF6F91" filter="url(#softGlow)"/>
  <circle cx="${cx}" cy="${cy}" r="7" fill="#845EC2" filter="url(#softGlow)"/>

  <!-- labels -->
  <text x="${cx}" y="${cy - top - 30}" text-anchor="middle" fill="#FFD6E8" font-size="14" font-weight="700">${fmt(pct.reviews)}%</text>
  <text x="${cx}" y="${cy - top - 12}" text-anchor="middle" fill="#c9c3e0" font-size="12">Code Review</text>

  <text x="${cx}" y="${cy + bottom + 26}" text-anchor="middle" fill="#FFD6E8" font-size="14" font-weight="700">${fmt(pct.prs)}%</text>
  <text x="${cx}" y="${cy + bottom + 44}" text-anchor="middle" fill="#c9c3e0" font-size="12">Pull Requests</text>

  <text x="${cx - left - 55}" y="${cy - 6}" text-anchor="middle" fill="#FFD6E8" font-size="14" font-weight="700">${fmt(pct.commits)}%</text>
  <text x="${cx - left - 55}" y="${cy + 12}" text-anchor="middle" fill="#c9c3e0" font-size="12">Commits</text>

  <text x="${cx + right + 55}" y="${cy - 6}" text-anchor="middle" fill="#FFD6E8" font-size="14" font-weight="700">${fmt(pct.issues)}%</text>
  <text x="${cx + right + 55}" y="${cy + 12}" text-anchor="middle" fill="#c9c3e0" font-size="12">Issues</text>

  <text x="250" y="380" text-anchor="middle" fill="#5f5a78" font-size="10">updated ${new Date().toISOString().slice(0, 10)} · last 365 days</text>
</svg>`;
}

async function main() {
  const stats = await fetchStats();
  const pct = toPercentages(stats);
  const svg = renderSVG(pct);

  const outDir = path.join(__dirname, "..", "assets");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "compass.svg"), svg, "utf8");

  console.log("Compass SVG generated:", stats, pct);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
