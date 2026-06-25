"""
app.py
Flask web application for the Movie Recommendation System.

Routes:
  GET  /                  -> renders the main page
  GET  /api/movies        -> returns all movies (list of dicts) as JSON
  GET  /api/genres        -> returns list of unique genres
  POST /api/recommend     -> accepts preferences dict, returns ranked movie list
  GET  /api/favorites     -> returns saved favorites
  POST /api/favorites     -> adds a movie to favorites (expects {"id": <movie_id>})
  DELETE /api/favorites/<id> -> removes a movie from favorites
"""

from flask import Flask, render_template, request, jsonify
import recommender

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/movies")
def api_movies():
    movies = recommender.load_movies()
    return jsonify(movies)


@app.route("/api/genres")
def api_genres():
    genres = recommender.get_all_genres()
    return jsonify(genres)


@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    data = request.get_json() or {}

    preferences = {
        "genre": data.get("genre", "Any"),
        "min_rating": float(data.get("min_rating", 0)),
        "decade": data.get("decade", "Any"),
    }

    results = recommender.recommend_movies(preferences, top_n=None)
    return jsonify(results)


@app.route("/api/favorites", methods=["GET"])
def api_get_favorites():
    favorites = recommender.load_favorites()
    return jsonify(favorites)


@app.route("/api/favorites", methods=["POST"])
def api_add_favorite():
    data = request.get_json() or {}
    movie_id = data.get("id")
    if movie_id is None:
        return jsonify({"error": "Missing movie id"}), 400

    favorites = recommender.save_favorite(movie_id)
    return jsonify(favorites)


@app.route("/api/favorites/<int:movie_id>", methods=["DELETE"])
def api_remove_favorite(movie_id):
    favorites = recommender.remove_favorite(movie_id)
    return jsonify(favorites)


if __name__ == "__main__":
    app.run(debug=False, port=5000)