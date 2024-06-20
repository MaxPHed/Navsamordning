import os


class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg2://{dbuser}:{dbpass}@{dbhost}/{dbname}'.format(
        dbuser=os.environ['DBUSER'],
        dbpass=os.environ['DBPASS'],
        dbhost=os.environ['DBHOST'],
        dbname=os.environ['DBNAME']
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key')
