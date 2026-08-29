# 🐙 GitHub Git Rules & Best Practices

This document defines the git workflow, branch conventions, commit standards, and deployment procedures for the **75 Challenge** repository.

---

## 1. Branch Naming Convention

Always prefix branch names with the type of work being done, followed by a slash and a descriptive name in kebab-case:

| Prefix | Description | Example |
|---|---|---|
| `feature/` | New features or functional enhancements | `feature/streak-shield-engine` |
| `bugfix/` | Resolving bugs or issues | `bugfix/unfollow-toggle-state` |
| `refactor/` | Code structure improvements without functional change | `refactor/date-utils-timezone` |
| `docs/` | Updates or additions to documentation | `docs/add-git-workflow` |
| `chore/` | Maintenance tasks, library upgrades, configuration changes | `chore/update-supabase-schema` |

---

## 2. Commit Message Standards

We use the [Conventional Commits](https://www.conventionalcommits.org/) format. This ensures clean project history and allows automatic generation of changelogs.

### Format
```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation

### Examples
- `feat(auth): add persistent Supabase SSR session handling`
- `fix(streak): prevent double shield usage on 3 AM cutoff transition`
- `docs(git): add GitHub workflow guidelines`
- `chore(deps): upgrade framer-motion to v11`

---

## 3. Git Workflow

### Feature Development Loop
1. **Pull Latest Main**:
   Always make sure you start from the latest version of the code:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create Feature Branch**:
   Create a new branch locally matching our conventions:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit Incrementally**:
   Write code, verify linting and tests locally, then commit in small, logical increments.
4. **Push to Remote**:
   ```bash
   git push -u origin feature/your-feature-name
   ```
5. **Create a Pull Request (PR)**:
   Submit a PR targeting `main`. Ensure your description details:
   - What changed
   - Any database migrations needed (e.g., Supabase SQL commands)
   - How you verified the changes

### Branch Protection (For production repositories)
- Direct pushes to `main` are discouraged once initial setup is done.
- All code changes should go through PRs.
- Keep the `main` branch clean and always deployable.

---

## 3a. Dev → Production Promotion (MANDATORY)

We run two long-lived branches, each with its own Vercel deployment and domain:

| Branch | Domain | Purpose |
|---|---|---|
| `dev` | `dev.75challenge.quest` | Where new work is tested before anyone sees it in production |
| `main` | `75challenge.quest` | Production. Only what has been tested and approved on `dev` lands here |

**Rule: always land new work on `dev` first.** Never push or merge a feature straight to `main`. Promote `dev` → `main` only after the change has been tested on `dev.75challenge.quest` and explicitly approved by the user — "tested" means the pre-deployment checklist (`npm test`, `npm run build`, `npm run lint`) passed *and* the feature was clicked through on the deployed dev URL, not just passing locally.

### Day-to-day flow
```bash
# Land a feature on dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name
# ...work, commit...
git push -u origin feature/your-feature-name
# Open a PR targeting `dev`, not `main`.
```

Vercel auto-deploys every push to `dev` to `dev.75challenge.quest` (see §3b). Verify the change there.

### Promoting dev to production
Once a batch of changes on `dev` has been verified and the user has said to ship it:
```bash
git checkout main
git pull origin main
git merge dev          # fast-forward if dev was branched from main's tip
git push origin main
```
Vercel auto-deploys `main` to `75challenge.quest`. Do this only on explicit approval — never as a side effect of finishing a feature.

---

## 3b. Vercel + Namecheap Setup (one-time)

This only needs to be done once per project to wire up the two environments.

### Vercel
1. Import the GitHub repo into Vercel if not already done (Vercel dashboard → Add New → Project).
2. **Production Branch**: in Project Settings → Git, set the Production Branch to `main`. Every push to `main` deploys to the production domain; every push to any other branch (including `dev`) gets its own preview URL automatically — no extra config needed for that part.
3. **Domains**: Project Settings → Domains:
   - Add `75challenge.quest` (and `www.75challenge.quest` if desired) → assign to the `main` branch / Production environment.
   - Add `dev.75challenge.quest` → under "Git Branch", assign it specifically to the `dev` branch. This makes that subdomain always reflect the latest `dev` deployment instead of a random preview URL.
4. Vercel will show DNS records to add (typically a `CNAME` pointing the subdomain at `cname.vercel-dns.com`, and an `A`/`ALIAS` or `CNAME` for the apex domain — Vercel's UI gives the exact current values, use those over anything written here).
5. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) for both Production and Preview environments in Project Settings → Environment Variables. If dev should use a separate Supabase project, scope those values to the Preview environment (or specifically to the `dev` branch) instead of Production.

### Namecheap
1. Log into Namecheap → Domain List → `75challenge.quest` → **Manage** → **Advanced DNS**.
2. Add the records Vercel's Domains page displayed:
   - For the apex `75challenge.quest`: an `A` record (Host `@`) pointing at Vercel's IP, or an `ALIAS`/`ANAME` record if Namecheap offers one — follow whichever Vercel currently recommends for apex domains.
   - For `dev.75challenge.quest`: a `CNAME` record, Host `dev`, Value `cname.vercel-dns.com.` (note the trailing dot Namecheap expects).
3. Remove any conflicting Namecheap "Parking Page" / URL Redirect records for the same hosts — they will fight with the DNS records above.
4. DNS propagation is usually minutes but can take longer; Vercel's Domains page shows a ✅ once it verifies each domain.

Once both are set: pushing to `dev` updates `dev.75challenge.quest` automatically, and merging `dev` into `main` (per the promotion flow above) updates `75challenge.quest`. No manual deploy step is needed on either side.

---

## 4. Supabase Schema Syncing with Git

Since we are using Supabase:
- Always document new database schemas or tables in `supabase/migrations/` (or update our [start.md](file:///home/benjamin/workspace/github.com/beni048/75challenge/start.md) blueprint).
- When a schema change is committed, include the corresponding raw SQL block in the pull request description so that the team can execute it in their respective Supabase projects.

---

> [!IMPORTANT]
> Keep commit history clean by squashing feature branches if necessary before merging to `main`.
