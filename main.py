import asyncio
import logging
import os
import base64
import json
from aiohttp import web
import google.generativeai as genai
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton

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

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔥 Открыть Web Diet", web_app=WebAppInfo(url=WEB_APP_URL))]],
        resize_keyboard=True
    )
    await message.answer("Привет! Нажми кнопку, чтобы открыть приложение 👇", reply_markup=kb)

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
    app = web.Application()
    app.router.add_post('/api/analyze', handle_analyze)
    app.router.add_options('/api/analyze', handle_options)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print("🚀 Web server started on port 8080")

async def main():
    logging.basicConfig(level=logging.INFO)
    
    # Запускаем и бота, и веб-сервер
    await asyncio.gather(
        dp.start_polling(bot),
        init_web()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass