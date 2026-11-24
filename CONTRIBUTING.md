# Contributing

Thanks for helping. Bug reports, fixes, tests and documentation are all welcome. By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), not in issues.

## Before you start

- For a bug, [open an issue](https://github.com/skolo-saka/school-search/issues/new/choose) with the bug-report form first, unless it is a small, obvious fix.
- For a new feature or a change to the props, open an issue to agree the approach before writing code.
- Issues labelled [`good first issue`](https://github.com/skolo-saka/school-search/labels/good%20first%20issue) are a good place to start. Comment on one to say you are taking it.

## Set up

You need [Node.js 24](https://nodejs.org/) (24.11 or later) and Git. `.nvmrc` pins the major version, so `nvm use` works.

1. Fork [skolo-saka/school-search](https://github.com/skolo-saka/school-search) on GitHub.
2. Clone your fork and add this repository as `upstream`:

   ```bash
   git clone https://github.com/<your-username>/school-search.git
   cd school-search
   git remote add upstream https://github.com/skolo-saka/school-search.git
   npm ci
   ```

3. Start the demo at http://localhost:5173 with `npm run demo`. It searches the live Skolo Saka directory by default. Choose **Testing mode** for the fictional schools and the slow and failure simulations.

## Make a change

1. Branch from an up-to-date `main`:

   ```bash
   git fetch upstream
   git switch -c fix/short-description upstream/main
   ```

   Use a `fix/`, `feature/`, `docs/` or `test/` prefix.

2. Make the change. Keep it focused on one thing.
   - Add or update a test in `test/` for any behaviour you change.
   - Keep the component accessible: it is a combobox used with a keyboard and screen readers.
   - Use only fictional schools, people and places in tests, fixtures, screenshots and issues. Tests must not call the live API. The demo's live mode shows real schools from the public Skolo Saka directory; mention real schools only as example searches. Never paste real learner, donor or user data.
   - Update `README.md` if you change props or behaviour.
3. Run the same checks as CI:

   ```bash
   npm run typecheck
   npm test
   npm run build
   npm run demo:build
   node scripts/check-package.mjs
   REACT_MAJOR=18 node scripts/check-package.mjs
   ```

   The package check runs against React 19 by default; `REACT_MAJOR=18 node scripts/check-package.mjs` checks the package against React 18.
4. Commit with a short message in the imperative ("Fix Escape closing the wrong list"), push to your fork and open a pull request against `main`.

## Pull requests

- Describe what changed and why, and link the issue (`Fixes #12`).
- Say how you tested it, including keyboard or screen-reader checks for UI changes.
- The **Typecheck, test and build** check must pass, and a maintainer must approve the pull request before it can be merged. `main` does not accept direct pushes.
- A maintainer may ask for changes. Push more commits to the same branch; there is no need to open a new pull request.
- Leave the version in `package.json` alone. Maintainers set it when they release, as described in [RELEASING.md](RELEASING.md). Merged changes reach npm, and then the Skolo Saka website, in the next release.

## Licence

Contributions are accepted under the [MIT licence](LICENSE) that covers this project.
