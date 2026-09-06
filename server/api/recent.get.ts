import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

// Recipes carry no date, so the git history is the only honest source for
// when one was added.
export default defineCachedEventHandler(async () => {
  try {
    const { stdout } = await run('git', [
      'log',
      '--diff-filter=A',
      '--format=%H|%aI',
      '--name-only',
      '--',
      'content/recipes'
    ], { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })

    const added: { path: string, date: string }[] = []
    const seen = new Set<string>()
    let date = ''

    for (const line of stdout.split('\n')) {
      if (line.includes('|')) {
        date = line.split('|')[1] ?? ''
        continue
      }
      const file = line.trim()
      if (!file.endsWith('.md') || seen.has(file)) continue
      seen.add(file)
      added.push({
        path: file.replace(/^content/, '').replace(/\.md$/, '').replace(/\/index$/, ''),
        date
      })
    }

    return added.slice(0, 12)
  } catch {
    return []
  }
}, { maxAge: 60 * 60 })
