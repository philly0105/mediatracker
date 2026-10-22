// DorfMovies UI-kit sample data. Poster paths are TMDB; components fall back to
// a tinted title well if any image fails to load.
window.DORF_DATA = (function () {
  const IMG = 'https://image.tmdb.org/t/p/w500';
  const titles = [
    { id: 1, title: 'Dune: Part Two', year: 2024, type: 'movie', poster: IMG + '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', rating: 4.5, tmdb: 8.2, genres: ['Sci-Fi', 'Adventure'], runtime: 166, director: 'Denis Villeneuve', review: 'Operatic, overwhelming, and the best blockbuster filmmaking in years.', watched: '2026-06-12' },
    { id: 2, title: 'Oppenheimer', year: 2023, type: 'movie', poster: IMG + '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', rating: 4.5, tmdb: 8.1, genres: ['Drama', 'History'], runtime: 181, director: 'Christopher Nolan', review: 'A towering, relentless character study.', watched: '2026-06-09' },
    { id: 3, title: 'Poor Things', year: 2023, type: 'movie', poster: IMG + '/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg', rating: 4, tmdb: 7.8, genres: ['Comedy', 'Romance'], runtime: 141, director: 'Yorgos Lanthimos', review: 'Gloriously strange and fearless.', watched: '2026-06-03' },
    { id: 4, title: 'Past Lives', year: 2023, type: 'movie', poster: IMG + '/rKcXP15JNQfNAFgKQDuUbZ4pBL.jpg', rating: 5, tmdb: 7.9, genres: ['Romance', 'Drama'], runtime: 105, director: 'Celine Song', review: 'Quietly devastating. The ending wrecked me.', watched: '2026-05-28' },
    { id: 5, title: 'The Zone of Interest', year: 2023, type: 'movie', poster: IMG + '/hUu9zyZmDd8VZegKi1iK1Vk0eL6.jpg', rating: 4.5, tmdb: 7.4, genres: ['Drama', 'War'], runtime: 105, director: 'Jonathan Glazer', review: 'Chilling in the most banal, unforgettable way.', watched: '2026-05-20' },
    { id: 6, title: 'Severance', year: 2022, type: 'show', poster: IMG + '/lFf6LLrQjYldcZItzOkGmMMigP7.jpg', rating: 5, tmdb: 8.7, genres: ['Sci-Fi', 'Thriller'], runtime: 50, director: 'Dan Erickson', review: 'Hypnotic. Season two stuck the landing.', watched: '2026-06-08' },
    { id: 7, title: 'Shogun', year: 2024, type: 'show', poster: IMG + '/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg', rating: 4.5, tmdb: 8.6, genres: ['Drama', 'History'], runtime: 60, director: 'Justin Marks', review: 'Sumptuous and patient. A masterclass.', watched: '2026-05-31' },
    { id: 8, title: 'The Bear', year: 2022, type: 'show', poster: IMG + '/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg', rating: 4, tmdb: 8.4, genres: ['Comedy', 'Drama'], runtime: 30, director: 'Christopher Storer', review: 'Anxiety as television. I mean that as praise.', watched: '2026-05-15' },
  ];

  const watchlist = [
    { id: 9, title: 'Challengers', year: 2024, type: 'movie', poster: IMG + '/H6vke7zGiuLsz4v4RPeReb9rsv.jpg', tmdb: 7.1, genres: ['Drama', 'Romance'], priority: 'must_watch' },
    { id: 10, title: 'Nosferatu', year: 2024, type: 'movie', poster: IMG + '/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg', tmdb: 6.8, genres: ['Horror'], priority: 'must_watch' },
    { id: 11, title: 'Fallout', year: 2024, type: 'show', poster: IMG + '/AnsSKR9LuK0T9bAGV5Onp4y50R5.jpg', tmdb: 8.3, genres: ['Sci-Fi'], priority: 'want_to_watch' },
    { id: 12, title: 'Anora', year: 2024, type: 'movie', poster: IMG + '/qXOQv7bgQ8z8WD4yk5pXJ8vHqz.jpg', tmdb: 7.0, genres: ['Comedy', 'Drama'], priority: 'someday' },
  ];

  return {
    watched: titles,
    watchlist,
    all: titles.concat(watchlist),
    stats: { thisYear: 42, mustWatch: 2, movies: 31, shows: 11, episodes: 214, hours: 388 },
  };
})();
