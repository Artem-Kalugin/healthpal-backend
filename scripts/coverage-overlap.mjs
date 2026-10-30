#!/usr/bin/env node
// Shows which test files execute the functions of source files, to find
// cases where one helper is tested again in the tests of different modules.
//
// Each test file (unit, integration, e2e) runs in Jest separately with coverage,
// then a "function -> test files" matrix is built. This is execution coverage, not
// assertion coverage: a file in the list means "the code ran", not "the test asserts something".
// To tell whether assertions are duplicated, open the tests themselves.
//
// It also counts the test cases (it) in each file that executed the source file.
// This is done by scripts/coverage-case-environment.cjs: it takes coverage counters around
// the body of each test. Code executed only in beforeAll or on module load
// (infrastructure) gives 0 cases: the file "touches" the source, but no case executes it
// in its body. A case is counted once, however many functions of the file it executed.
//
// Known and verified cases where overlap is acceptable are recorded in
// scripts/not-overlapping.json (next to this file). The report prints "ok" and the reason for them.
// If a new test file that executes such a helper appears, it is not in the list
// of acceptable ones and the overlap will show up in the report again.
//
// int and e2e need the test DB and Redis: `pnpm test:db:up`.
//
// Usage:
//   node scripts/coverage-overlap.mjs                  # helpers, all suites
//   node scripts/coverage-overlap.mjs --only 'domain/doctor/.*\.ts'
//   node scripts/coverage-overlap.mjs --suites unit    # unit,int,e2e comma-separated
//   node scripts/coverage-overlap.mjs --reuse          # do not rerun Jest, reuse the previous result
//   node scripts/coverage-overlap.mjs --min 3          # show files with N or more test files
//   node scripts/coverage-overlap.mjs --reuse --record-cases
//       # record the current case count in scripts/not-overlapping.json for the files in the list

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'coverage', 'overlap');
const allowlistPath = join(root, 'scripts', 'not-overlapping.json');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);

  return index === -1 ? fallback : args[index + 1];
};

const suitesToRun = option('suites', 'unit,int,e2e').split(',');
const only = new RegExp(option('only', '/helpers/'));
const minTests = Number(option('min', 2));
const reuse = args.includes('--reuse');
const recordCases = args.includes('--record-cases');
const caseEnvironment = join(root, 'scripts', 'coverage-case-environment.cjs');

const suites = {
  unit: {
    dir: 'src',
    match: /\.spec\.ts$/,
    jestArgs: ['--rootDir', 'src'],
  },
  int: {
    dir: 'test/integration',
    match: /\.int-spec\.ts$/,
    jestArgs: ['--config', 'test/jest-integration.json'],
  },
  e2e: {
    dir: 'test/e2e',
    match: /\.e2e-spec\.ts$/,
    jestArgs: ['--config', 'test/jest-e2e.json'],
  },
};

const walk = dir =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const slug = value => value.replace(/[^a-z0-9]+/gi, '_');

const runSuite = name => {
  const suite = suites[name];
  const files = walk(suite.dir).filter(file => suite.match.test(file));

  for (const file of files) {
    const outDir = join(outRoot, `${name}__${slug(file)}`);

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'label.txt'), `${name}:${file}`);

    const jestArgs = [
      'jest',
      ...suite.jestArgs,
      // for int and e2e rootDir is already the repository root, for unit it is src
      ...(name === 'unit' ? [] : ['--collectCoverageFrom=src/**/*.ts']),
      '--coverage',
      '--coverageReporters=json',
      `--coverageDirectory=${outDir}`,
      '--runInBand',
      '--silent',
      `--testEnvironment=${caseEnvironment}`,
      // test path relative to the config rootDir
      name === 'unit' ? relative('src', file) : file,
    ];
    const { status, stdout, stderr } = spawnSync('npx', jestArgs, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, COVERAGE_CASES_OUT: join(outDir, 'cases.json') },
    });

    console.error(`${status === 0 ? 'ok  ' : 'FAIL'} ${name}:${file}`);

    if (status !== 0) {
      console.error(stdout + stderr);
      process.exit(1);
    }
  }
};

if (!reuse) {
  rmSync(outRoot, { recursive: true, force: true });
  suitesToRun.forEach(runSuite);
}

if (!existsSync(outRoot)) {
  console.error('No data, run without --reuse');
  process.exit(1);
}

// src file -> function -> Set<test file>
const matrix = new Map();
// src file -> test file -> Set<case>; function -> test file -> Set<case>
const caseMatrix = new Map();
const fnCaseMatrix = new Map();
// test file -> number of executed cases
const totalCases = new Map();

// Line numbers in the coverage report are mapped to the source TS, while in the Jest environment they stay
// from the transpiled JS, so functions from the two sources are matched by name.
const withoutLine = fnName => fnName.replace(/@\d+$/, '');

