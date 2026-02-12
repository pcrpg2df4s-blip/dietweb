import aiosqlite
import json
import logging
from datetime import datetime

DB_PATH = "diet.db"

async def init_database():
    """Initialize the database and create tables if they don't exist."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS food_logs (
                    user_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    food_json TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, date)
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            await db.commit()
            logging.info("✅ Database initialized successfully")
    except Exception as e:
        logging.error(f"❌ Database initialization failed: {e}")
        raise

async def save_food_data(user_id: int, date: str, food_json: str):
    """
    Save or update food data for a specific user and date.
    
    Args:
        user_id: Telegram user ID
        date: Date in YYYY-MM-DD format
        food_json: JSON string containing food data
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT INTO food_logs (user_id, date, food_json, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, date) 
                DO UPDATE SET food_json = ?, updated_at = ?
            """, (user_id, date, food_json, datetime.now().isoformat(), 
                  food_json, datetime.now().isoformat()))
            await db.commit()
            logging.info(f"✅ Saved food data for user {user_id}, date {date}")
            return True
    except Exception as e:
        logging.error(f"❌ Failed to save food data: {e}")
        return False

async def get_food_data(user_id: int, date: str):
    """
    Retrieve food data for a specific user and date.
    
    Args:
        user_id: Telegram user ID
        date: Date in YYYY-MM-DD format
        
    Returns:
        dict: Food data or None if not found
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT food_json FROM food_logs WHERE user_id = ? AND date = ?",
                (user_id, date)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return json.loads(row['food_json'])
                return None
    except Exception as e:
        logging.error(f"❌ Failed to get food data: {e}")
        return None

async def get_all_food_data(user_id: int):
    """
    Retrieve all food data for a specific user.
    
    Args:
        user_id: Telegram user ID
        
    Returns:
        dict: Dictionary with dates as keys and food data as values
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT date, food_json FROM food_logs WHERE user_id = ? ORDER BY date DESC",
                (user_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                result = {}
                for row in rows:
                    result[row['date']] = json.loads(row['food_json'])
                return result
    except Exception as e:
        logging.error(f"❌ Failed to get all food data: {e}")
        return {}

async def add_user(user_id: int):
    """
    Add a new user to the database if they don't exist.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT OR IGNORE INTO users (user_id) VALUES (?)",
                (user_id,)
            )
            await db.commit()
            logging.info(f"✅ User {user_id} handled (added or already exists)")
            return True
    except Exception as e:
        logging.error(f"❌ Failed to add user: {e}")
        return False

async def get_all_users():
    """
    Retrieve all user IDs from the database.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT user_id FROM users") as cursor:
                rows = await cursor.fetchall()
                return [row[0] for row in rows]
    except Exception as e:
        logging.error(f"❌ Failed to get all users: {e}")
        return []

async def get_users_count():
    """
    Retrieve the count of users in the database.
    """
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT COUNT(*) FROM users") as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0
    except Exception as e:
        logging.error(f"❌ Failed to get users count: {e}")
        return 0
