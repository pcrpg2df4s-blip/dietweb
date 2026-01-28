import asyncio
import logging
import json
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo

# Загружаем переменные из .env
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# Укажите вашу ссылку на Web App здесь или в .env
BASE_WEB_APP_URL = os.getenv("WEB_APP_URL", "https://pcrpg2df4s-blip.github.io/dietweb/")
WEB_APP_URL = f"{BASE_WEB_APP_URL}?api_key={GOOGLE_API_KEY}" if GOOGLE_API_KEY else BASE_WEB_APP_URL

if not BOT_TOKEN:
    print("ОШИБКА: BOT_TOKEN не найден в .env файле")
    exit(1)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    markup = types.ReplyKeyboardMarkup(
        keyboard=[
            [types.KeyboardButton(text="🔥 Рассчитать калории", web_app=WebAppInfo(url=WEB_APP_URL))]
        ],
        resize_keyboard=True
    )
    await message.answer("Привет! Нажми кнопку ниже, чтобы начать расчет 👇", reply_markup=markup)

@dp.message()
async def web_app_data(message: types.Message):
    if message.web_app_data:
        data = json.loads(message.web_app_data.data)
        calories = data['calories']
        
        # Ответ пользователю после завершения
        await message.answer(f"✅ Расчет готов!\n\nТвоя норма: <b>{calories} ккал</b> в день.", parse_mode="HTML")

async def main():
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())