const addTo = (map, ...keys) => {
  const last = keys.pop();
  const target = keys.reduce(
    (current, key) => current.get(key) ?? current.set(key, new Map()).get(key),
    map,
  );

  return target.get(last) ?? target.set(last, new Set()).get(last);
};

for (const dirName of readdirSync(outRoot)) {
  const reportPath = join(outRoot, dirName, 'coverage-final.json');

  if (!existsSync(reportPath)) {
    continue;
  }

  const testLabel = readFileSync(join(outRoot, dirName, 'label.txt'), 'utf8');
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const casesPath = join(outRoot, dirName, 'cases.json');
  const cases = existsSync(casesPath)
    ? JSON.parse(readFileSync(casesPath, 'utf8'))
    : [];

  totalCases.set(testLabel, cases.length);

  for (const { name, executed } of cases) {
    for (const [absPath, functions] of Object.entries(executed)) {
      const source = relative(root, absPath);

      if (
        !source.startsWith('src/') ||
        !only.test(source.slice('src/'.length))
      ) {
        continue;
      }

      addTo(caseMatrix, source, testLabel).add(name);

      for (const fnName of functions) {
        addTo(fnCaseMatrix, source, withoutLine(fnName), testLabel).add(name);
      }
    }
  }

  for (const [absPath, fileCov] of Object.entries(report)) {
    const source = relative(root, absPath);

    if (!source.startsWith('src/') || !only.test(source.slice('src/'.length))) {
      continue;
    }

    for (const [id, hits] of Object.entries(fileCov.f)) {
      if (hits === 0) {
        continue;
      }

      const fn = fileCov.fnMap[id];
      const name = `${fn.name}@${fn.loc.start.line}`;
      const functions = matrix.get(source) ?? new Map();
      const tests = functions.get(name) ?? new Set();

      tests.add(testLabel);
      functions.set(name, tests);
      matrix.set(source, functions);
    }
  }
}

const allowlist = existsSync(allowlistPath)
  ? JSON.parse(readFileSync(allowlistPath, 'utf8'))
  : {};

/** Number of cases in each test file that executed the source file. */
const casesOf = source =>
  Object.fromEntries(
    [...(caseMatrix.get(source) ?? [])].map(([test, set]) => [test, set.size]),
  );

const isAllowed = (source, tests) => {
  const entry = allowlist[source];

  if (!entry) {
    return { entry: null };
  }

  if (entry.tests !== '*' && !tests.every(test => entry.tests.includes(test))) {
    return { entry: null };
  }

  const actual = casesOf(source);
  const grown = Object.entries(entry.cases ?? {}).filter(
    ([test, recorded]) => (actual[test] ?? 0) > recorded,
  );

  return grown.length > 0
    ? {
        entry: null,
        grown: grown.map(
          ([test, n]) => `${test}: was ${n}, now ${actual[test]}`,
        ),
      }
    : { entry };
};

let flagged = 0;

for (const [source, functions] of [...matrix].sort()) {
  const tests = [...new Set([...functions.values()].flatMap(set => [...set]))];

  if (tests.length < minTests) {
    continue;
  }

  const { entry, grown } = isAllowed(source, tests);

  if (!entry) {
    flagged++;
  }

  const actual = casesOf(source);
  const totalForSource = Object.values(actual).reduce((sum, n) => sum + n, 0);

  console.log(
    `\n${entry ? 'ok ' : '!! '} ${source} (test files: ${tests.length}, cases: ${totalForSource})`,
  );

  if (entry) {
    console.log(`     ${entry.reason}`);
  }

  if (grown) {
    console.log(
      `     The case count grew compared to the recorded one: ${grown.join('; ')}`,
    );
  }

  for (const test of tests.sort()) {
    const count = actual[test] ?? 0;

    console.log(
      `     ${test}: ${count === 0 ? 'setup/load only' : `${count} of ${totalCases.get(test)} cases`}`,
    );
  }

  const rows = [...functions].sort((a, b) => b[1].size - a[1].size);

  for (const [name, set] of rows) {
    const byTest =
      fnCaseMatrix.get(source)?.get(withoutLine(name)) ?? new Map();
    const cases = [...byTest.values()].reduce((sum, c) => sum + c.size, 0);

    console.log(
      `  ${String(set.size).padStart(2)} f. ${String(cases).padStart(3)} c.  ${name}`,
    );
  }
}

console.log(`\nNeed review: ${flagged}`);

if (recordCases) {
  for (const source of Object.keys(allowlist)) {
    allowlist[source].cases = Object.fromEntries(
      Object.entries(casesOf(source)).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  writeFileSync(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);
  console.log(`Case count recorded in ${relative(root, allowlistPath)}`);
}
