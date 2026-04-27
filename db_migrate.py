import json
import mysql.connector
from mysql.connector import Error
import os

DB_HOST = 'localhost'
DB_USER = 'root'
DB_PASSWORD = 'vishnu@0046'
DB_NAME = 'bookmyhall'

def migrate_data():
    try:
        # Connect to MySQL server without DB name first to create the DB if it doesn't exist
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        cursor.execute(f"USE {DB_NAME}")

        # Drop tables if exist for a fresh migration
        tables_to_drop = [
            "event_requested_items", "event_departments", "events", 
            "inventory", "halls", "users", "settings", "notifications"
        ]
        for t in tables_to_drop:
            cursor.execute(f"DROP TABLE IF EXISTS {t}")

        # Create settings table
        cursor.execute("""
            CREATE TABLE settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value JSON
            )
        """)

        # Create users table
        cursor.execute("""
            CREATE TABLE users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                username VARCHAR(50) UNIQUE,
                password VARCHAR(255),
                role VARCHAR(50),
                email VARCHAR(100)
            )
        """)

        # Create halls table
        cursor.execute("""
            CREATE TABLE halls (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                capacity INT,
                type VARCHAR(50),
                building VARCHAR(100),
                floor VARCHAR(50),
                locked BOOLEAN DEFAULT FALSE,
                image VARCHAR(255)
            )
        """)

        # Create inventory table
        cursor.execute("""
            CREATE TABLE inventory (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                dept VARCHAR(50),
                stock_qty INT,
                in_use INT DEFAULT 0,
                locked BOOLEAN DEFAULT FALSE
            )
        """)

        # Create events table
        cursor.execute("""
            CREATE TABLE events (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(200),
                event_type VARCHAR(100),
                date VARCHAR(20),
                days INT,
                time_slot VARCHAR(100),
                hall_id VARCHAR(255),
                hall_name VARCHAR(255),
                description TEXT,
                agenda_path VARCHAR(255),
                budget_id VARCHAR(50),
                coordinator VARCHAR(100),
                coordinator_phone VARCHAR(20),
                expected_count INT,
                has_intro_video BOOLEAN,
                has_dance BOOLEAN,
                has_photos BOOLEAN,
                has_video BOOLEAN,
                created_by VARCHAR(50),
                created_by_name VARCHAR(100),
                created_at VARCHAR(50),
                principal_decision VARCHAR(20),
                principal_note TEXT,
                cancel_reason TEXT,
                cancelled_by VARCHAR(100),
                cancelled_at VARCHAR(50)
            )
        """)

        # Create event departments table
        cursor.execute("""
            CREATE TABLE event_departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(50),
                school VARCHAR(100),
                department VARCHAR(100),
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        """)

        # Create event requested items table
        cursor.execute("""
            CREATE TABLE event_requested_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(50),
                item_id VARCHAR(50),
                item_name VARCHAR(100),
                dept VARCHAR(50),
                requested_qty INT,
                allocated_qty INT,
                dept_approved BOOLEAN DEFAULT FALSE,
                returned BOOLEAN DEFAULT FALSE,
                dept_rejected BOOLEAN DEFAULT FALSE,
                returned_qty INT DEFAULT 0,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            )
        """)

        # Create notifications table
        cursor.execute("""
            CREATE TABLE notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50),
                title VARCHAR(200),
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Read JSON
        with open('data.json', 'r') as f:
            data = json.load(f)

        # Insert Settings & Hierarchy
        settings = data.get('settings', {})
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s)", 
                       ('portal_locked', json.dumps(settings.get('portal_locked', False))))
        
        hierarchy = data.get('hierarchy', {})
        cursor.execute("INSERT INTO settings (setting_key, setting_value) VALUES (%s, %s)", 
                       ('hierarchy', json.dumps(hierarchy)))

        # Insert Users
        for u in data.get('users', []):
            cursor.execute("""
                INSERT INTO users (id, name, username, password, role, email)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (u['id'], u['name'], u['username'], u['password'], u['role'], u.get('email', '')))

        # Insert Halls
        for h in data.get('halls', []):
            cursor.execute("""
                INSERT INTO halls (id, name, capacity, type, building, floor, locked, image)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (h['id'], h['name'], h.get('capacity', 0), h.get('type', ''), h.get('building', ''), h.get('floor', ''), h.get('locked', False), h.get('image', '')))

        # Insert Inventory
        for i in data.get('inventory', []):
            cursor.execute("""
                INSERT INTO inventory (id, name, dept, stock_qty, in_use, locked)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (i['id'], i['name'], i.get('dept', ''), i.get('stock_qty', 0), i.get('in_use', 0), i.get('locked', False)))

        # Insert Events
        for e in data.get('events', []):
            cursor.execute("""
                INSERT INTO events (
                    id, title, event_type, date, days, time_slot, hall_id, hall_name,
                    description, budget_id, coordinator, coordinator_phone, expected_count,
                    has_intro_video, has_dance, has_photos, has_video,
                    created_by, created_by_name, created_at,
                    principal_decision, principal_note, cancel_reason, cancelled_by, cancelled_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                e['id'], e.get('title', ''), e.get('event_type', ''), e.get('date', ''), e.get('days', 1), e.get('time_slot', ''),
                e.get('hall_id', ''), e.get('hall_name', ''), e.get('description', ''), e.get('budget_id', ''),
                e.get('coordinator', ''), e.get('coordinator_phone', ''), e.get('expected_count', 0),
                e.get('has_intro_video', False), e.get('has_dance', False), e.get('has_photos', False), e.get('has_video', False),
                e.get('created_by', ''), e.get('created_by_name', ''), e.get('created_at', ''),
                e.get('principal_decision', None), e.get('principal_note', ''), e.get('cancel_reason', ''),
                e.get('cancelled_by', ''), e.get('cancelled_at', '')
            ))

            for dep in e.get('departments', []):
                cursor.execute("""
                    INSERT INTO event_departments (event_id, school, department)
                    VALUES (%s, %s, %s)
                """, (e['id'], dep.get('school', ''), dep.get('department', '')))

            for item in e.get('requested_items', []):
                cursor.execute("""
                    INSERT INTO event_requested_items (
                        event_id, item_id, item_name, dept, requested_qty, allocated_qty,
                        dept_approved, returned, dept_rejected, returned_qty
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    e['id'], item.get('item_id', ''), item.get('item_name', ''), item.get('dept', ''),
                    item.get('requested_qty', 0), item.get('allocated_qty', 0),
                    item.get('dept_approved', False), item.get('returned', False),
                    item.get('dept_rejected', False), item.get('returned_qty', 0)
                ))

        conn.commit()
        print("Data migration successful!")
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate_data()
