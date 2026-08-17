from .database import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    todos = db.relationship('Todo', backref='user', lazy=True)

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500))
    status = db.Column(db.String(50), default="pending")
    due_date = db.Column(db.DateTime)
    category = db.Column(db.String(50), default="General")
    priority = db.Column(db.String(20), default="Medium")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)