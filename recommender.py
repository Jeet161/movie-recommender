"""
recommender.py
Core recommendation logic for the Movie Recommendation System.

Concepts used (for course requirements):
- Lists: storing movies, genres, filtered results
- Dictionaries: each movie is a dict; user preference is a dict
- File handling: load_movies() and favorites read/write
- Loops & conditionals: scoring and filtering logic
"""

import json
import os

MOVIES_FILE = os.path.join(os.path.dirname(__file__), "movies.json")
FAVORITES_FILE = os.path.join(os.path.dirname(__file__), "favorites.json")


def load_movies():
    """Read the movie database from movies.json (file handling)."""
    with open(MOVIES_FILE, "r", encoding="utf-8") as f:
        movies = json.load(f)   # movies is a list of dictionaries
    return movies


def get_all_genres():
    """Return a sorted list of unique genres found in the dataset."""
    movies = load_movies()
    genres = []  # list
    for movie in movies:
        if movie["genre"] not in genres:
            genres.append(movie["genre"])
    return sorted(genres)


def score_movie(movie, preferences):
    """
    Calculate a match score (0-100) for a single movie dict
    based on a preferences dict supplied by the user.

    preferences = {
        "genre": "Action" or "Any",
        "min_rating": 7.0,
        "decade": 2010 (or None for any),
    }
    """
    score = 0

    # Genre match is the strongest signal
    if preferences.get("genre") and preferences["genre"] != "Any":
        if movie["genre"].lower() == preferences["genre"].lower():
            score += 50
    else:
        score += 20  # no genre preference, give a baseline

    # Rating contributes proportionally
    if movie["rating"] >= preferences.get("min_rating", 0):
        # higher rating, slightly higher bonus (max +30)
        score += min((movie["rating"] - preferences.get("min_rating", 0)) * 6, 30)
    else:
        score -= 20  # below minimum rating, big penalty

    # Decade match
    decade = preferences.get("decade")
    if decade and decade != "Any":
        movie_decade = (movie["year"] // 10) * 10
        if movie_decade == int(decade):
            score += 20

    return round(score, 2)


def recommend_movies(preferences, top_n=None):
    """
    Filter and rank movies based on user preferences dict.
    Returns a list of movie dicts (with an added 'score' key),
    sorted by score descending. If top_n is None, returns all matches.
    """
    movies = load_movies()
    results = []  # list of dicts

    for movie in movies:
        # Hard filter: must meet minimum rating
        if movie["rating"] < preferences.get("min_rating", 0):
            continue

        # Hard filter: must match genre if specified
        if preferences.get("genre") and preferences["genre"] != "Any":
            if movie["genre"].lower() != preferences["genre"].lower():
                continue

        # Hard filter: must match decade if specified
        decade = preferences.get("decade")
        if decade and decade != "Any":
            movie_decade = (movie["year"] // 10) * 10
            if movie_decade != int(decade):
                continue

        scored_movie = dict(movie)  # copy the dict
        scored_movie["score"] = score_movie(movie, preferences)
        results.append(scored_movie)

    # Sort by score (desc), then rating (desc)
    results.sort(key=lambda m: (m["score"], m["rating"]), reverse=True)

    return results[:top_n]


def load_favorites():
    """Read favorites from favorites.json. Create the file if missing."""
    if not os.path.exists(FAVORITES_FILE):
        return []
    with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_favorite(movie_id):
    """Add a movie (by id) to favorites.json (file handling: write)."""
    favorites = load_favorites()
    movies = load_movies()

    # Find the movie dict matching the id
    movie_to_add = None
    for movie in movies:
        if movie["id"] == movie_id:
            movie_to_add = movie
            break

    if movie_to_add is None:
        return favorites  # invalid id, nothing changes

    # Avoid duplicates
    already_saved = any(fav["id"] == movie_id for fav in favorites)
    if not already_saved:
        favorites.append(movie_to_add)
        with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
            json.dump(favorites, f, indent=2)

    return favorites


def remove_favorite(movie_id):
    """Remove a movie (by id) from favorites.json."""
    favorites = load_favorites()
    favorites = [fav for fav in favorites if fav["id"] != movie_id]
    with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
        json.dump(favorites, f, indent=2)
    return favorites