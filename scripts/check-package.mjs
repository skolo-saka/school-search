// Checks the package exactly as npm would publish it, then installs it into a clean app.
//   node scripts/check-package.mjs                 builds, packs into a temp folder and checks that
//   node scripts/check-package.mjs <file.tgz>      checks an existing tarball (the release workflow)
// Set REACT_MAJOR=18 to check the package against React 18 instead of React 19 (the default).
// Exits non-zero on any problem. Needs network access to install React for the clean app.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const npm = (args, cwd) => execFileSync('npm', args, { cwd, encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] });
const fail = msg => { console.error(`check-package: ${msg}`); process.exitCode = 1; };
const work = mkdtempSync(join(tmpdir(), 'school-search-check-'));

try {
  // The React major to install into the clean consumer app. Defaults to 19; set
  // REACT_MAJOR=18 to check the package against React 18 (package.json declares
  // react >=18 as a peer dependency).
  const reactMajor = process.env.REACT_MAJOR ?? '19';
  if (!['18', '19'].includes(reactMajor)) throw new Error(`REACT_MAJOR must be 18 or 19, got ${reactMajor}`);

  // 1. The tarball
  let tgz = process.argv[2] && resolve(process.argv[2]);
  if (!tgz) {
    npm(['run', 'build'], root);
    const [packed] = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', work], root));
    tgz = join(work, packed.filename);
  }
  const expectedName = `skolo-saka-school-search-${pkg.version}.tgz`;
  if (basename(tgz) !== expectedName) fail(`expected ${expectedName}, got ${basename(tgz)}`);
  const files = execFileSync('tar', ['-tzf', basename(tgz)], { cwd: resolve(tgz, '..'), encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean).map(f => f.replace(/^package\//, ''));
  const required = ['package.json', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/index.d.cts', 'dist/styles.css'];
  for (const f of required) if (!files.includes(f)) fail(`missing from the package: ${f}`);
  const stray = files.filter(f => /^(src|test|demo|scripts|\.github)\/|\.tgz$|^node_modules\//.test(f));
  if (stray.length) fail(`should not be published: ${stray.join(', ')}`);
  const sha256 = createHash('sha256').update(readFileSync(tgz)).digest('hex');
  const sha512 = createHash('sha512').update(readFileSync(tgz)).digest('base64');
  console.log(`${basename(tgz)}: ${files.length} files, sha256 ${sha256}, integrity sha512-${sha512}`);

  // 2. A clean consumer app that installs only the tarball and React
  const app = join(work, 'consumer');
  execFileSync(process.execPath, ['-e', `require('fs').mkdirSync(${JSON.stringify(app)})`]);
  copyFileSync(tgz, join(app, expectedName));
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
  npm(['install', '--no-audit', '--no-fund', '--ignore-scripts', `./${expectedName}`,
    `react@${reactMajor}`, `react-dom@${reactMajor}`, `@types/react@${reactMajor}`, `@types/react-dom@${reactMajor}`, 'typescript@5'], app);

  writeFileSync(join(app, 'esm.mjs'), `
    import { createElement as h } from 'react';
    import { renderToString } from 'react-dom/server';
    import * as m from '@skolo-saka/school-search';
    import { createRequire } from 'node:module';
    for (const name of ['SchoolSearch', 'useSchoolSearch', 'schoolPlace', 'defaultMessages'])
      if (!(name in m)) throw new Error('ESM export missing: ' + name);
    const html = renderToString(h(m.SchoolSearch, { searchSchools: async () => [], onSelectSchool() {} }));
    if (!html.includes('role="combobox"')) throw new Error('SchoolSearch did not render a combobox');
    if (m.schoolPlace({ id: 'x', name: 'Fictional School', level: 'primary', town: 'Riverbend', province: 'Limpopo' }) !== 'Primary school, Riverbend, Limpopo')
      throw new Error('schoolPlace returned an unexpected place line');
    const req = createRequire(import.meta.url);
    const cjs = req('@skolo-saka/school-search');
    if (typeof cjs.SchoolSearch !== 'function') throw new Error('CommonJS build has no SchoolSearch');
    const css = req('fs').readFileSync(req.resolve('@skolo-saka/school-search/styles.css'), 'utf8');
    if (!css.includes('.skolo-search')) throw new Error('styles.css export is wrong');
    console.log('ESM, CommonJS, server render and styles.css: ok');
  `);
  execFileSync(process.execPath, ['esm.mjs'], { cwd: app, stdio: 'inherit' });

  // 3. TypeScript types in every resolution mode apps use, from ES modules and from CommonJS.
  // The @ts-expect-error lines fail the check if the types silently become `any`.
  writeFileSync(join(app, 'app.tsx'), `
    import { SchoolSearch, schoolPlace, type School, type SchoolSearchProps } from '@skolo-saka/school-search';
    import '@skolo-saka/school-search/styles.css';
    const props: SchoolSearchProps = { searchSchools: async (): Promise<School[]> => [], onSelectSchool: (s: School) => void s.id };
    export const App = () => <SchoolSearch {...props} />;
    export const place: string = schoolPlace({ level: 'primary', town: 'Riverbend' });
    // @ts-expect-error searchSchools is required
    export const Broken = () => <SchoolSearch onSelectSchool={() => {}} />;
    // @ts-expect-error schoolPlace takes a school, not a number
    schoolPlace(1);
  `);
  writeFileSync(join(app, 'app.cts'), `
    import { createElement } from 'react';
    import { SchoolSearch, schoolPlace, type School, type SchoolSearchProps } from '@skolo-saka/school-search';
    const props: SchoolSearchProps<School & { emis?: string }> = { searchSchools: async () => [], onSelectSchool: s => void s.emis };
    export const app = createElement(SchoolSearch, props);
    export const place: string = schoolPlace({ level: 'high' });
    // @ts-expect-error onSelectSchool is required
    export const broken: SchoolSearchProps = { searchSchools: async () => [] };
  `);
  writeFileSync(join(app, 'css.d.ts'), "declare module '*.css';\n");
  // Bundler resolution is what Next.js, Vite and the Skolo Saka website use; node16/nodenext is what
  // Node.js libraries and tools use (skolo-saka/school-search#10).
  for (const resolution of ['bundler', 'node16', 'nodenext']) {
    writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      strict: true, noEmit: true, jsx: 'react-jsx', skipLibCheck: false, target: 'es2022', types: [],
      module: resolution === 'bundler' ? 'esnext' : resolution, moduleResolution: resolution },
      files: resolution === 'bundler' ? ['app.tsx', 'css.d.ts'] : ['app.tsx', 'app.cts', 'css.d.ts'] }));
    execFileSync(process.execPath, [join(app, 'node_modules/typescript/bin/tsc'), '-p', '.'], { cwd: app, stdio: 'inherit' });
    console.log(`TypeScript types (${resolution} resolution${resolution === 'bundler' ? '' : ', ES module and CommonJS'}): ok`);
  }

  // 4. Are the types wrong? Checks every export condition resolves to declarations in the right format.
  execFileSync(process.execPath, [join(root, 'node_modules/@arethetypeswrong/cli/dist/index.js'), tgz,
    '--exclude-entrypoints', './styles.css', '--format', 'table-flipped'], { cwd: root, stdio: 'inherit' });
} catch (e) {
  fail(e.message);
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (!process.exitCode) console.log(`check-package (React ${reactMajor}): ok`);
