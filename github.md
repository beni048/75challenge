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

## 4. Supabase Schema Syncing with Git

Since we are using Supabase:
- Always document new database schemas or tables in `supabase/migrations/` (or update our [start.md](file:///home/benjamin/workspace/github.com/beni048/75challenge/start.md) blueprint).
- When a schema change is committed, include the corresponding raw SQL block in the pull request description so that the team can execute it in their respective Supabase projects.

---

> [!IMPORTANT]
> Keep commit history clean by squashing feature branches if necessary before merging to `main`.
