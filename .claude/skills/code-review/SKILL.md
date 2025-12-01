---
name: code-review
description: Review code for best practices, potential bugs, and improvements. Use when the user asks for a code review, wants feedback on their code, or asks to check code quality.
---

# Code Review Skill

## Instructions

When reviewing code, analyze the following aspects systematically:

### 1. Code Quality

- Check for clear, descriptive variable and function names
- Verify proper code organization and structure
- Look for code duplication that could be refactored
- Ensure consistent coding style

### 2. Bug Detection

- Look for potential null/undefined errors
- Check for off-by-one errors in loops
- Verify error handling is in place
- Check for race conditions in async code

### 3. Performance

- Identify unnecessary computations
- Look for N+1 query patterns
- Check for memory leaks (especially event listeners)
- Verify efficient data structure usage

### 4. Security

- Check for SQL injection vulnerabilities
- Look for XSS vulnerabilities
- Verify input validation
- Check for sensitive data exposure

### 5. Best Practices

- Verify proper TypeScript types (if applicable)
- Check for magic numbers/strings
- Ensure proper error messages
- Verify logging is appropriate

## Output Format

Structure your review as follows:

```
## Summary
[Brief overall assessment]

## Issues Found
### Critical
- [Issue description and fix]

### Warnings
- [Issue description and suggestion]

### Suggestions
- [Improvement ideas]

## Positive Aspects
- [What's done well]
```

## Example

For a function like:

```javascript
function calc(x) {
  return x * 2 + 1;
}
```

You might respond:

- **Warning**: Function name `calc` is not descriptive. Consider `doubleAndIncrement`.
- **Warning**: Parameter `x` should have a more descriptive name like `value`.
- **Suggestion**: Add JSDoc comment explaining the function's purpose.
