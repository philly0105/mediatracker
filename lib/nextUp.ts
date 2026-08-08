// The subset of a season the next-up scan needs, dropped out so both the
// dashboard and the show page can share one scan without coupling to the full
// season row.
export type NextUpSeason = { id: string; season_number: number; episode_count: number }

// First unwatched episode, scanning by season order then episode number within a
// season. A gap earlier in season 1 always beats progress made later, so a
// skipped episode surfaces before anything further along does.
export function findNextUp(seasons: NextUpSeason[], watchedKeys: Set<string>):
  { season_id: string; season_number: number; episode_number: number } | null {
  for (const season of seasons) {
    if (season.episode_count <= 0) continue
    for (let episode = 1; episode <= season.episode_count; episode++) {
      if (!watchedKeys.has(`${season.id}-${episode}`)) {
        return {
          season_id: season.id,
          season_number: season.season_number,
          episode_number: episode,
        }
      }
    }
  }

  return null
}
