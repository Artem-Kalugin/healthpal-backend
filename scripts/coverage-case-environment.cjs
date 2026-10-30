// Jest environment for scripts/coverage-overlap.mjs: for each test case it records
// which source functions it executed. The coverage counters snapshot is taken only around
// the test body (test_fn_start/test_fn_success events), so beforeAll, beforeEach and
// afterEach are excluded from the diff. The result is written to the file from COVERAGE_CASES_OUT.

const { writeFileSync } = require('node:fs');

const loadNodeEnvironment = () => {
  // jest-environment-node may not be in the root node_modules (pnpm), so we look it up from jest
  try {
    return require('jest-environment-node');
  } catch {
    return require(
      require.resolve('jest-environment-node', {
        paths: [require.resolve('jest')],
      }),
    );
  }
};

const { TestEnvironment: NodeEnvironment } = loadNodeEnvironment();

const snapshot = coverage =>
  Object.fromEntries(
    Object.entries(coverage ?? {}).map(([file, data]) => [file, { ...data.f }]),
  );

const executedSince = (before, coverage) => {
  const executed = {};

  for (const [file, data] of Object.entries(coverage ?? {})) {
    for (const [id, hits] of Object.entries(data.f)) {
      if (hits > (before[file]?.[id] ?? 0)) {
        const fn = data.fnMap[id];

        (executed[file] ??= []).push(`${fn.name}@${fn.loc.start.line}`);
      }
    }
  }

  return executed;
};

const fullName = test => {
  const names = [];

  for (
    let node = test;
    node && node.name !== 'ROOT_DESCRIBE_BLOCK';
    node = node.parent
  ) {
    names.unshift(node.name);
  }

  return names.join(' > ');
};

class CaseCoverageEnvironment extends NodeEnvironment {
  cases = [];
  before = {};

  async handleTestEvent(event, state) {
    await super.handleTestEvent?.(event, state);

    if (event.name === 'test_fn_start') {
      this.before = snapshot(this.global.__coverage__);
    }

    if (event.name === 'test_fn_success' || event.name === 'test_fn_failure') {
      this.cases.push({
        name: fullName(event.test),
        executed: executedSince(this.before, this.global.__coverage__),
      });
    }
  }

  async teardown() {
    if (process.env.COVERAGE_CASES_OUT) {
      writeFileSync(process.env.COVERAGE_CASES_OUT, JSON.stringify(this.cases));
    }

    await super.teardown();
  }
}

module.exports = CaseCoverageEnvironment;
