/** Zeichen, die `Character.isWhitespace` in Java als Leerraum wertet (ohne die geschützten Leerzeichen U+00A0, U+2007, U+202F). */
const WHITESPACE = /^[\u0009-\u000D\u001C-\u0020\u1680\u2000-\u2006\u2008-\u200A\u2028\u2029\u205F\u3000]*$/

/** Prüft, ob ein Text leer ist oder nur aus Leerraum besteht (entspricht `String.isBlank` im Service). */
export function isBlank(args: {value: string}): boolean {
  return WHITESPACE.test(args.value)
}
