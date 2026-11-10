#!/usr/bin/env bun
// Proves the allocation property check can fail: applies one break at a time to a
// COPY of report.service.ts, runs the property spec against the copy, and expects
// every break to be caught. The real report.service.ts is never written.
//
// Usage (from anywhere): bun .claude/skills/verify-allocation-rules/scripts/mutants.ts
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: mutant anchors are literal source text
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const server = path.resolve(import.meta.dir, '../../../../packages/server');
const reportDir = path.join(server, 'src/provider/report');
const original = path.join(reportDir, 'report.service.ts');
const mutantFile = path.join(reportDir, 'report.service.__mutant__.ts');
const spec = 'src/provider/report/report.allocation.spec.ts';

type Mutant = { name: string; expect: string; find: string; replace: string };

const mutants: Mutant[] = [
  {
    name: 'VAA treats a zero offense score as negative',
    expect: 'V1',
    find: '(ticker) => ticker.momentumScore < 0,',
    replace: '(ticker) => ticker.momentumScore <= 0,',
  },
  {
    name: 'VAA buys from the wrong group',
    expect: 'V2',
    find: `isMinusMomentumScoreInOffense
        ? deffenseSummary.tickers
        : offenseSummary.tickers,`,
    replace: `isMinusMomentumScoreInOffense
        ? offenseSummary.tickers
        : deffenseSummary.tickers,`,
  },
  {
    name: 'VAA buys the lowest score',
    expect: 'V3',
    find: 'data.sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 1)',
    replace:
      'data.sort((a, b) => a.momentumScore - b.momentumScore).slice(0, 1)',
  },
  {
    name: 'VAA message names a different ticker',
    expect: 'V4',
    find: '자산 중 구매 종목은 ${selectedTickerData.name} 이며',
    replace: '자산 중 구매 종목은 ${offenseSummary.tickers[0].name} 이며',
  },
  {
    name: 'DAA counts a zero canary score as positive',
    expect: 'D1',
    find: '(ticker) => ticker.momentumScore > 0,',
    replace: '(ticker) => ticker.momentumScore >= 0,',
  },
  {
    name: 'DAA buys 5 offense tickers at 100%',
    expect: 'D2',
    find: '(6 * buyingRatio) / 100,',
    replace: '(5 * buyingRatio) / 100,',
  },
  {
    name: 'DAA picks offense tickers in list order, not by score',
    expect: 'D3',
    find: `findBestMomentumScoreTickers(
      offenseSummary.tickers,
      (6 * buyingRatio) / 100,
    );`,
    replace: `offenseSummary.tickers
      .slice(0, (6 * buyingRatio) / 100)
      .map((ticker) => ticker.name);`,
  },
  {
    name: 'DAA buys a defense ticker even at 100% offense',
    expect: 'D4',
    find: 'deffenseRatio ? 1 : 0,',
    replace: 'deffenseRatio ? 1 : 1,',
  },
  {
    name: 'DAA always splits offense in sixths',
    expect: 'D5',
    find: 'buyingRatio / highScoreTickers.length,',
    replace: 'buyingRatio / 6,',
  },
  {
    name: 'DAA message prints the offense share instead of each weight',
    expect: 'D6',
    find: '.map(({ name, ratio }) => `${name} ${ratio}%`)',
    replace: '.map(({ name }) => `${name} ${buyingRatio}%`)',
  },
];

const run = (impl?: string) => {
  const proc = Bun.spawnSync(['bun', 'test', spec], {
    cwd: server,
    env: {
      ...process.env,
      ...(impl ? { ALLOCATION_IMPL: impl } : {}),
      ALLOCATION_RUNS: process.env.ALLOCATION_RUNS ?? '3000',
    },
  });
  const output = proc.stdout.toString() + proc.stderr.toString();
  const caught = [...new Set(output.match(/\b[VD]\d(?=:)/g) ?? [])].sort();
  return { ok: proc.exitCode === 0, caught, output };
};

if (existsSync(mutantFile)) {
  throw new Error(
    `Stale ${mutantFile}; delete it after checking it is not yours.`,
  );
}

const source = readFileSync(original, 'utf8');
let failures = 0;

const baseline = run();
console.log(`baseline (unmodified code): ${baseline.ok ? 'pass' : 'FAIL'}`);
if (!baseline.ok) {
  console.log(baseline.output);
  console.log(
    'The property fails on the real code. Read it before trusting mutants.',
  );
  failures++;
}

try {
  for (const m of mutants) {
    const hits = source.split(m.find).length - 1;
    if (hits !== 1) {
      console.log(
        `STALE  ${m.name}: anchor found ${hits} times, update this mutant`,
      );
      failures++;
      continue;
    }
    writeFileSync(mutantFile, source.replace(m.find, m.replace));
    const result = run('./report.service.__mutant__');
    const hit = !result.ok && result.caught.includes(m.expect);
    if (!hit) failures++;
    console.log(
      `${hit ? 'caught' : 'MISSED'} ${m.name}: expected ${m.expect}, got ${
        result.ok ? 'pass' : result.caught.join(',') || 'error without a rule'
      }`,
    );
    if (!result.ok && result.caught.length === 0) console.log(result.output);
  }
} finally {
  rmSync(mutantFile, { force: true });
}

console.log(failures ? `\n${failures} problem(s)` : '\nall mutants caught');
process.exit(failures ? 1 : 0);
