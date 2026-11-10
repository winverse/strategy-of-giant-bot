#!/usr/bin/env bun
// Proves the allocation property check can fail: applies one break at a time to a
// COPY of vaa.ts, daa.ts or report/message.ts, runs the property spec against the
// copy, and expects every break to be caught. The real files are never written.
//
// Usage (from anywhere): bun .claude/skills/verify-allocation-rules/scripts/mutants.ts
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: mutant anchors are literal source text
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const server = path.resolve(import.meta.dir, '../../../../apps/server');
const strategyDir = path.join(server, 'src/strategy');
const spec = 'src/strategy/allocation/allocation.property.spec.ts';

// Each target: the file under src/strategy, the env var the spec reads to load a
// replacement, and the replacement's path as the spec (in allocation/) requires it.
const targets = {
  vaa: {
    file: 'allocation/vaa.ts',
    env: 'VAA_IMPL',
    impl: './vaa.__mutant__',
  },
  daa: {
    file: 'allocation/daa.ts',
    env: 'DAA_IMPL',
    impl: './daa.__mutant__',
  },
  message: {
    file: 'report/message.ts',
    env: 'MESSAGE_IMPL',
    impl: '../report/message.__mutant__',
  },
} as const;

type Mutant = {
  name: string;
  expect: string;
  target: keyof typeof targets;
  find: string;
  replace: string;
};

const mutants: Mutant[] = [
  {
    name: 'VAA treats a zero offense score as negative',
    expect: 'V1',
    target: 'vaa',
    find: '(ticker) => ticker.momentumScore < 0,',
    replace: '(ticker) => ticker.momentumScore <= 0,',
  },
  {
    name: 'VAA buys from the wrong group',
    expect: 'V2',
    target: 'vaa',
    find: 'topByScore(isDefensive ? defense : offense, 1)',
    replace: 'topByScore(isDefensive ? offense : defense, 1)',
  },
  {
    name: 'VAA buys the lowest score',
    expect: 'V3',
    target: 'vaa',
    find: 'topByScore(isDefensive ? defense : offense, 1)',
    replace:
      '[...(isDefensive ? defense : offense)].sort((a, b) => a.momentumScore - b.momentumScore).slice(0, 1)',
  },
  {
    name: 'VAA message names a different ticker',
    expect: 'V4',
    target: 'message',
    find: '자산 중 구매 종목은 ${vaa.selectedTicker.name} 이며',
    replace: '자산 중 구매 종목은 ${summary[0].tickers[0].name} 이며',
  },
  {
    name: 'DAA counts a zero canary score as positive',
    expect: 'D1',
    target: 'daa',
    find: '(ticker) => ticker.momentumScore > 0,',
    replace: '(ticker) => ticker.momentumScore >= 0,',
  },
  {
    name: 'DAA buys 5 offense tickers at 100%',
    expect: 'D2',
    target: 'daa',
    find: '(6 * offenseRatio) / 100',
    replace: '(5 * offenseRatio) / 100',
  },
  {
    name: 'DAA picks offense tickers in list order, not by score',
    expect: 'D3',
    target: 'daa',
    find: 'topByScore(offense, (6 * offenseRatio) / 100)',
    replace: 'offense.slice(0, (6 * offenseRatio) / 100)',
  },
  {
    name: 'DAA buys a defense ticker even at 100% offense',
    expect: 'D4',
    target: 'daa',
    find: 'defenseRatio ? 1 : 0',
    replace: 'defenseRatio ? 1 : 1',
  },
  {
    name: 'DAA always splits offense in sixths',
    expect: 'D5',
    target: 'daa',
    find: 'offenseRatio / offenseTickers.length',
    replace: 'offenseRatio / 6',
  },
  {
    name: 'DAA message prints the offense share instead of each weight',
    expect: 'D6',
    target: 'message',
    find: '.map(({ name, ratio }) => `${name} ${ratio}%`)',
    replace: '.map(({ name }) => `${name} ${daa.offenseRatio}%`)',
  },
];

const mutantPath = (target: keyof typeof targets) =>
  path.join(
    strategyDir,
    targets[target].file.replace(/\.ts$/, '.__mutant__.ts'),
  );

const run = (env: Record<string, string> = {}) => {
  const proc = Bun.spawnSync(['bun', 'test', spec], {
    cwd: server,
    env: {
      ...process.env,
      ...env,
      ALLOCATION_RUNS: process.env.ALLOCATION_RUNS ?? '3000',
    },
  });
  const output = proc.stdout.toString() + proc.stderr.toString();
  const caught = [...new Set(output.match(/\b[VD]\d(?=:)/g) ?? [])].sort();
  return { ok: proc.exitCode === 0, caught, output };
};

const stale = Object.keys(targets)
  .map((target) => mutantPath(target as keyof typeof targets))
  .filter((file) => existsSync(file));
if (stale.length) {
  throw new Error(
    `Stale ${stale.join(', ')}; delete after checking they are not yours.`,
  );
}

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
    const target = targets[m.target];
    const source = readFileSync(path.join(strategyDir, target.file), 'utf8');
    const hits = source.split(m.find).length - 1;
    if (hits !== 1) {
      console.log(
        `STALE  ${m.name}: anchor found ${hits} times in ${target.file}, update this mutant`,
      );
      failures++;
      continue;
    }
    writeFileSync(mutantPath(m.target), source.replace(m.find, m.replace));
    const result = run({ [target.env]: target.impl });
    rmSync(mutantPath(m.target), { force: true });
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
  for (const target of Object.keys(targets)) {
    rmSync(mutantPath(target as keyof typeof targets), { force: true });
  }
}

console.log(failures ? `\n${failures} problem(s)` : '\nall mutants caught');
process.exit(failures ? 1 : 0);
