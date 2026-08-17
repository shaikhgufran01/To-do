from flask import Flask
from .database import db
from .config import Config
from .routes import main

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app