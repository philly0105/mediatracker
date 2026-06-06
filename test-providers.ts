import { fetchTmdbDetails } from './lib/tmdb'

async function test() {
  try {
    const res = await fetchTmdbDetails(137113, 'movie')
    console.log(JSON.stringify(res.watch_providers, null, 2))
  } catch (err) {
    console.error(err)
  }
}

test()
