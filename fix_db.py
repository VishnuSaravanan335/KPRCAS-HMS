import json
import os

with open('data.json', 'r') as f:
    data = json.load(f)

users = data.get('users', [])
usernames = [u['username'] for u in users]

# Add missing users
if 'pixesclub' not in usernames:
    users.append({"id": "u6", "name": "Pixes Club Lead",   "username": "pixesclub",    "password": "7f1a5869fff17fba42a18a6b3331e800450a7318a9436b740349454cb1820beb",        "role": "pixesclub",    "email": ""})
if 'fineartsclub' not in usernames:
    users.append({"id": "u7", "name": "Fine Arts Lead",    "username": "fineartsclub", "password": "e5ea9965232d1d5b943c52b34b4c3977e01960349b80ea3856a2f0f0af7d5b27",     "role": "fineartsclub", "email": ""})

# update stock and add missing inventory
inventory = data.get('inventory', [])
inv_ids = [i['id'] for i in inventory]

# Club Inventory Defaults
club_items = [
    {"id": "px01", "name": "DSLR Camera",        "dept": "pixesclub",    "stock_qty": 5,   "in_use": 0},
    {"id": "px02", "name": "Go Pro Camera",      "dept": "pixesclub",    "stock_qty": 3,   "in_use": 0},
    {"id": "px03", "name": "Drone",              "dept": "pixesclub",    "stock_qty": 2,   "in_use": 0},
    {"id": "px04", "name": "Camera Tripod",      "dept": "pixesclub",    "stock_qty": 8,   "in_use": 0},
    {"id": "px05", "name": "Photo Printer",      "dept": "pixesclub",    "stock_qty": 2,   "in_use": 0},
    {"id": "fa01", "name": "Backdrop Stand",     "dept": "fineartsclub", "stock_qty": 4,   "in_use": 0},
    {"id": "fa02", "name": "Costume Set",        "dept": "fineartsclub", "stock_qty": 10,  "in_use": 0},
    {"id": "fa03", "name": "Stage Lights",       "dept": "fineartsclub", "stock_qty": 12,  "in_use": 0},
    {"id": "fa04", "name": "Sound System",       "dept": "fineartsclub", "stock_qty": 3,   "in_use": 0},
    {"id": "fa05", "name": "Dance Props Set",    "dept": "fineartsclub", "stock_qty": 5,   "in_use": 0},
]

for ci in club_items:
    if ci['id'] not in inv_ids:
        inventory.append(ci)

for item in inventory:
    if item['dept'] in ['it', 'reception']:
        item['stock_qty'] = 9999

data['users'] = users
data['inventory'] = inventory

with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("DB Fixed: Users and Club Inventory updated.")
