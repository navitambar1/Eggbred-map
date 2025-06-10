from flask import Flask, request, jsonify, render_template
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='root',
    database='eggbred$newDB'
)
cursor = conn.cursor(dictionary=True)


def get_db_connection():
    """Create and return a database connection"""
    try:
        mydb = mysql.connector.connect(
            host="localhost",
            user="root",
            password="root",
            database="eggbred$newDB"
        )
        print("Connection successfull")
        return mydb
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None
# cursor = get_db_connection()
def init_database():
    """Initialize the database and create tables if they don't exist"""
    try:
        
        # Now connect to the database and create tables
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Create newsletters table
            create_table_query = """
            CREATE TABLE IF NOT EXISTS newsletters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                year INT NOT NULL,
                month VARCHAR(20) NOT NULL,
                day INT NOT NULL,
                url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_year (year),
                INDEX idx_month (month),
                UNIQUE KEY unique_date (year, month, day)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_table_query)
            connection.commit()
            cursor.close()
            connection.close()
            print("Database initialized successfully")
    except Error as e:
        print(f"Error initializing database: {e}")


@app.route('/')
def home():
    """Serve the main newsletter page"""
    return render_template("newsletter.html")

@app.route('/api/newsletters', methods=['GET'])
def get_newsletters():
    cursor.execute("SELECT * FROM newsletters ORDER BY year DESC, month, day")
    rows = cursor.fetchall()
    result = {}
    for row in rows:
        year = str(row['year'])
        if year not in result:
            result[year] = []
        result[year].append({
            'id': row['id'],
            'month': row['month'],
            'day': row['day'],
            'url': row['url']
        })
    return jsonify(result)

# Add a newsletter
@app.route('/api/newsletters', methods=['POST'])
def add_newsletter():
    data = request.get_json()
    query = """
        INSERT INTO newsletters (year, month, day, url)
        VALUES (%s, %s, %s, %s)
    """
    values = (data['year'], data['month'], data['day'], data['url'])
    try:
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Newsletter added'}), 201
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 400

# Update a newsletter
@app.route('/api/newsletters/<int:id>', methods=['PUT'])
def update_newsletter(id):
    data = request.get_json()
    query = """
        UPDATE newsletters
        SET year = %s, month = %s, day = %s, url = %s
        WHERE id = %s
    """
    values = (data['year'], data['month'], data['day'], data['url'], id)
    try:
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'message': 'Newsletter updated'})
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 400

# Delete a newsletter
@app.route('/api/newsletters/<int:id>', methods=['DELETE'])
def delete_newsletter(id):
    try:
        cursor.execute("DELETE FROM newsletters WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Newsletter deleted'})
    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 400

# Add a new year (no database insert, but required to structure the frontend)
@app.route('/api/years', methods=['POST'])
def add_year():
    data = request.get_json()
    year = data.get('year')
    if not year:
        return jsonify({'error': 'Year is required'}), 400
    # No DB insert needed unless you want to manage years separately
    return jsonify({'message': f'Year {year} added'}), 201
if __name__ == "__main__":
    app.run(host='localhost', port=5000, debug=True)