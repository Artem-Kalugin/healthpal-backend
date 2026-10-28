#!/usr/bin/env node
// Показывает, какие тестовые файлы выполняют функции исходных файлов, чтобы находить
// ситуации, когда один хелпер проверяют заново в тестах разных модулей.
//
// Каждый тестовый файл (unit, integration, e2e) запускается в Jest отдельно с coverage,
// затем собирается матрица «функция -> тестовые файлы». Это покрытие по выполнению, а не
// по проверкам: файл в списке значит «код выполнился», а не «тест что-то утверждает».
// Чтобы понять, дублируются ли проверки, нужно открыть сами тесты.
//
// Дополнительно считается число тест-кейсов (it) в каждом файле, выполнивших исходный файл.
// Это делает scripts/coverage-case-environment.cjs: он снимает счётчики покрытия вокруг
// тела каждого теста. Код, выполненный только в beforeAll или при загрузке модулей
// (инфраструктура), даёт 0 кейсов: файл «трогает» исходник, но ни один кейс не выполняет его
// в своём теле. Кейс считается один раз, сколько бы функций файла он ни выполнил.
//
// Известные и проверенные случаи, где пересечение допустимо, записаны в
// scripts/not-overlapping.json (рядом с этим файлом). Для них отчёт пишет «ok» и причину.
// Если появился новый тестовый файл, выполняющий такой хелпер, он не входит в список
// допустимых и пересечение снова попадёт в отчёт.
//
// Для int и e2e нужны тестовые БД и Redis: `pnpm test:db:up`.
//
// Использование:
//   node scripts/coverage-overlap.mjs                  # хелперы, все наборы
//   node scripts/coverage-overlap.mjs --only 'domain/doctor/.*\.ts'
//   node scripts/coverage-overlap.mjs --suites unit    # unit,int,e2e через запятую
//   node scripts/coverage-overlap.mjs --reuse          # не перезапускать Jest, взять прошлый результат
//   node scripts/coverage-overlap.mjs --min 3          # показывать файлы от N тестовых файлов
//   node scripts/coverage-overlap.mjs --reuse --record-cases
//       # записать текущее число кейсов в scripts/not-overlapping.json для файлов из списка

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
      // для int и e2e rootDir уже корень репозитория, для unit это src
      ...(name === 'unit' ? [] : ['--collectCoverageFrom=src/**/*.ts']),
      '--coverage',
      '--coverageReporters=json',
      `--coverageDirectory=${outDir}`,
      '--runInBand',
      '--silent',
      `--testEnvironment=${caseEnvironment}`,
      // путь теста относительно rootDir конфигурации
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
  console.error('Нет данных, запустите без --reuse');
  process.exit(1);
}

// src-файл -> функция -> Set<тестовый файл>
const matrix = new Map();
// src-файл -> тестовый файл -> Set<кейс>; функция -> тестовый файл -> Set<кейс>
const caseMatrix = new Map();
const fnCaseMatrix = new Map();
// тестовый файл -> число выполненных кейсов
const totalCases = new Map();

// Номера строк в отчёте покрытия пересчитаны на исходный TS, а в окружении Jest остаются
// от транспилированного JS, поэтому функции из двух источников сопоставляются по имени.
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

/** Число кейсов в каждом тестовом файле, выполнивших исходный файл. */
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
          ([test, n]) => `${test}: было ${n}, стало ${actual[test]}`,
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
    `\n${entry ? 'ok ' : '!! '} ${source} (тестовых файлов: ${tests.length}, кейсов: ${totalForSource})`,
  );

  if (entry) {
    console.log(`     ${entry.reason}`);
  }

  if (grown) {
    console.log(
      `     Число кейсов выросло относительно записанного: ${grown.join('; ')}`,
    );
  }

  for (const test of tests.sort()) {
    const count = actual[test] ?? 0;

    console.log(
      `     ${test}: ${count === 0 ? 'только setup/загрузка' : `${count} из ${totalCases.get(test)} кейсов`}`,
    );
  }

  const rows = [...functions].sort((a, b) => b[1].size - a[1].size);

  for (const [name, set] of rows) {
    const byTest =
      fnCaseMatrix.get(source)?.get(withoutLine(name)) ?? new Map();
    const cases = [...byTest.values()].reduce((sum, c) => sum + c.size, 0);

    console.log(
      `  ${String(set.size).padStart(2)} ф. ${String(cases).padStart(3)} к.  ${name}`,
    );
  }
}

console.log(`\nТребуют проверки: ${flagged}`);

if (recordCases) {
  for (const source of Object.keys(allowlist)) {
    allowlist[source].cases = Object.fromEntries(
      Object.entries(casesOf(source)).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  writeFileSync(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`);
  console.log(`Число кейсов записано в ${relative(root, allowlistPath)}`);
}
