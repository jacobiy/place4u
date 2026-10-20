/**
 * Tiny assertion harness shared by the scripts in test/.
 *
 * Deliberately not a test framework: no config, no globals, no dependencies.
 * A failing check sets process.exitCode = 1 so CI treats it as a failed run.
 *
 * The one genuinely important helper is `isRlsDenied`: PostgREST surfaces a
 * blocked statement as HTTP 401/403 and/or Postgres SQLSTATE 42501
 * ("insufficient_privilege"), whether the block came from Row Level Security or
 * from a missing table privilege. Anything else (23502 not-null, 23503
 * foreign-key, 23514 check, 22P02 invalid text …) means the statement REACHED
 * the table — which is how a probe tells "blocked" apart from "allowed".
 */

const C = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  dim: '\u001b[2m',
  bold: '\u001b[1m'
};

/** A UUID that can never be a real primary key — safe to filter/target with. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const results = { pass: 0, fail: 0, skip: 0 };
const failures = [];

export function section(title) {
  process.stdout.write(`\n${C.bold}${title}${C.reset}\n`);
}

export function pass(name, detail = '') {
  results.pass += 1;
  process.stdout.write(`  ${C.green}PASS${C.reset} ${name}${detail ? ` ${C.dim}(${detail})${C.reset}` : ''}\n`);
}

export function fail(name, detail = '') {
  results.fail += 1;
  failures.push(detail ? `${name} — ${detail}` : name);
  process.stdout.write(`  ${C.red}FAIL${C.reset} ${name}${detail ? ` ${C.dim}(${detail})${C.reset}` : ''}\n`);
}

export function skip(name, detail = '') {
  results.skip += 1;
  process.stdout.write(`  ${C.yellow}SKIP${C.reset} ${name}${detail ? ` ${C.dim}(${detail})${C.reset}` : ''}\n`);
}

export function check(name, condition, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
  return Boolean(condition);
}

export function isRlsDenied(error) {
  if (!error) return false;
  const code = String(error.code || '');
  if (code === '42501') return true;
  if (error.status === 401 || error.status === 403) return true;
  return /row-level security|permission denied|insufficient privilege/i.test(error.message || '');
}

/** Describes a PostgREST error compactly, for FAIL/SKIP messages. */
export function describeError(error) {
  if (!error) return 'no error';
  const parts = [];
  if (error.status) parts.push(`HTTP ${error.status}`);
  if (error.code) parts.push(error.code);
  if (error.message) parts.push(String(error.message).split('\n')[0].slice(0, 140));
  return parts.join(' / ') || 'unknown error';
}

export function report(title = 'Summary') {
  const { pass: p, fail: f, skip: s } = results;
  process.stdout.write(`\n${C.bold}${title}${C.reset}: ${p} passed, ${f} failed, ${s} skipped\n`);
  if (failures.length) {
    process.stdout.write(`${C.red}Failures:${C.reset}\n`);
    for (const line of failures) process.stdout.write(`  - ${line}\n`);
  }
  process.exitCode = f > 0 ? 1 : 0;
  return f;
}
