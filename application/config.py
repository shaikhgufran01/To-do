import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Render provides postgres:// but SQLAlchemy needs postgresql://
    database_url = os.environ.get("DATABASE_URL", "")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = database_url or (
        "sqlite:///" + os.path.join(BASE_DIR, "../instance/app.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get("SECRET_KEY", "c9f2a7e84b3d1056f8e9a4c7d2b5e8f1a3d6c9b2e5f8a1d4c7b0e3f6a9d2c5b8")
