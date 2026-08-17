import os
from application import create_app

app = create_app()

if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1")
    app.run(debug=debug)