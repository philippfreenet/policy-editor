/** Kennung eines Tabs. */
export type TabId = 'channels' | 'providers' | 'rights'

/** Ausgewählter Eintrag; index ist null, wenn nur der Tab gemeint ist. */
export interface Selection {
  index: number | null
  tab: TabId
}
