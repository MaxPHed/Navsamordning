import os
from flask import Flask, redirect, render_template, request, send_from_directory, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from applicationFolder.extensions import db, migrate
from routes import bp as main_bp

load_dotenv()
app = Flask(__name__, template_folder='templates', static_folder='static')

if 'WEBSITE_HOSTNAME' not in os.environ:
    print("Loading config.development and environment variables from .env file.")
    app.config.from_object('applicationFolder.development.Config')
else:
    print("Loading config.production.")
    app.config.from_object('applicationFolder.production')

print(f"SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")

app.config.update(
    SQLALCHEMY_DATABASE_URI=app.config.get('SQLALCHEMY_DATABASE_URI'),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
)

db.init_app(app)
migrate.init_app(app, db)

app.register_blueprint(main_bp)

if __name__ == '__main__':
    app.run()
