import type {PolicyFile} from '../model/PolicyTypes.ts'

/** Sortierte, eindeutige Parameternamen der anderen Provider derselben Klasse (der Provider am Index `excludeProvider` zählt nicht). */
export function paramNameSuggestions(args: {
  className: string
  excludeProvider: number | null
  policy: PolicyFile
}): string[] {
  const names = new Set<string>()
  args.policy.providers.forEach((provider, index) => {
    if (index === args.excludeProvider || provider.className !== args.className) {
      return
    }
    for (const param of provider.params ?? []) {
      names.add(param.name)
    }
  })
  return [...names].sort()
}
