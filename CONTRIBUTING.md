# Contributing to yaml-extend

Thanks for your interest in contributing to **yaml-extend**! We welcome bug reports, documentation improvements, tests, and code contributions. This document explains how to get started, how to report issues, and how to submit pull requests.

> Short checklist
>
> - Read this document.
> - Open an issue first for non-trivial changes.
> - Add tests for new behaviors.
> - Keep changes small and focused.

---

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). By participating in this repository you agree to abide by its terms. Please be kind and respectful.

---

## How to report bugs

When you open an issue, please include:

- A short descriptive title.
- Steps to reproduce (copy-pasteable).
- Minimal reproducible example (YAML + code snippet).
- Expected behavior and actual behavior.
- Node.js version and `yaml-extend` version (if applicable).
- Any relevant stack traces or error messages.

If you’re unsure whether a behavior is a bug or feature request, open an issue and label it `question`.

---

## How to request features

Create an issue titled `Feature: <short description>` and include:

- Motivation and concrete use case.
- Suggested API / YAML syntax if you have one.
- Backwards-compatibility considerations.

Maintain a discussion on the issue before writing large code changes.

---

## Development setup (local)

```bash
# clone the repo (replace with your fork or org repo)
git clone git@github.com:yaml-extend/yaml-extend.git
cd yaml-extend
```

If you prefer to work with a fork:

```bash
git remote add upstream git@github.com:yaml-extend/yaml-extend.git
git fetch upstream
git checkout -b feat/my-feature
```

---

## Branching & commits

- Use feature branches: `feat/<short-desc>`, `fix/<short-desc>`, `docs/<short-desc>`.

- Commit messages should be clear and meaningful. We recommend Conventional Commits:
  - feat: add X
  - fix: correct Y
  - docs: update README
  - chore: update deps

---

## Tests

- All new features and bug fixes must include tests.

- Tests live in /test. Run them with npm test.

- Aim for good coverage on parsing, import resolution, expression handling, and tag behavior.

---

## Submitting a pull request

- Fork the repository (if you don’t have push rights) and create a feature branch.
- Open a PR against main with a clear title and description.
- In the PR body:
  - Link the issue number (if applicable).
  - Describe what the change does and why.
  - List any tests added or changed.
  - Mention any breaking changes.
- Fill the PR checklist (see below).
- Wait for CI and maintainer review.

## PR checklist (expected)

- Branch from main.
- CI passes.
- Tests added/updated.
- Documentation updated (README or docs) if relevant.
- No sensitive information committed.
- CHANGELOG entry (if appropriate).

---

## Releasing

Releases are handled by maintainers. We recommend semantic versioning. If you want to help with a release, discuss it in an issue or PR.

---

## Security

If you discover a security vulnerability, do not open a public issue. Contact the maintainers privately. Add a SECURITY.md to the repo with preferred contact instructions (email or GitHub private report). After disclosure and fix, the issue will be made public.

---

# Where to get help

- Open an issue on GitHub for bugs, questions, or feature requests.
- For quick questions, a short issue with the `question` label is fine.

---

## Contributor recognition

If you make a significant contribution, you can add your name to `CONTRIBUTORS.md`

hanks for helping make yaml-extend better! 🎉
