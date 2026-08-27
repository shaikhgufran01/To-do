from flask import Blueprint, request, jsonify, render_template, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from .models import db, Todo, User

main = Blueprint("main", __name__)

# Home
@main.route("/")
def home():
    return render_template("index.html")

# ============================
# AUTH ROUTES
# ============================

@main.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {"error": "Username and password required"}, 400

    if User.query.filter_by(username=username).first():
        return {"error": "Username already exists"}, 400

    hashed_password = generate_password_hash(password)
    user = User(username=username, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    session["username"] = user.username
    return {"message": "Registered successfully", "user": {"id": user.id, "username": user.username}}, 201

@main.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        session["user_id"] = user.id
        session["username"] = user.username
        return {"message": "Logged in", "user": {"id": user.id, "username": user.username}}
    
    return {"error": "Invalid credentials"}, 401

@main.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return {"message": "Logged out"}

@main.route("/auth/me", methods=["GET"])
def me():
    if "user_id" in session:
        return {"user": {"id": session["user_id"], "username": session.get("username")}}
    return {"user": None}, 401

@main.route("/auth/change-password", methods=["POST"])
def change_password():
    if "user_id" not in session:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return {"error": "Both current and new password are required"}, 400

    if len(new_password) < 4:
        return {"error": "New password must be at least 4 characters"}, 400

    user = User.query.get(session["user_id"])
    if not check_password_hash(user.password_hash, current_password):
        return {"error": "Current password is incorrect"}, 401

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return {"message": "Password changed successfully"}

# ============================
# TODO ROUTES
# ============================

# Get all todos
@main.route("/todos", methods=["GET"])
def get_todos():
    if "user_id" not in session:
        return {"error": "Unauthorized"}, 401

    todos = Todo.query.filter_by(user_id=session["user_id"]).all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "status": t.status,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "category": t.category,
            "priority": t.priority
        } for t in todos
    ]

# Add todo
@main.route("/todos", methods=["POST"])
def add_todo():
    if "user_id" not in session:
        return {"error": "Unauthorized"}, 401

    data = request.get_json()

    due_date = None
    if data.get("due_date"):
        due_date = datetime.fromisoformat(data["due_date"])

    todo = Todo(
        name=data["name"],
        description=data.get("description"),
        status=data.get("status", "pending"),
        due_date=due_date,
        category=data.get("category", "General"),
        priority=data.get("priority", "Medium"),
        user_id=session["user_id"]
    )

    db.session.add(todo)
    db.session.commit()

    return {"message": "Todo added"}, 201

# Update todo
@main.route("/todos/<int:id>", methods=["PUT"])
def update_todo(id):
    if "user_id" not in session:
        return {"error": "Unauthorized"}, 401

    todo = Todo.query.filter_by(id=id, user_id=session["user_id"]).first_or_404()
    data = request.get_json()

    todo.name = data.get("name", todo.name)
    todo.description = data.get("description", todo.description)
    todo.status = data.get("status", todo.status)
    todo.category = data.get("category", todo.category)
    todo.priority = data.get("priority", todo.priority)

    if data.get("due_date"):
        todo.due_date = datetime.fromisoformat(data["due_date"])

    db.session.commit()
    return {"message": "Updated"}

# Delete todo
@main.route("/todos/<int:id>", methods=["DELETE"])
def delete_todo(id):
    if "user_id" not in session:
        return {"error": "Unauthorized"}, 401

    todo = Todo.query.filter_by(id=id, user_id=session["user_id"]).first_or_404()

    db.session.delete(todo)
    db.session.commit()

    return {"message": "Deleted"}

# ============================
# ADMIN ROUTE (view database)
# ============================

@main.route("/admin/data")
def admin_data():
    key = request.args.get("key")
    if key != "bdm2026":
        return {"error": "Forbidden"}, 403

    users = User.query.all()
    todos = Todo.query.all()

    return {
        "users": [
            {"id": u.id, "username": u.username}
            for u in users
        ],
        "todos": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "status": t.status,
                "category": t.category,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "owner": t.user.username
            }
            for t in todos
        ]
    }
