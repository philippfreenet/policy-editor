/** Bietet `text` im Browser als Datei zum Speichern an (Blob und temporärer Link). */
export function downloadText(args: {filename: string; text: string}): void {
  const url = URL.createObjectURL(new Blob([args.text], {type: 'application/json;charset=utf-8'}))
  const link = document.createElement('a')
  link.href = url
  link.download = args.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
