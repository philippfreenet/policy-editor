/** Liefert `base`, falls frei, sonst `base_2`, `base_3`, … – den ersten Namen, der nicht in `taken` steht. */
export function uniqueName(args: {base: string; taken: readonly string[]}): string {
  if (!args.taken.includes(args.base)) {
    return args.base
  }
  let n = 2
  while (args.taken.includes(`${args.base}_${n}`)) {
    n += 1
  }
  return `${args.base}_${n}`
}
