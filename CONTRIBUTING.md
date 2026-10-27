# Contributing to noviq-ui

Thanks for taking an interest in noviq-ui, the React component library of the Noviq product suite.
Please read this and the [Code of Conduct](CODE_OF_CONDUCT.md) before you open an issue or a pull
request.

## Where this stands

noviq-ui is proprietary software of **Satellite Key IT** (see [LICENSE](LICENSE)). The code is
visible on GitHub and the package is on npm, but that does not grant a licence to use it — use
needs a written agreement with Satellite Key IT. Within that, contributions are welcome as
described below.

## Reporting a bug or suggesting something

Open an [issue](https://github.com/NeerajSkeyit/noviq-ui-npm/issues). The more of this you include,
the faster it can be fixed:

- the noviq-ui version (`npm ls noviq-ui`), React version and browser;
- what you did, what you expected and what happened;
- the smallest component usage that reproduces it (a code snippet is ideal);
- for a visual or stacking problem, a screenshot and any CSS of yours around it.

Security problems should not go in a public issue: write to the address in
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) instead.

## Code contributions

Pull requests are accepted from Satellite Key IT staff and from partners authorised by Satellite Key
IT. If that is you:

1. **Open an issue first** and wait for a go-ahead, so nobody builds something that can't be merged.
2. Fork or branch from `main`, keep the change small and about one thing.
3. Add or update tests with the change (see below), and update the README if behaviour changes.
4. Open the pull request, describe the *why*, and link the issue.

**Terms of a contribution.** By submitting code, documentation or any other material you confirm that
you have the right to submit it, and you grant Satellite Key IT a perpetual, worldwide,
irrevocable, royalty-free licence to use, copy, modify, sublicense and distribute it as part of
noviq-ui and its derivatives. Satellite Key IT may decline any contribution.

## Setting up

```bash
npm install
npm run dev        # the Vite dev server for the library's own scratch page
```

## Checks every change must pass

```bash
npx tsc --noEmit   # types
npx vitest run     # the whole test suite
npm run build      # type-check + production build (writes dist/)
```

Test first when you can: write the failing test, make it pass, then check the test is worth anything
by breaking the code on purpose and seeing it fail.

## Conventions the tests enforce

- **Fixed values are named constants** in `src/constants.ts` — variants, sizes, key names, default
  copy, defaults. No bare literal for something that has a constant.
- **Everything that lands in the page's CSS namespace is prefixed:** classes `nq-…`, custom
  properties `--nq-…`, keyframes `nq-…`. Nothing may select a bare element or write a numeric
  `z-index`; layers come from the `--nq-z-*` scale in `src/styles/tokens.css`.
- **User-facing text goes through `DEFAULT_TEXT` / `config.text`** so it can be translated, and an
  accessible name for every control.
- **No breaking changes.** Releases are patches and minors: an existing prop, export or default keeps
  working. A new behaviour that would change an existing one is added as an opt-in.
- Popups, menus and overlays must work inside a `Modal` and a `Drawer` — check stacking in a real
  browser, not only in jsdom.

## Releases

Maintainers cut releases and publish to npm; contributors don't need to bump the version.
