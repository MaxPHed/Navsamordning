import os


class Config:
    DEBUG = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY')

    # Configure Postgres database based on connection string of the libpq Keyword/Value form
    # https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
    conn_str = os.environ.get('AZURE_POSTGRESQL_CONNECTIONSTRING')
    if conn_str:
        conn_str_params = {pair.split('=')[0]: pair.split('=')[1] for pair in conn_str.split(' ')}
        SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg2://{dbuser}:{dbpass}@{dbhost}/{dbname}'.format(
            dbuser=conn_str_params['user'],
            dbpass=conn_str_params['password'],
            dbhost=conn_str_params['host'],
            dbname=conn_str_params['dbname']
        )
    else:
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI')
