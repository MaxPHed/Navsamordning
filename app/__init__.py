import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__, template_folder='../templates', static_folder='../static')

    if 'WEBSITE_HOSTNAME' not in os.environ:
        print("Loading config.development and environment variables from .env file.")
        app.config.from_object('app.development.Config')
    else:
        print("Loading config.production.")
        app.config.from_object('app.production')

    print(f"SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")

    app.config.update(
        SQLALCHEMY_DATABASE_URI=app.config.get('SQLALCHEMY_DATABASE_URI'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        from . import routes, models
        db.create_all()

    from .routes import bp as main_bp
    app.register_blueprint(main_bp)

    return app
