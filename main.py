import asyncio
import logging
import os
import json
import base64
import google.generativeai as genai
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, types, F
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

# Настраиваем Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔥 Открыть Web Diet", web_app=WebAppInfo(url=WEB_APP_URL))]],
        resize_keyboard=True
    )
    await message.answer("Привет! Нажми кнопку, чтобы открыть приложение 👇", reply_markup=kb)

@dp.message(F.web_app_data)
async def handle_web_app_data(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)
        if data.get("action") == "UPLOAD_PHOTO_VIA_CHAT":
            await message.answer("Понял! Пришли мне фото еды прямо сюда в чат, я посчитаю калории. 📸")
    except Exception as e:
        logging.error(f"Error parsing web_app_data: {e}")

@dp.message(F.photo)
async def handle_photo(message: types.Message):
    # Если у нас нет ключа, не пытаемся анализировать
    if not GOOGLE_API_KEY:
        await message.answer("Извини, сервис анализа сейчас недоступен (нет API ключа).")
        return

    # Показываем статус "печатает"
    await bot.send_chat_action(message.chat.id, "typing")
    
    try:
        # Получаем файл фото
        photo = message.photo[-1]
        file = await bot.get_file(photo.file_id)
        
        # Скачиваем фото в память
        file_data = await bot.download_file(file.file_path)
        image_bytes = file_data.read()
        
        # Готовим промпт (аналогично тому, что в JS)
        prompt = """
        You are a helpful nutritionist AI.
        Analyze this food image. Provide a single, definitive estimate based on visual evidence.
        1. Краткое название продукта (1-2 слова) на русском.
        2. Калории (ккал), белки (г), жиры (г), углеводы (г).
        3. Общее описание (короткий текст до 150 символов) на русском.

        Assume standard cooking methods and account for hidden calories like oil and sauces.
        Return ONLY a JSON object: {"product_name": "Название", "calories": 100, "protein": 10, "carbs": 10, "fats": 10, "description": "Описание"}
        """

        # Используем Gemini 2.0 Flash Lite (или ту, что доступна)
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        
        # Вызываем AI
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])

        # Парсим ответ
        text = response.text
        # Чистим от markdown если есть
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].strip()
            
        result = json.loads(text.strip())
        
        # Формируем красивый ответ
        msg = (
            f"🥗 *{result.get('product_name', 'Еда')}*\n\n"
            f"🔥 Калории: {result.get('calories')} ккал\n"
            f"🥩 Белки: {result.get('protein')}г\n"
            f"🌾 Углеводы: {result.get('carbs')}г\n"
            f"🥑 Жиры: {result.get('fats')}г\n\n"
            f"📝 _ {result.get('description', '')} _\n\n"
            f"Чтобы записать это в свой дневник, открой Web Diet и введи данные вручную через кнопку '+' → 'Вручную'."
        )
        
        await message.answer(msg, parse_mode="Markdown")

    except Exception as e:
        logging.error(f"Error in handle_photo: {e}")
        await message.answer("Не удалось проанализировать фото. Попробуй еще раз или добавь еду вручную в приложении.")

async def main():
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass