# Contributing to PadiPay Stellar Relayer API

Thank you for your interest in contributing to the **PadiPay Stellar Relayer API**.

The relayer is responsible for bridging Web2 applications with the PadiPay Soroban smart contracts by constructing, sponsoring, and submitting blockchain transactions on behalf of users.

Whether you're fixing bugs, improving documentation, implementing features, or strengthening the developer experience, your contributions help move the project closer to production readiness.



# Before You Start

Please familiarize yourself with the project before opening a pull request.

We recommend reading the following documents:

* `README.md` — Project overview and local development
* `ARCHITECTURE.md` — System architecture and request lifecycle
* `ROADMAP.md` — Current milestone and future direction
* Open GitHub Issues — Current work available for contributors

Understanding the architecture first will make implementation significantly easier.



# Development Philosophy

The relayer follows a few guiding principles.

* Build incrementally.
* Keep pull requests small and focused.
* Keep the service modular.
* Separate routing from business logic.
* Use Functional Composition (No ES6 Classes).
* Use Dependency Injection (export services as factory functions).
* Write tests alongside implementation.
* Keep documentation in sync with code.
* Prioritize maintainability over clever implementations.

The current repository is focused on delivering a stable **v0.1.0 MVP** before introducing production-oriented infrastructure.



# Contribution Workflow

All work should begin from a GitHub Issue.

The expected workflow is:

```text
Choose an Open Issue
        │
        ▼
    Comment(wait for assignment) 
        │
        ▼
Fork the Repository
        │
        ▼
Create a Feature Branch
        │
        ▼
Implement the Issue
        │
        ▼
Run Tests & Linting
        │
        ▼
Open a Pull Request
        │
        ▼
    Code Review
        │
        ▼
      Merge
```

## One Issue = One Pull Request

Each pull request should resolve a single GitHub Issue.

Avoid combining unrelated work into one PR.

Small, focused pull requests are easier to review and maintain.



# Finding Something to Work On

Browse the repository's GitHub Issues.

If you're new to the project, consider issues labeled:

* `good first issue`
* `help wanted`
* `mvp`

Areas contributors can work on include:

* API routes
* Request validation
* Stellar SDK integration
* Transaction building
* Fee bump logic
* Error handling
* Testing
* Documentation
* Developer tooling

If you plan to work on an issue, leave a comment so maintainers know it is in progress.



# Branch Naming

Use descriptive branch names.

Examples:

```text
feat/transaction-builder
feat/fee-bump-service
fix/request-validation
refactor/service-layer
test/transaction-status
docs/readme-refresh
ci/github-actions
```



# Commit Message Convention

Use clear, conventional commit messages.

Examples:

```text
feat: implement fee bump transaction service

fix: validate escrow request payload

refactor: extract stellar client helpers

test: add transaction submission tests

docs: improve architecture guide

ci: add GitHub Actions workflow
```



# Node.js Coding Standards

## Keep Routes Thin

Express routes should only:

* Receive requests.
* Validate input.
* Delegate work to services.
* Return responses.

Avoid implementing business logic inside route handlers.

---

## Keep Services Focused

Each service should have a single responsibility.

Current services include:

* Escrow Service
* Stellar Service
* Horizon/RPC Service

Avoid mixing responsibilities across services.

---

## Prefer Reusable Modules

Extract shared functionality whenever appropriate.

Examples include:

* Validation
* Error handling
* Configuration
* Stellar helpers
* Response formatting

---

## Validate Every External Input

All incoming requests should be strictly validated before reaching the service layer or interacting with the Stellar SDK.

* We use **Zod** as the single source of truth for input validation.
* Never assume client input is valid.

---

## Never Expose Secrets

The relayer manages sensitive credentials.

Never:

* Log private keys.
* Commit secrets.
* Return sensitive information in API responses.

Always load secrets from environment variables.

---

## Error Handling

Return consistent, descriptive API responses.

* Throw standardized domain errors from `src/errors/` (e.g. `AppError`, `StellarError`, `ValidationError`).
* Avoid exposing raw Stellar SDK or Soroban RPC implementation details.
* Never expose stack traces to clients.



# Security Guidelines

Security is the highest priority for the relayer.

Contributors should:

* Validate request payloads.
* Protect sensitive credentials.
* Keep signing logic isolated.
* Follow least-privilege principles.
* Avoid introducing unnecessary attack surfaces.

Security improvements are always welcome.



# Testing Requirements

Every contribution that changes application behavior should include tests.

We use **Jest** as our primary testing framework and **Supertest** for lightweight HTTP integration tests.

Our testing philosophy requires that tests are:
* Isolated and deterministic.
* Free from network access.
* Free from live Stellar infrastructure dependency.

Therefore, you must mock external dependencies such as the Stellar SDK and Soroban RPC server.

At a minimum, test:

* Successful requests.
* Validation failures.
* Error handling.
* Service behavior.

Run the complete test suite before opening a pull request.

```bash
npm test
```

---

# Formatting & Linting

Before submitting a contribution, ensure the project passes formatting and linting.

```bash
npm run lint

npm test
```

Formatting tools are configured, run them before opening a pull request.



# Working with TODOs

The repository intentionally contains `TODO:` comments describing planned implementations.

When resolving a TODO:

* Implement the requested functionality.
* Remove the completed TODO.
* Update related tests.
* Keep documentation synchronized.

Avoid leaving partially completed TODOs.



# Documentation

Documentation is considered part of the project.

If your contribution changes:

* architecture
* request flow
* API behavior
* contributor workflow
* project structure

please update the appropriate documentation.

This may include:

* `README.md`
* `ARCHITECTURE.md`
* `ROADMAP.md`
* `CONTRIBUTING.md`



# Pull Request Checklist

Before opening a pull request, verify the following:

* [ ] The change resolves a single GitHub Issue.
* [ ] Code follows the existing project structure.
* [ ] Tests pass successfully.
* [ ] Linting passes.
* [ ] Documentation updated where necessary.
* [ ] No unrelated changes have been included.
* [ ] GitHub Actions CI (if running) reports success.



# Code Review Expectations

Maintainers may request revisions before merging.

Common review feedback includes:

* Improving readability.
* Increasing test coverage.
* Reducing duplication.
* Simplifying logic.
* Improving naming.
* Updating documentation.

Reviews are collaborative and intended to improve the quality of the project.



# Definition of Done

A contribution is considered complete when:

* The linked GitHub Issue has been fully resolved.
* All acceptance criteria have been satisfied.
* Tests pass successfully.
* Linting passes.
* Documentation has been updated where necessary.
* The pull request has received maintainer approval.


# Need Help?

If anything is unclear:

* Ask a question on the relevant GitHub Issue.
* Open a GitHub Discussion (if enabled).
* Reach out through the project's communication channels.

Questions are always welcome.



# Thank You

Every contribution, whether it is code, tests, documentation, or feedback, helps make PadiPay more accessible by simplifying secure blockchain interactions for everyday users.

We appreciate your time and effort in helping build the future of PadiPay.
