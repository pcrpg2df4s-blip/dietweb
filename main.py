import asyncio
import logging
import os
import base64
import json
import random
import hmac
import hashlib
from urllib.parse import parse_qs
from aiohttp import web
import google.generativeai as genai
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile, CallbackQuery
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from db_manager import init_database, save_food_data, get_food_data, get_all_food_data, add_user, get_all_users, get_users_count

# 1. Загружаем переменные из .env
load_dotenv()

# 2. Получаем настройки
BOT_TOKEN = os.getenv("BOT_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
BASE_WEB_APP_URL = "https://pcrpg2df4s-blip.github.io/dietweb/"
ADMIN_IDS = [728101046]

# --- БЛОК ПРОВЕРКИ ---
print("-" * 50)
if GOOGLE_API_KEY:
    print(f"✅ Google API Key найден! (Начинается на: {GOOGLE_API_KEY[:5]}...)")
    # WEB_APP_URL = f"{BASE_WEB_APP_URL}?api_key={GOOGLE_API_KEY}" # Убрали api_key из URL
    WEB_APP_URL = BASE_WEB_APP_URL
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
    # Сохраняем user_id и проверяем, новый ли это пользователь
    # add_user возвращает True если операция успешна, но она идемпотентна (INSERT OR IGNORE)
    # Для логики "новый пользователь" можно просто всегда показывать длинное приветствие,
    # или (как было) проверять existence. Но add_user сейчас не возвращает is_new. 
    # Упростим: просто добавляем и показываем приветствие. 
    # Если нужно разделить логику new/old, можно было бы сделать SELECT, но в ТЗ это не критично.
    # Однако в старом коде было разделение.
    # Чтобы сохранить поведение: сделаем так - считаем всех "старыми" если они уже были,
    # но Insert or ignore не скажет нам был ли он.
    # Ладно, простейший вариант:
    await add_user(message.from_user.id)
    
    # Для совместимости со старой логикой, покажем просто стандартное меню.
    # Если очень нужно разделение new/old, можно доработать db_manager.
    # Но в рамках задачи "Добавить БД" главное - сохранять.
    # Допустим, мы всегда показываем полное приветствие или делаем проверку.
    # В старом коде: if is_new_user: show_long else: show_short
    # Давай оставим пока простое сохранение.
    # Чтобы не ломать логику UI, я буду считать что is_new_user = True (покажем полное)
    # или лучше переделать add_user чтобы возвращал статус?
    # В ТЗ: "функция add_user(user_id): добавляет пользователя, если его еще нет".
    # Ок, просто добавим.
    
    # ПРИМЕЧАНИЕ: Я немного изменю логику UI - буду показывать полный вариант для надежности,
    # либо, если хотите, могу проверить наличие перед добавлением.
    # Но для рассылки главное чтобы ID был в базе.
    
    # Давай сделаем так:
    # 1. Добавляем в БД.
    # 2. Показываем приветствие (пусть будет полное, оно информативнее).
    pass # placeholder for logic change below
    
    # Реализация:
    await add_user(message.from_user.id)
    
    # Билдер для старых пользователей (Reply кнопки)
    
    # Билдер для старых пользователей (Reply кнопки)
    reply_builder = ReplyKeyboardBuilder()
    reply_builder.button(text="🔥 Открыть дневник", web_app=WebAppInfo(url=WEB_APP_URL))
    reply_builder.adjust(1)
    
    # Отправляем Reply-клавиатуру (меню)
    await message.answer("⇩ Главное меню", reply_markup=reply_builder.as_markup(resize_keyboard=True))
    
    # Билдер для всех (Inline кнопки)
    inline_builder = InlineKeyboardBuilder()
    inline_builder.button(text="Ссылка на канал", url="https://t.me/bananalyzer")
    inline_builder.button(text="Как пользоваться", url="https://t.me/bananalyzer")
    inline_builder.button(text="Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))
    inline_builder.adjust(2, 1)

    await message.answer(
        "Добро пожаловать в Bananalyzer AI — бот для качественного питания и заботы о своем организме №1 в Telegram!\n\n"
        "• Определяй КБЖУ блюд по фото\n"
        "• Твори новые блюда по рекомендациям ИИ\n"
        "• Проверяй состав продуктов перед покупкой\n"
        "• Следи за своей статистикой питания и получай напоминания\n"
        "• Удобный и приятный интерфейс\n\n"
        "Начни путь к новой версии себя уже сейчас!",
        reply_markup=inline_builder.as_markup()
    )
    # Old "else" block removed to simplify.

# --- Функции для работы с пользователями (удалены, теперь в db_manager) ---

async def send_meal_reminder(meal_type):
    """Отправляет напоминание о приеме пищи всем пользователям"""
    users = await get_all_users()
    
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

# --- АДМИН-ПАНЕЛЬ ---

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    if message.from_user.id not in ADMIN_IDS:
        return

    keyboard = InlineKeyboardBuilder()
    keyboard.button(text="📊 Статистика", callback_data="admin_stats")
    keyboard.button(text="💾 Скачать БД", callback_data="admin_export")
    keyboard.button(text="📢 Рассылка", callback_data="admin_broadcast_info")
    keyboard.adjust(1)
    
    await message.answer(
        "Админ-панель приветствует тебя, Создатель!",
        reply_markup=keyboard.as_markup()
    )

@dp.callback_query(lambda c: c.data in ["admin_stats", "admin_export", "admin_broadcast_info"])
async def process_admin_callback(callback: CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    if callback.data == "admin_stats":
        count = await get_users_count()
        keyboard = InlineKeyboardBuilder()
        keyboard.button(text="📊 Статистика", callback_data="admin_stats")
        keyboard.button(text="💾 Скачать БД", callback_data="admin_export")
        keyboard.button(text="📢 Рассылка", callback_data="admin_broadcast_info")
        keyboard.adjust(1)
        
        await callback.message.edit_text(
            f"Всего пользователей: {count}",
            reply_markup=keyboard.as_markup()
        )
        await callback.answer()

    elif callback.data == "admin_export":
        await callback.answer("Отправляю...")
        try:
            file = FSInputFile("diet.db")
            await callback.message.answer_document(file, caption="Backup")
        except Exception as e:
            await callback.message.answer(f"Ошибка при отправке файла: {e}")
    
    elif callback.data == "admin_broadcast_info":
        await callback.message.answer("Чтобы сделать рассылку, введи команду:\n`/broadcast Текст сообщения`", parse_mode="Markdown")
        await callback.answer()

@dp.message(Command("broadcast"))
async def cmd_broadcast(message: types.Message):
    if message.from_user.id not in ADMIN_IDS:
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Ошибка: введите текст рассылки.\nПример: `/broadcast Привет всем!`")
        return

    text = parts[1]
    users = await get_all_users()
    
    success_count = 0
    fail_count = 0
    
    status_msg = await message.answer(f"Начинаю рассылку для {len(users)} пользователей...")

    for user_id in users:
        try:
            await bot.send_message(user_id, text)
            success_count += 1
            await asyncio.sleep(0.05) 
        except Exception:
            fail_count += 1
            continue

    await bot.send_message(
        message.from_user.id,
        f"Рассылка завершена.\nУспешно: {success_count}\nНе доставлено: {fail_count}"
    )

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
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Telegram-Init-Data",
        "Access-Control-Max-Age": "3600",
    })

def validate_init_data(init_data_string):
    """
    Validate Telegram WebApp initData and extract user_id.
    Returns user_id if valid, raises ValueError if invalid.
    """
    try:
        # Parse the init data
        parsed = parse_qs(init_data_string)
        
        # Extract hash and other data
        received_hash = parsed.get('hash', [''])[0]
        if not received_hash:
            raise ValueError("No hash in initData")
        
        # Create data check string (all params except hash, sorted alphabetically)
        data_check_arr = []
        for key in sorted(parsed.keys()):
            if key != 'hash':
                value = parsed[key][0]
                data_check_arr.append(f"{key}={value}")
        data_check_string = '\n'.join(data_check_arr)
        
        # Create secret key
        secret_key = hmac.new(
            "WebAppData".encode(),
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Verify hash
        if calculated_hash != received_hash:
            raise ValueError("Invalid hash")
        
        # Extract user data
        user_json = parsed.get('user', [''])[0]
        if user_json:
            user_data = json.loads(user_json)
            return user_data.get('id')
        
        raise ValueError("No user data in initData")
    except Exception as e:
        logging.error(f"initData validation failed: {e}")
        raise ValueError(f"Invalid initData: {e}")

async def handle_sync_save(request):
    """
    POST /api/sync/save
    Save food data to database.
    Headers: X-Telegram-Init-Data
    Body: {"date": "YYYY-MM-DD", "foodData": {...}}
    """
    try:
        # Validate initData
        init_data = request.headers.get('X-Telegram-Init-Data', '')
        if not init_data:
            return web.json_response(
                {"error": "Missing initData"},
                status=401,
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        user_id = validate_init_data(init_data)
        
        # Parse request body
        data = await request.json()
        date = data.get('date')
        food_data = data.get('foodData')
        
        if not date or not food_data:
            return web.json_response(
                {"error": "Missing date or foodData"},
                status=400,
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        # Save to database
        food_json = json.dumps(food_data)
        success = await save_food_data(user_id, date, food_json)
        
        if success:
            return web.json_response(
                {"success": True, "message": "Data saved"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
        else:
            return web.json_response(
                {"error": "Failed to save data"},
                status=500,
                headers={"Access-Control-Allow-Origin": "*"}
            )
    
    except ValueError as e:
        return web.json_response(
            {"error": str(e)},
            status=401,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logging.error(f"Error in /api/sync/save: {e}")
        return web.json_response(
            {"error": str(e)},
            status=500,
            headers={"Access-Control-Allow-Origin": "*"}
        )

async def handle_sync_load(request):
    """
    GET /api/sync/load?date=YYYY-MM-DD
    Load food data from database.
    If date is not provided, return all data.
    Headers: X-Telegram-Init-Data
    """
    try:
        # Validate initData
        init_data = request.headers.get('X-Telegram-Init-Data', '')
        if not init_data:
            return web.json_response(
                {"error": "Missing initData"},
                status=401,
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        user_id = validate_init_data(init_data)
        
        # Get date parameter
        date = request.query.get('date')
        
        if date:
            # Load specific date
            food_data = await get_food_data(user_id, date)
            return web.json_response(
                {"date": date, "foodData": food_data},
                headers={"Access-Control-Allow-Origin": "*"}
            )
        else:
            # Load all data
            all_data = await get_all_food_data(user_id)
            return web.json_response(
                {"allData": all_data},
                headers={"Access-Control-Allow-Origin": "*"}
            )
    
    except ValueError as e:
        return web.json_response(
            {"error": str(e)},
            status=401,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logging.error(f"Error in /api/sync/load: {e}")
        return web.json_response(
            {"error": str(e)},
            status=500,
            headers={"Access-Control-Allow-Origin": "*"}
        )

async def init_web():
    app = web.Application(client_max_size=20*1024*1024)
    app.router.add_post('/api/analyze', handle_analyze)
    app.router.add_options('/api/analyze', handle_options)
    app.router.add_post('/api/sync/save', handle_sync_save)
    app.router.add_get('/api/sync/load', handle_sync_load)
    app.router.add_options('/api/sync/save', handle_options)
    app.router.add_options('/api/sync/load', handle_options)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print("🚀 Web server started on port 8080")
    print("📊 Sync endpoints: /api/sync/save, /api/sync/load")

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
    
    # Initialize database
    await init_database()
    
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