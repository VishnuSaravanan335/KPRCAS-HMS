try:
    import mysql.connector
    from mysql.connector.errors import Error
except ImportError:
    print("CRITICAL ERROR: mysql-connector-python not installed. Run 'pip install mysql-connector-python'")
    # Define dummy Error to prevent further crashes
    class Error(Exception): pass

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'vishnu@0046',
    'database': 'bookmyhall',
    'autocommit': True
}

def get_connection():
    """Returns a MySQL connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def fetch_all(query, params=None):
    """Executes a query and returns a list of dictionaries."""
    conn = get_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        results = cursor.fetchall()
        return results
    except Error as e:
        print(f"Error executing query {query}: {e}")
        return []
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def fetch_one(query, params=None):
    """Executes a query and returns a single dictionary or None."""
    conn = get_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        result = cursor.fetchone()
        return result
    except Error as e:
        print(f"Error executing query {query}: {e}")
        return None
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def execute_query(query, params=None):
    """Executes an INSERT/UPDATE/DELETE query and returns the affected row count or last row id."""
    conn = get_connection()
    if not conn:
        return 0
    
    try:
        cursor = conn.cursor()
        cursor.execute(query, params or ())
        conn.commit()
        # Return lastrowid for INSERTs, otherwise rowcount
        return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
    except Error as e:
        print(f"Error executing query {query}: {e}")
        return 0
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
