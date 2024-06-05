from app import db
from datetime import datetime, timedelta
from math import radians, cos, sin, sqrt, atan2
import json
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)  # Lagras hashas lösenord

    routes = db.relationship('Route', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }


class Route(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(10), nullable=False)
    time = db.Column(db.String(5), nullable=False)
    callsign = db.Column(db.String(50), nullable=False)
    units = db.Column(db.Integer, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    start = db.Column(db.String(4), nullable=False)
    landing = db.Column(db.String(4), nullable=False)
    landing_time = db.Column(db.String(5), nullable=True)  # Ny kolumn för landningstid
    waypoints = db.relationship('Waypoint', backref='route', lazy=True, cascade="all, delete-orphan")
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'time': self.time,
            'callsign': self.callsign,
            'units': self.units,
            'phone': self.phone,
            'start': self.start,
            'landing': self.landing,
            'landing_time': self.landing_time,
            'waypoints': [wp.to_dict() for wp in self.waypoints],
            'user_id': self.user_id
        }

    def haversine(self, lon1, lat1, lon2, lat2):
        R = 6371.0  # Jordens radie i km

        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])

        dlon = lon2 - lon1
        dlat = lat2 - lat1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c

        return distance

    def calculate_times(self):

        with open('separationsverktyg/static/airbases.json', 'r') as file:
            airbases = json.load(file)
        start_time = datetime.strptime(self.time, "%H:%M")
        previous_time = start_time

        # Hämta start- och landningsbasens koordinater
        start_airbase = next((base for base in airbases if base['ICAO'] == self.start), None)
        landing_airbase = next((base for base in airbases if base['ICAO'] == self.landing), None)

        previous_lat = start_airbase['latitude'] if start_airbase else None
        previous_long = start_airbase['longitude'] if start_airbase else None

        for wp in self.waypoints:
            if previous_lat is not None and previous_long is not None:
                distance = self.haversine(previous_long, previous_lat, wp.long, wp.lat)
                print(distance)
                wp.distance_from_last_wp = distance
                speed = wp.speed if wp.speed is not None else 300.0  # Standardhastighet om ingen hastighet är angiven
                print(speed)
                time_from_last_wp = timedelta(hours=distance / wp.speed)
                wp.time_from_last_wp = str(time_from_last_wp)
                wp.time_at_waypoint = (previous_time + time_from_last_wp).strftime("%H:%M")
                previous_time = datetime.strptime(wp.time_at_waypoint, "%H:%M")
            previous_lat = wp.lat
            previous_long = wp.long

        if self.waypoints:
            landing_time = previous_time + timedelta(
                hours=self.waypoints[-1].distance_from_last_wp / (self.waypoints[-1].speed or 300.0))
            self.landing_time = landing_time.strftime("%H:%M")


class Waypoint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    long = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, nullable=True, default=300.0)
    altitude = db.Column(db.Float, nullable=True)
    route_id = db.Column(db.Integer, db.ForeignKey('route.id'), nullable=False)
    distance_from_last_wp = db.Column(db.Float, nullable=True)
    time_from_last_wp = db.Column(db.String(5), nullable=True)
    time_at_waypoint = db.Column(db.String(5), nullable=True)

    def __init__(self, **kwargs):
        super(Waypoint, self).__init__(**kwargs)
        if self.speed is None:
            self.speed = 300

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'lat': self.lat,
            'long': self.long,
            'speed': self.speed,
            'altitude': self.altitude,
            'time_at_waypoint': self.time_at_waypoint,
            'distance_from_last_wp': self.distance_from_last_wp,
            'route_id': self.route_id
        }
