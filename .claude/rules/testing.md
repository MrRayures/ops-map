# Testing — Project Conventions

## Strategy

- Unit tests: utilities, hooks, pure functions
- Component tests: UI logic, user interactions
- E2E tests: critical user journeys only

## Conventions

- Test file co-located: `Component.test.tsx`
- Describe/it pattern: "should [expected behavior]"
- No skipped tests without explanation (comment why)
- Each test: Arrange → Act → Assert

## Coverage

- Aim for meaningful coverage, not 100%
- Always test: edge cases, error states, async flows, boundaries
- Never test: implementation details, framework internals, CSS

## Tools

- Runner: [to configure]
- DOM queries: Testing Library (prefer user-centric: getByRole, getByText)
- Mocking: minimal — prefer real implementations
- E2E: Playwright or Cypress

## Async

- Use waitFor / findBy for async assertions
- Never use arbitrary sleep/setTimeout in tests
- Mock network requests, not internal functions
