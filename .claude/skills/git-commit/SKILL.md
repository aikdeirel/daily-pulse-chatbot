---
name: git-commit
description: Generate clear, conventional commit messages. Use when the user asks for help writing a commit message, wants to format their commit, or mentions git commits.
---

# Git Commit Message Skill

## Instructions

Generate commit messages following the Conventional Commits specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or correcting tests
- **chore**: Changes to build process or auxiliary tools
- **ci**: CI configuration changes

### Rules

1. **Subject line**:

   - Max 50 characters
   - Use imperative mood ("add" not "added")
   - No period at the end
   - Capitalize first letter

2. **Body** (optional):

   - Wrap at 72 characters
   - Explain what and why, not how
   - Separate from subject with blank line

3. **Footer** (optional):
   - Reference issues: `Fixes #123`
   - Breaking changes: `BREAKING CHANGE: description`

## Examples

### Simple feature

```
feat(auth): add password reset functionality
```

### Bug fix with body

```
fix(api): handle null response from external service

The external API occasionally returns null instead of an empty array.
Added null check to prevent TypeError in downstream processing.

Fixes #456
```

### Breaking change

```
feat(api)!: change response format for user endpoint

BREAKING CHANGE: The /api/users endpoint now returns a paginated
response object instead of a plain array. Clients must update
to access data via response.data property.
```

## Process

1. Ask the user what changes they made (or analyze provided diff)
2. Identify the type of change
3. Determine the scope (component/area affected)
4. Write a clear, concise subject
5. Add body if the change needs explanation
6. Include footer for issues/breaking changes
