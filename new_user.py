from app import db, create_app
from models import User

app = create_app()
app.app_context().push()

new_user = User(username="Max", email="max@max.com")
new_user.set_password('password')
db.session.add(new_user)
db.session.commit()
