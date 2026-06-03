/**
 * Interactive playground for the complexity-based intent router.
 *
 * Type any input and see the full routing breakdown (route, intent, score,
 * confidence, detected entities, complexity). Shares its logic with the test
 * suite via `./intent-complexity`, so what you see here is exactly what the
 * tests assert.
 *
 * Usage (from apps/web):
 *   yarn intent:try "save $5000 for a trip to Spain by December"   # one-shot
 *   yarn intent:try                                                # REPL
 *   yarn intent:try --dataset                                      # dump corpus
 *   yarn intent:try --json "open the graph"                        # JSON output
 */

import * as readline from 'node:readline'
import {
  COMPLEXITY_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  classifyWithComplexityRouting,
  type RoutingResult,
  SAMPLE_DATASET,
} from './intent-complexity'

function formatList(values: string[]): string {
  return values.length ? values.join(', ') : '-'
}

/** Pretty multi-line breakdown for a single input. */
function formatResult(input: string, result: RoutingResult): string {
  const { route, intent, score, confidence, usedQuickPattern } = result
  const { dates, times, names, priorities } = result.entities
  const { wordCount, clauseCount, ambiguousTerms } = result.complexity

  const lines = [
    `input:      "${input}"`,
    `  route:      ${route.toUpperCase()}`,
    `  intent:     ${intent}`,
    `  score:      ${score} / 100  ` +
      `(simple <= ${COMPLEXITY_THRESHOLDS.SIMPLE_MAX}, ` +
      `complex >= ${COMPLEXITY_THRESHOLDS.COMPLEX_MIN})`,
    `  confidence: ${confidence.toFixed(2)}  ` +
      `(simple >= ${CONFIDENCE_THRESHOLDS.SIMPLE}, ` +
      `ambiguous >= ${CONFIDENCE_THRESHOLDS.AMBIGUOUS})`,
    `  quickHit:   ${usedQuickPattern ? 'yes' : 'no'}` +
      (result.page ? `   page: ${result.page}` : ''),
    `  entities:   dates=[${formatList(dates)}] times=[${formatList(times)}] ` +
      `names=[${formatList(names)}] priorities=[${formatList(priorities)}]`,
    `  complexity: words=${wordCount} clauses=${clauseCount} ` +
      `ambiguous=[${formatList(ambiguousTerms)}]`,
  ]
  return lines.join('\n')
}

function classifyAndPrint(input: string, asJson: boolean): void {
  const result = classifyWithComplexityRouting(input)
  if (asJson) {
    console.log(JSON.stringify({ input, ...result }))
  } else {
    console.log(formatResult(input, result))
    console.log('')
  }
}

/** Prints the shared corpus as an aligned table, flagging any mismatches. */
function printDataset(): void {
  let mismatches = 0
  console.log(
    `${'ROUTE'.padEnd(11)}${'INTENT'.padEnd(16)}${'SCORE'.padEnd(7)}INPUT`
  )
  console.log('-'.repeat(80))
  for (const c of SAMPLE_DATASET) {
    const result = classifyWithComplexityRouting(c.input)
    const ok = result.route === c.route && result.intent === c.intent
    if (!ok) mismatches += 1
    const flag = ok ? '' : '  <-- MISMATCH'
    console.log(
      `${result.route.padEnd(11)}${result.intent.padEnd(16)}` +
        `${String(result.score).padEnd(7)}${c.input}${flag}`
    )
  }
  const embeddings = SAMPLE_DATASET.filter(
    (c) => classifyWithComplexityRouting(c.input).route === 'embeddings'
  ).length
  console.log('-'.repeat(80))
  console.log(
    `${SAMPLE_DATASET.length} cases | embeddings=${embeddings} ` +
      `llm=${SAMPLE_DATASET.length - embeddings} | mismatches=${mismatches}`
  )
}

function startRepl(asJson: boolean): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'intent> ',
  })
  console.log(
    'Type an input and press Enter to see how it routes. Ctrl+C or "exit" to quit.\n'
  )
  rl.prompt()
  rl.on('line', (line) => {
    const input = line.trim()
    if (input === 'exit' || input === 'quit') {
      rl.close()
      return
    }
    if (input.length) classifyAndPrint(input, asJson)
    rl.prompt()
  })
  rl.on('close', () => process.exit(0))
}

function main(): void {
  const args = process.argv.slice(2)
  const asJson = args.includes('--json')
  const rest = args.filter((a) => a !== '--json')

  if (rest.includes('--dataset') || rest.includes('--all')) {
    printDataset()
    return
  }

  const inputs = rest.filter((a) => !a.startsWith('--'))
  if (inputs.length) {
    for (const input of inputs) classifyAndPrint(input, asJson)
    return
  }

  // No positional input: drop into the interactive REPL.
  startRepl(asJson)
}

main()
