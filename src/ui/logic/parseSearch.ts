import type {RightFilter} from '../../model/rightQueries.ts'

const KEY_PATTERN = /^(rolle|channel|provider):(.+)$/i

/** Zerlegt den Suchtext in Schlüssel-Filter (rolle:, channel:, provider:) und Freitext; Schlüssel ohne Wert bleiben Freitext. */
export function parseSearch(args: {text: string}): RightFilter {
  const filter: RightFilter = {channel: null, provider: null, query: '', role: null}
  const free: string[] = []
  for (const token of args.text.split(/\s+/).filter((t) => t.length > 0)) {
    const match = KEY_PATTERN.exec(token)
    const key = match?.[1]?.toLowerCase()
    const value = match?.[2]
    if (key === undefined || value === undefined) {
      free.push(token)
    } else if (key === 'rolle') {
      filter.role = value.toUpperCase()
    } else if (key === 'channel') {
      filter.channel = value
    } else {
      filter.provider = value
    }
  }
  filter.query = free.join(' ')
  return filter
}
