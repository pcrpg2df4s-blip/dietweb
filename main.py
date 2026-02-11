import asyncio
import logging
import os
import base64
import json
import random
from aiohttp import web
import google.generativeai as genai
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# 1. Загружаем переменные из .env
load_dotenv()

# 2. Получаем настройки
BOT_TOKEN = os.getenv("BOT_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
BASE_WEB_APP_URL = os.getenv("WEB_APP_URL", "https://pcrpg2df4s-blip.github.io/dietweb/")

# --- БЛОК ПРОВЕРКИ ---
print("-" * 50)
if GOOGLE_API_KEY:
    print(f"✅ Google API Key найден! (Начинается на: {GOOGLE_API_KEY[:5]}...)")
    WEB_APP_URL = f"{BASE_WEB_APP_URL}?api_key={GOOGLE_API_KEY}"
else:
    print("❌ ОШИБКА: Ключ не найден!")
    WEB_APP_URL = BASE_WEB_APP_URL
print(f"🔗 Ссылка: {WEB_APP_URL}")
print("-" * 50)
# ---------------------

if not BOT_TOKEN:
    print("💀 ОШИБКА: Нет BOT_TOKEN в .env")
    exit(1)

# Настройка Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- УМНЫЕ НАПОМИНАНИЯ ---
USERS_FILE = "users.json"

# Массивы сообщений для разных приемов пищи
BREAKFAST_MESSAGES = [
    "Доброе утро! ☀️ Не забудь позавтракать, это как сотый бенз на весь день!",
    "Дружище, ты уже поел? Завтрак сам себя в дневник не запишет 🍳",
    "Время подкрепиться! Начинаем день чётко 💪"
]

LUNCH_MESSAGES = [
    "Как насчет обеда, дружок? 🍲 Не пропускай, твоей машине нужны силы.",
    "Пора сделать паузу и похавать. Что у нас сегодня в холодосе?",
    "Напоминаю: голодный зверь работает хуже. Пора сожрать че то!"
]

DINNER_MESSAGES = [
    "Дело к вечеру! Не забудь записать ужин в дневник 📝",
    "Псс... Уже ужинал? Давай подведем итоги дня по калориям.",
    "Время восстановиться после тяжелого дня. Приятного аппетита! 🥗"
]

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    # Сохраняем user_id для напоминаний
    save_user_id(message.from_user.id)
    
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔥 Открыть Web Diet", web_app=WebAppInfo(url=WEB_APP_URL))]],
        resize_keyboard=True
    )
    await message.answer("Привет! Нажми кнопку, что бы открыть приложение 👇", reply_markup=kb)

# --- Функции для работы с пользователями ---

def load_users():
    """Загружает список user_id из файла"""
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_user_id(user_id):
    """Сохраняет user_id в файл (без дубликатов)"""
    users = load_users()
    if user_id not in users:
        users.append(user_id)
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f)
        print(f"✅ Новый пользователь сохранен: {user_id}")

async def send_meal_reminder(meal_type):
    """Отправляет напоминание о приеме пищи всем пользователям"""
    users = load_users()
    
    # Выбираем случайное сообщение в зависимости от типа приема пищи
    if meal_type == "breakfast":
        message = random.choice(BREAKFAST_MESSAGES)
    elif meal_type == "lunch":
        message = random.choice(LUNCH_MESSAGES)
    elif meal_type == "dinner":
        message = random.choice(DINNER_MESSAGES)
    else:
        return
    
    # Создаем inline-кнопку для быстрого перехода к записи еды
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📝 Записать прием пищи",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )]
    ])
    
    print(f"📢 Отправка {meal_type} напоминаний для {len(users)} пользователей...")
    
    # Отправляем сообщение каждому пользователю
    for user_id in users:
        try:
            await bot.send_message(user_id, message, reply_markup=keyboard)
        except Exception as e:
            print(f"❌ Ошибка отправки пользователю {user_id}: {e}")

# --- Web Server (aiohttp) ---

async def handle_analyze(request):
    try:
        data = await request.json()
        image_base64 = data.get("image")
        text_query = data.get("text") or data.get("query")
        mime_type = data.get("mime_type", "image/jpeg")
        prompt = data.get("prompt", "Analyze this food. Return JSON: {\"product_name\": \"...\", \"calories\": 0, \"protein\": 0, \"carbs\": 0, \"fats\": 0}")

        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')

        if image_base64:
            # Декодируем картинку
            image_data = base64.b64decode(image_base64)
            # Вызываем Gemini с картинкой
            response = model.generate_content([
                prompt,
                {'mime_type': mime_type, 'data': image_data}
            ])
        elif text_query:
            # Вызываем Gemini только с текстом
            full_prompt = f"Определи КБЖУ для продукта: {text_query}. {prompt}"
            response = model.generate_content(full_prompt)
        else:
            return web.json_response({"error": "No image or text data provided"}, status=400, headers={"Access-Control-Allow-Origin": "*"})

        # Парсим JSON из ответа Gemini
        text = response.text
        # Очистка от markdown блоков если есть
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        try:
            result = json.loads(text)
        except:
            # Fallback if Gemini fails to return clean JSON
            result = {"raw_text": response.text}

        return web.json_response(result, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        })

    except Exception as e:
        logging.error(f"Error in /api/analyze: {e}")
        return web.json_response({"error": str(e)}, status=500, headers={"Access-Control-Allow-Origin": "*"})

async def handle_options(request):
    return web.Response(headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "3600",
    })

async def init_web():
    app = web.Application(client_max_size=20*1024*1024)
    app.router.add_post('/api/analyze', handle_analyze)
    app.router.add_options('/api/analyze', handle_options)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print("🚀 Web server started on port 8080")

def schedule_reminders():
    """Настраивает расписание для умных напоминаний"""
    scheduler = AsyncIOScheduler()
    
    # Завтрак: 09:00 - 10:00 (выбираем середину - 09:30)
    scheduler.add_job(
        send_meal_reminder,
        CronTrigger(hour=9, minute=30),
        args=["breakfast"],
        id="breakfast_reminder"
    )
    
    # Обед: 14:00 - 15:00 (выбираем середину - 14:30)
    scheduler.add_job(
        send_meal_reminder,
        CronTrigger(hour=14, minute=30),
        args=["lunch"],
        id="lunch_reminder"
    )
    
    # Ужин: 19:00 - 20:00 (выбираем середину - 19:30)
    scheduler.add_job(
        send_meal_reminder,
        CronTrigger(hour=19, minute=30),
        args=["dinner"],
        id="dinner_reminder"
    )
    
    scheduler.start()
    print("⏰ Умные напоминания настроены!")
    print("   🍳 Завтрак: 09:30")
    print("   🍲 Обед: 14:30")
    print("   🥗 Ужин: 19:30")
    
    return scheduler

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Настраиваем расписание напоминаний
    scheduler = schedule_reminders()
    
    try:
        # Запускаем и бота, и веб-сервер
        await asyncio.gather(
            dp.start_polling(bot),
            init_web()
        )
    finally:
        # Останавливаем scheduler при завершении
        scheduler.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass