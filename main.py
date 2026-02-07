import asyncio
import logging
import os
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

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔥 Открыть Web Diet", web_app=WebAppInfo(url=WEB_APP_URL))]],
        resize_keyboard=True
    )
    await message.answer("Привет! Нажми кнопку, чтобы открыть приложение 👇", reply_markup=kb)

async def main():
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass