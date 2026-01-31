import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Загружаем ключ
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ Ошибка: Ключ не найден в файле .env")
    exit()

print(f"🔑 Используем ключ: {api_key[:5]}... (вроде на месте)")

# 2. Настраиваем библиотеку
genai.configure(api_key=api_key)

print("\n📡 Стучимся в Google, спрашиваем список моделей...\n")

try:
    # 3. Получаем список
    found_any = False
    for m in genai.list_models():
        # Нам нужны только те, которые умеют генерировать текст/контент
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Доступна модель: {m.name}")
            found_any = True
            
    if not found_any:
        print("⚠️ Список пуст. Возможно, ключ неверный или нет прав.")

except Exception as e:
    print(f"❌ Ошибка подключения: {e}")

print("\n🏁 Проверка завершена.")