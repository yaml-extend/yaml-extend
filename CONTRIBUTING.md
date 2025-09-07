# Contributing to yaml-extend

Thanks for your interest in contributing! This document explains how to report issues, propose features, run the project locally, and submit a PR.

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Be kind and respectful.

## How to report bugs

1. Search existing issues first.
2. When opening an issue, include:
   - A short, descriptive title.
   - Steps to reproduce (copy-pasteable).
   - Minimal reproducible example (YAML + code).
   - Expected behavior vs actual behavior.
   - Node.js version and `yaml-extend` version.

## How to request features

Create an issue titled `Feature: <short description>` and describe:

- Motivation / concrete use case.
- Suggested API or YAML syntax.
- Backwards-compatibility considerations.

## Development setup (local)

```bash
# clone
git clone git@github.com:<org>/yaml-extend.git
cd yaml-extend

# install
npm install

# run tests
npm test

# build (if applicable)
npm run build
```
