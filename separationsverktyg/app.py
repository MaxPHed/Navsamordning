import os
import sys
from flask import Flask, request, jsonify, render_template, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from functools import wraps

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__, template_folder='static/templates')

    # Load configuration based on environment
    if 'WEBSITE_HOSTNAME' not in os.environ:
        print("Loading config.development and environment variables from .env file.")
        app.config.from_object('config.development.Config')
    else:
        print("Loading config.production.")
        app.config.from_object('config.production.Config')

    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        from .models import Route, Waypoint, User
        db.create_all()

    @app.route('/')
    def index():
        return render_template('index.html')

    def login_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Login reequired'}), 401
            return f(*args, **kwargs)

        return decorated_function

    # TODO App route register user here

    @app.route('/login', methods=['POST'])
    def login():
        try:
            session['user_id'] = 1  # Hårdkodad användar-ID
            return jsonify({'message': 'Logged in successfully'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        # data = request.get_json()
        # username = data['username']
        # password = data['password']

        # user = User.query.filter_by(username=username).first()

        # if user is None or not user.check_password(password):

    #     return jsonify({'message': 'Logged in successfully'}), 200

    @app.route('/routes', methods=['GET', 'POST'])
    @login_required
    def manage_routes():
        user_id = session['user_id']

        if request.method == 'GET':
            routes = Route.query.all()  # Returerar alla routes
            return jsonify([route.to_dict() for route in routes])

        if request.method == 'POST':
            data = request.get_json()
            new_route = Route(
                date=data['date'],
                time=data['time'],
                callsign=data['callsign'],
                units=data['units'],
                phone=data['phone'],
                start=data['start'],
                landing=data['landing'],
                user_id=user_id
            )
            db.session.add(new_route)
            db.session.commit()

            waypoints_data = data.get('waypoints', [])
            for wp_data in waypoints_data:
                new_wp = Waypoint(
                    name=wp_data['name'],
                    lat=wp_data['lat'],
                    long=wp_data['long'],
                    speed=wp_data.get('speed'),
                    altitude=wp_data.get('altitude'),
                    route_id=new_route.id
                )
                db.session.add(new_wp)
            db.session.commit()

            new_route.calculate_times()
            db.session.commit()

            return jsonify(new_route.to_dict()), 201

    @app.route('/routes/<int:id>', methods=['PUT', 'DELETE'])
    def update_delete_route(id):
        route = Route.query.get_or_404(id)
        if request.method == 'PUT':
            data = request.get_json()
            route.date = data.get('date', route.date)
            route.time = data.get('time', route.time)
            route.callsign = data.get('callsign', route.callsign)
            route.units = data.get('units', route.units)
            route.phone = data.get('phone', route.phone)
            route.start = data.get('start', route.start)
            route.landing = data.get('landing', route.landing)
            db.session.commit()
            return jsonify(route.to_dict())

        if request.method == 'DELETE':
            db.session.delete(route)
            db.session.commit()
            return '', 204

    @app.route('/waypoints/<int:id>', methods=['PUT', 'DELETE'])
    def update_delete_waypoint(id):
        wp = Waypoint.query.get_or_404(id)
        if request.method == 'PUT':
            data = request.get_json()
            wp.name = data.get('name', wp.name)
            wp.lat = data.get('lat', wp.lat)
            wp.long = data.get('long', wp.long)
            wp.speed = data.get('speed', wp.speed)
            wp.altitude = data.get('altitude', wp.altitude)
            db.session.commit()
            return jsonify(wp.to_dict())

        if request.method == 'DELETE':
            db.session.delete(wp)
            db.session.commit()
            return '', 204

    return app
