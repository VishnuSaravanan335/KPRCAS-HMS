import sys, os
sys.path.append(os.getcwd())
import db
try:
    users = db.fetch_all("SELECT * FROM users LIMIT 1")
    print(f"Type: {type(users)}")
    if users:
        print(f"First item type: {type(users[0])}")
        print(f"First item: {users[0]}")
except Exception as e:
    print(f"Error: {e}")
