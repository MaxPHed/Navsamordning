from flask import Blueprint, request, jsonify, render_template, session
from functools import wraps
from models import db, User, Route, Waypoint

bp = Blueprint('main', __name__)


@bp.route('/')
def index():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401
    user = User.query.get(user_id)
    return render_template('index.html', user=user.to_dict())


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)

    return decorated_function


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    email = data['email']
    password = data['password']

    if User.query.filter_by(username=username).first() is not None:
        return jsonify({'error': 'Username already exists'}), 400

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201


@bp.route('/login', methods=['POST'])
def login():
    try:
        session['user_id'] = 1  # Hardcoded user ID for testing
        return jsonify({'message': 'Logged in successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/routes', methods=['GET', 'POST'])
@login_required
def manage_routes():
    try:
        user_id = session['user_id']
        user = User.query.get(user_id)

        if request.method == 'GET':
            routes = Route.query.all()
            return jsonify({
                'user': user.to_dict(),
                'routes': [route.to_dict() for route in routes]
            })

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
    except Exception as e:
        db.session.rollback()
        print({'error': str(e)})
        return jsonify({'error': str(e)}), 500


@bp.route('/routes/<int:id>', methods=['PUT', 'DELETE'])
def update_delete_route(id):
    try:
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
    except Exception as e:
        db.session.rollback()
        print({'error': str(e)})
        return jsonify({'error': str(e)}), 500


@bp.route('/waypoints/<int:id>', methods=['PUT', 'DELETE'])
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
