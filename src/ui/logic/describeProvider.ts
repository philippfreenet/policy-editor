import type {ProviderDef} from '../../model/PolicyTypes.ts'

const SHORT_LIMIT = 3

/** Beschreibt einen Provider als ganzen Satz und als Kurzform für Listen. */
export function describeProvider(args: {provider: ProviderDef}): {sentence: string; short: string} {
  const {provider} = args
  const params = provider.params ?? []
  if (params.length === 0) {
    return {
      sentence: `${provider.negation === true ? 'Trifft nicht zu' : 'Trifft zu'} laut ${provider.className}`,
      short: provider.className,
    }
  }
  const render = (limit: number): string =>
    params
      .map((p) => {
        if (p.values.length === 0) {
          return p.name
        }
        const shown = p.values.slice(0, limit).join(', ')
        return `${p.name} ∈ ${p.values.length > limit ? `${shown}, …` : shown}`
      })
      .join(' und ')
  return {
    sentence: `${provider.negation === true ? 'Trifft nicht zu' : 'Trifft zu'}, wenn ${render(Infinity)}`,
    short: render(SHORT_LIMIT),
  }
}
