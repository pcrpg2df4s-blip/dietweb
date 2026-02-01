const CONFIG_LOCAL = {
    VERSION: "FINAL_1.0"
};

let userData = {
    gender: 'male',
    activity: 1.2,
    height: 175,
    weight: 75,
    age: 20,
    goal: '',
    stopper: '',
    diet: '',
    accomplish: '',
    birthdate: ''
};

let currentMacros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    totalCalories: 2000,
    totalProtein: 150,
    totalCarbs: 250,
    totalFats: 70,
    foodHistory: [],
    dailyHistory: {} 
};

// Глобальный перехватчик ошибок для диагностики
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", message, source, lineno);
    // Если это ошибка квоты localStorage, она обычно содержит "quota"
    if (message.toLowerCase().includes("quota")) {
        alert(`ОШИБКА ХРАНИЛИЩА: ${message}\nПопробуйте очистить данные в настройках.`);
    }
    return false;
};

window.onunhandledrejection = function(event) {
    console.error("Unhandled rejection:", event.reason);
    if (event.reason && event.reason.toString().toLowerCase().includes("quota")) {
        alert(`ОШИБКА КВОТЫ (Promise): ${event.reason}`);
    }
};

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    console.log("App started. Version: " + CONFIG_LOCAL.VERSION);
    
    // Проверяем наличие ключа в URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('api_key');
    if (urlKey) {
        console.log("Using API Key from URL");
        CONFIG.GOOGLE_API_KEY = urlKey;
    }

    loadSavedData();
    initBMIModal();
});

function initBMIModal() {
   const modal = document.getElementById('bmi-modal');
   const closeBtn = document.getElementById('close-bmi-modal');
   const infoIcon = document.querySelector('.bmi-info-icon');

   if (infoIcon) {
       infoIcon.addEventListener('click', () => {
           modal.classList.remove('hidden');
       });
   }

   if (closeBtn) {
       closeBtn.addEventListener('click', () => {
           modal.classList.add('hidden');
       });
   }

   if (modal) {
       modal.addEventListener('click', (e) => {
           if (e.target === modal) {
               modal.classList.add('hidden');
           }
       });
   }
}

function checkTotalStorageUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        total += (key.length + value.length) * 2; // Approximate bytes (UTF-16)
        console.log(`[Storage] Key: ${key}, Size: ~${((key.length + value.length) * 2 / 1024).toFixed(2)} KB`);
    }
    console.log(`[Storage] TOTAL Usage: ~( ${(total / 1024).toFixed(2)} KB )`);
    return total;
}

function saveAllData() {
    try {
        checkTotalStorageUsage();
        const userDataStr = JSON.stringify(userData);
        const macrosStr = JSON.stringify(currentMacros);
        
        console.log(`[Storage] Attempting to save userData: ${(userDataStr.length / 1024).toFixed(2)} KB`);
        console.log(`[Storage] Attempting to save macros: ${(macrosStr.length / 1024).toFixed(2)} KB`);
        
        localStorage.setItem('dietApp_userData', userDataStr);
        localStorage.setItem('dietApp_macros', macrosStr);
        
        console.log(`[Storage] Successfully saved.`);
    } catch (e) {
        console.error("[Storage] Failed to save data to localStorage:", e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.message.includes("quota")) {
            console.warn("[Storage] Quota exceeded. Attempting to trim food history...");
            if (currentMacros.foodHistory && currentMacros.foodHistory.length > 0) {
                // Keep only last 2 items
                currentMacros.foodHistory = currentMacros.foodHistory.slice(0, 2);
                console.log("[Storage] Trimmed history to 2 items. Retrying save...");
                try {
                    localStorage.setItem('dietApp_macros', JSON.stringify(currentMacros));
                    console.log("[Storage] Save successful after trimming.");
                    alert("Внимание: История фотографий была сокращена, так как место в браузере закончилось.");
                } catch (e2) {
                    console.error("[Storage] Still failing after trimming:", e2);
                    alert("Критическая ошибка: Место в браузере полностью исчерпано (даже после удаления фото). Возможно, другие приложения на этом сайте занимают всё место.");
                }
            } else {
                alert("Ошибка: Превышен лимит памяти браузера. Даже без истории фотографий не удается сохранить данные. Попробуйте очистить кэш браузера для этого сайта.");
            }
        }
    }
}

function loadSavedData() {
    const savedUser = localStorage.getItem('dietApp_userData');
    const savedMacros = localStorage.getItem('dietApp_macros');

    if (savedUser && savedMacros) {
        userData = JSON.parse(savedUser);
        currentMacros = JSON.parse(savedMacros);
        
        const today = new Date().toISOString().split('T')[0];
        if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
        
        const lastUpdate = localStorage.getItem('dietApp_lastUpdate');
        if (lastUpdate !== today) {
            if (lastUpdate) {
                currentMacros.dailyHistory[lastUpdate] = {
                    calories: currentMacros.calories,
                    protein: currentMacros.protein,
                    carbs: currentMacros.carbs,
                    fats: currentMacros.fats
                };
            }
            currentMacros.calories = 0;
            currentMacros.protein = 0;
            currentMacros.carbs = 0;
            currentMacros.fats = 0;
            currentMacros.foodHistory = [];
            
            localStorage.setItem('dietApp_lastUpdate', today);
            saveAllData();
        }

        if (userData.goal) {
            setTimeout(() => {
                initHomeScreenFromSaved();
                nextStep(12);
            }, 100);
        }
    }
}

function initHomeScreenFromSaved() {
    const caloriesLeft = Math.round(Math.max(0, currentMacros.totalCalories - currentMacros.calories));
    const proteinLeft = Math.round(Math.max(0, currentMacros.totalProtein - currentMacros.protein));
    const carbsLeft = Math.round(Math.max(0, currentMacros.totalCarbs - currentMacros.carbs));
    const fatsLeft = Math.round(Math.max(0, currentMacros.totalFats - currentMacros.fats));

    document.getElementById('home-calories-left').innerText = caloriesLeft;
    document.getElementById('home-protein-eaten').innerText = proteinLeft;
    document.getElementById('home-carbs-eaten').innerText = carbsLeft;
    document.getElementById('home-fats-eaten').innerText = fatsLeft;

    setHomeProgress('home-ring-calories', (currentMacros.calories / currentMacros.totalCalories) * 100, 282.7);
    setHomeProgress('home-ring-protein', (currentMacros.protein / currentMacros.totalProtein) * 100, 100);
    setHomeProgress('home-ring-carbs', (currentMacros.carbs / currentMacros.totalCarbs) * 100, 100);
    setHomeProgress('home-ring-fats', (currentMacros.fats / currentMacros.totalFats) * 100, 100);

    const foodList = document.getElementById('food-list');
    foodList.innerHTML = '';
    
    if (currentMacros.foodHistory && currentMacros.foodHistory.length > 0) {
        currentMacros.foodHistory.forEach((food, index) => {
            const div = document.createElement('div');
            div.className = 'food-item';
            div.innerHTML = `
                <div class="food-img-placeholder" style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #f0f0f0; border-radius: 12px; margin-right: 12px;">🥗</div>
                <div class="food-details">
                    <div class="food-header">
                        <h4>${food.name}</h4>
                        <span class="food-time">${food.time}</span>
                    </div>
                    <div class="food-calories"><span class="fire-icon">🔥</span> ${Math.round(food.calories)} ккал</div>
                    <div class="food-macros-mini">
                        <span><div class="macro-mini-dot" style="background: #ff8a80;"></div> Б: ${Math.round(food.protein)}г</span>
                        <span><div class="macro-mini-dot" style="background: #ffcc80;"></div> У: ${Math.round(food.carbs)}г</span>
                        <span><div class="macro-mini-dot" style="background: #81d4fa;"></div> Ж: ${Math.round(food.fats)}г</span>
                    </div>
                </div>
                <button class="delete-food-btn" onclick="deleteFood(${index})">🗑️</button>
            `;
            foodList.appendChild(div);
        });
    } else {
        foodList.innerHTML = '<div class="empty-state">Пока нет записей. Нажмите +, чтобы добавить.</div>';
    }

    updateCalendarDates();
    updateHomeUI();
}

function updateHomeUI() {
    renderWeeklyCalendar();
}

function renderWeeklyCalendar() {
    const container = document.getElementById('week-calendar');
    if (!container) return;

    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    // Находим начало недели (понедельник)
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    startOfWeek.setDate(diff);

    container.innerHTML = '';

    const radius = 20;
    const circumference = 2 * Math.PI * radius;

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateISO = date.toISOString().split('T')[0];
        
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'narrow' }).toUpperCase();
        const dayNumber = date.getDate();
        const isActive = date.toDateString() === now.toDateString();

        // Получаем данные из истории
        const historyData = currentMacros.dailyHistory[dateISO] || { calories: 0 };
        const goal = currentMacros.totalCalories || 2000;
        const percent = Math.min(100, (historyData.calories / goal) * 100);
        const offset = circumference - (percent / 100 * circumference);

        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${isActive ? 'active' : ''}`;
        dayCard.innerHTML = `
            <span class="day-name">${dayName}</span>
            <div class="day-ring-wrapper">
                <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle class="ring-track" cx="24" cy="24" r="${radius}" fill="transparent" stroke="#eee" stroke-width="4"></circle>
                    <circle class="ring-progress" cx="24" cy="24" r="${radius}" fill="transparent" stroke="#000" stroke-width="4"
                        stroke-dasharray="${circumference} ${circumference}"
                        stroke-dashoffset="${offset}"
                        stroke-linecap="round"
                        transform="rotate(-90 24 24)"></circle>
                    <text x="24" y="24" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="${isActive ? '#000' : '#333'}">${dayNumber}</text>
                </svg>
            </div>
        `;
        container.appendChild(dayCard);
    }
}

const tg = window.Telegram.WebApp;
tg.expand();

function nextStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) targetStep.classList.add('active');
    
    const globalTabBar = document.getElementById('global-tab-bar');
    if (globalTabBar) {
        if (stepNumber === 12 || stepNumber === 15 || stepNumber === 16) {
            globalTabBar.style.display = 'flex';
            document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
            if (stepNumber === 12) document.getElementById('tab-home').classList.add('active');
            if (stepNumber === 15) document.getElementById('tab-progress').classList.add('active');
            if (stepNumber === 16) document.getElementById('tab-settings').classList.add('active');
        } else {
            globalTabBar.style.display = 'none';
        }
    }
    window.scrollTo(0,0);
}

function prevStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    window.scrollTo(0,0);
}

function selectGender(gender) {
    userData.gender = gender;
    nextStep(2);
}

function selectActivity(multiplier) {
    userData.activity = multiplier;
    nextStep(3);
}

function saveBorn() {
    const birthdate = document.getElementById('birthdate').value;
    if (!birthdate) {
        tg.showAlert("Пожалуйста, выберите дату рождения");
        return;
    }
    userData.birthdate = birthdate;
    const birthYear = new Date(birthdate).getFullYear();
    const currentYear = new Date().getFullYear();
    userData.age = currentYear - birthYear;
    nextStep(6);
}

function selectGoal(goal) {
    userData.goal = goal;
    nextStep(7);
}

function selectStopper(stopper) {
    userData.stopper = stopper;
    nextStep(8);
}

function selectDiet(diet) {
    userData.diet = diet;
    nextStep(9);
}

function selectAccomplish(accomplish) {
    userData.accomplish = accomplish;
    nextStep(10);
    startLoadingAnimation();
}

function startLoadingAnimation() {
    const percentageEl = document.getElementById('load-percentage');
    const progressBar = document.getElementById('load-progress');
    const statusEl = document.getElementById('load-status');
    const finalBtn = document.getElementById('final-btn');
    
    const steps = [
        { percent: 20, status: "Анализируем ваши данные...", check: "check-calories" },
        { percent: 40, status: "Рассчитываем метаболический возраст...", check: "check-carbs" },
        { percent: 60, status: "Подбираем оптимальный баланс БЖУ...", check: "check-protein" },
        { percent: 80, status: "Формируем персональные рекомендации...", check: "check-fats" },
        { percent: 100, status: "Ваш план готов!", check: "check-health" }
    ];

    let currentPercent = 0;
    let stepIndex = 0;

    const interval = setInterval(() => {
        if (currentPercent < 100) {
            currentPercent++;
            percentageEl.innerText = `${currentPercent}%`;
            progressBar.style.width = `${currentPercent}%`;

            if (stepIndex < steps.length && currentPercent >= steps[stepIndex].percent) {
                statusEl.innerText = steps[stepIndex].status;
                const checkItem = document.getElementById(steps[stepIndex].check);
                if (checkItem) {
                    checkItem.classList.add('checked');
                }
                stepIndex++;
            }
        } else {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('loading-title').innerText = "План успешно составлен!";
                statusEl.style.display = 'none';
                finalBtn.style.display = 'block';
            }, 500);
        }
    }, 40);
}

async function fetchWithRetry(url, options, maxRetries = 3, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                console.warn(`Quota exceeded (429). Retry attempt ${i + 1} of ${maxRetries}...`);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.warn(`Network error. Retry attempt ${i + 1} of ${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function fetchGeminiTips(userData, calories, carbs, protein, fats) {
    if (!CONFIG.GOOGLE_API_KEY) {
        console.warn("No API key, skipping tips");
        return [
            { icon: "🥗", text: "Следите за балансом БЖУ ежедневно" },
            { icon: "💧", text: "Пейте достаточное количество воды" },
            { icon: "🏃", text: "Старайтесь больше двигаться" },
            { icon: "😴", text: "Соблюдайте режим сна" }
        ];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${CONFIG.GOOGLE_API_KEY}`;

    const prompt = `Пользователь:
- Пол: ${userData.gender === 'male' ? 'Мужской' : 'Женский'}
- Вес: ${userData.weight} кг
- Рост: ${userData.height} см
- Возраст: ${userData.age} лет
- Цель: ${userData.goal}
- Препятствие: ${userData.stopper}
- Диета: ${userData.diet}
- Желание: ${userData.accomplish}

Его норма: ${calories} ккал, БЖУ: ${protein}г белка, ${fats}г жиров, ${carbs}г углеводов.

Дай 4 коротких, конкретных совета на русском языке, как ему достичь цели, основываясь на его ответах. 
Верни ТОЛЬКО JSON массив объектов с полями "icon" (эмодзи) и "text" (совет до 60 символов).
Пример: [{"icon": "🥑", "text": "Ешь больше жиров"}, ...]`;

    try {
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates[0].content.parts[0].text;
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini error:", e);
        return [
            { icon: "🥗", text: "Следите за балансом БЖУ ежедневно" },
            { icon: "💧", text: "Пейте достаточное количество воды" },
            { icon: "🏃", text: "Старайтесь больше двигаться" },
            { icon: "😴", text: "Соблюдайте режим сна" }
        ];
    }
}

function showResults() {
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');

    if (!heightInput || !weightInput) return;

    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);
    
    userData.height = height;
    userData.weight = weight;
    
    // Расчет калорий
    let bmr;
    if (userData.gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) - 161;
    }
    const calories = Math.round(bmr * userData.activity);
    
    // Расчет БЖУ
    const protein = Math.round((calories * 0.3) / 4);
    const fats = Math.round((calories * 0.3) / 9);
    const carbs = Math.round((calories * 0.4) / 4);

    // Обновление UI
    document.getElementById('res-calories').innerText = calories;
    document.getElementById('res-carbs').innerText = carbs + 'г';
    document.getElementById('res-protein').innerText = protein + 'г';
    document.getElementById('res-fats').innerText = fats + 'г';
    document.getElementById('target-weight').innerText = weight + ' кг';
    
    const goalMap = {
        'lose': 'Похудение',
        'maintain': 'Поддержание веса',
        'gain': 'Набор массы'
    };
    const goalText = goalMap[userData.goal] || 'Здоровье';
    document.getElementById('goal-text').innerText = `Ваша цель: ${goalText}`;

    // Анимация
    setProgress('ring-calories', 100);
    setProgress('ring-carbs', 85);
    setProgress('ring-protein', 90);
    setProgress('ring-fats', 70);
    
    // Загрузка советов
    fetchGeminiTips(userData, calories, carbs, protein, fats).then(tips => {
        const container = document.getElementById('ai-tips');
        if (container) {
            container.innerHTML = '';
            tips.forEach(tip => {
                container.innerHTML += `
                    <div class="tip-item">
                        <div class="tip-icon">${tip.icon}</div>
                        <div class="tip-text">${tip.text}</div>
                    </div>
                `;
            });
        }
        nextStep(11);
    }).catch(error => {
        console.error("Tips error", error);
        nextStep(11);
    });
}

let videoStream = null;
async function openCamera() {
    const cameraScreen = document.getElementById('camera-screen');
    const video = document.getElementById('video-preview');
    const permissionUI = document.getElementById('camera-permission-ui');
    const statusText = document.getElementById('camera-status-text');
    const retryBtn = document.getElementById('retry-camera-btn');
    
    // Reset UI state
    cameraScreen.classList.remove('hidden');
    permissionUI.classList.remove('hidden');
    permissionUI.classList.remove('fade-out');
    statusText.innerText = "Разрешите доступ к камере, чтобы сканировать еду 📸";
    retryBtn.classList.add('hidden');
    
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        
        video.srcObject = videoStream;
        await video.play();
        
        // Success: Hide instructions with animation
        permissionUI.classList.add('fade-out');
        setTimeout(() => {
            permissionUI.classList.add('hidden');
        }, 500);
        
    } catch (err) {
        console.error("Error accessing camera:", err);
        // Error: Show instructions with manual fix prompt
        statusText.innerText = "Доступ запрещен. Разрешите камеру в настройках устройства.";
        retryBtn.classList.remove('hidden');
    }
}

function closeCamera() {
    const cameraScreen = document.getElementById('camera-screen');
    cameraScreen.classList.add('hidden');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function takePhoto() {
    const video = document.getElementById('video-preview');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current frame from the video onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to JPEG
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Set to analysis image and start analysis
    const analyzedImg = document.getElementById('analyzed-img');
    if (analyzedImg) analyzedImg.src = imageData;
    
    // Stop camera and close screen
    closeCamera();
    
    // Start AI analysis
    startAnalysis(imageData);
}

async function startAnalysis(imageData) {
    nextStep(14);
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 2;
        if (progress > 100) progress = 100;
        
        document.getElementById('analysis-percent').innerText = `${progress}%`;
        setHomeProgress('analysis-ring', progress, 282.7);
        
        if (progress === 100) {
            clearInterval(interval);
            finishAnalysis(imageData);
        }
    }, 150);
}

async function finishAnalysis(imageData) {
    // 1. Проверяем, видит ли вообще скрипт твой ключ
    if (!CONFIG.GOOGLE_API_KEY) {
        alert("ОШИБКА: Скрипт не видит API ключ! (Хотя в .env он может быть). Проблема в передаче ключа.");
        nextStep(12);
        return;
    }

    const prompt = `Анализируй это изображение еды. 
    1. Название блюда (на русском).
    2. Калории (ккал), белки (г), жиры (г), углеводы (г).
    Верни ТОЛЬКО JSON: {"name": "Блюдо", "calories": 100, "protein": 10, "carbs": 10, "fats": 10}`;
    
    try {
        // Отправляем запрос
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${CONFIG.GOOGLE_API_KEY}`;
        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } }] }]
            })
        });

        const data = await response.json();

        // 2. Если Google вернул ошибку, показываем её текст
        if (data.error) {
            if (data.error.code === 429) {
                alert(`Лимит запросов исчерпан (429) после 3 попыток. Попробуйте позже.`);
            } else {
                alert(`GOOGLE ОТКАЗАЛ: ${data.error.message} (Code: ${data.error.code})`);
            }
            throw new Error(data.error.message);
        }
        
        if (!data.candidates || !data.candidates[0].content) {
            alert("GOOGLE ПРИСЛАЛ ПУСТОЙ ОТВЕТ (Блокировка безопасности или сбой)");
            throw new Error("Empty response");
        }

        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/```json|```/g, '').trim();
        
        const result = JSON.parse(text);
        addFoodToHome(result, imageData); // Всё ок

    } catch (err) {
        console.error("Critical AI Error:", err);
        
        // 3. В СЛУЧАЕ ОШИБКИ — МЫ ВСЁ РАВНО ДОБАВЛЯЕМ ЕДУ (ЧТОБЫ ТЫ ВИДЕЛ РЕЗУЛЬТАТ)
        alert(`Сбой анализа: ${err.message}. Добавляю тестовую еду.`);
        
        const errorFood = {
            name: "⚠️ Ошибка (см. детали)",
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0
        };
        addFoodToHome(errorFood, imageData);
    }
}

function addFoodToHome(food, image) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const foodEntry = {
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        time: time
    };

    if (!currentMacros.foodHistory) currentMacros.foodHistory = [];
    currentMacros.foodHistory.unshift(foodEntry);
    
    recalculateMacros();
    saveAllData();
    initHomeScreenFromSaved();
    nextStep(12);
}

function recalculateMacros() {
    currentMacros.protein = 0;
    currentMacros.carbs = 0;
    currentMacros.fats = 0;
    currentMacros.calories = 0;

    if (currentMacros.foodHistory) {
        currentMacros.foodHistory.forEach(food => {
            currentMacros.protein += food.protein;
            currentMacros.carbs += food.carbs;
            currentMacros.fats += food.fats;
            currentMacros.calories += food.calories;
        });
    }

    const today = new Date().toISOString().split('T')[0];
    if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
    currentMacros.dailyHistory[today] = {
        calories: currentMacros.calories,
        protein: currentMacros.protein,
        carbs: currentMacros.carbs,
        fats: currentMacros.fats,
        goal: currentMacros.totalCalories
    };
}

function deleteFood(index) {
    if (confirm("Удалить это блюдо?")) {
        if (currentMacros.foodHistory && currentMacros.foodHistory[index]) {
            currentMacros.foodHistory.splice(index, 1);
            recalculateMacros();
            saveAllData();
            initHomeScreenFromSaved();
        }
    }
}

function goToHome() {
    currentMacros.totalCalories = parseInt(document.getElementById('res-calories').innerText);
    currentMacros.totalProtein = parseInt(document.getElementById('res-protein').innerText.replace('г', ''));
    currentMacros.totalCarbs = parseInt(document.getElementById('res-carbs').innerText.replace('г', ''));
    currentMacros.totalFats = parseInt(document.getElementById('res-fats').innerText.replace('г', ''));
    
    currentMacros.calories = 0;
    currentMacros.protein = 0;
    currentMacros.carbs = 0;
    currentMacros.fats = 0;
    currentMacros.foodHistory = [];

    // Save registration date to track daily resets
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('dietApp_lastUpdate', today);

    document.getElementById('home-calories-left').innerText = currentMacros.totalCalories;
    document.getElementById('home-calories-total').innerText = `Ккал осталось`;
    
    document.getElementById('home-protein-eaten').innerText = currentMacros.totalProtein;
    document.getElementById('home-carbs-eaten').innerText = currentMacros.totalCarbs;
    document.getElementById('home-fats-eaten').innerText = currentMacros.totalFats;

    setHomeProgress('home-ring-calories', 0, 282.7);
    setHomeProgress('home-ring-protein', 0, 100);
    setHomeProgress('home-ring-carbs', 0, 100);
    setHomeProgress('home-ring-fats', 0, 100);

    document.getElementById('food-list').innerHTML = '<div class="empty-state">Пока нет записей. Нажмите +, чтобы добавить.</div>';

    saveAllData();
    updateCalendarDates();
    nextStep(12);
}

function setHomeProgress(id, percent, circumference) {
    const circle = document.getElementById(id);
    if (!circle) return;
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
}

function updateCalendarDates() {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    const dayElements = document.querySelectorAll('.calendar-day');
    dayElements.forEach((el, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        
        const dayNum = date.getDate();
        el.querySelector('.day-number').innerText = dayNum;
        
        if (date.toDateString() === now.toDateString()) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function updateProgressPage() {
    const today = new Date().toISOString().split('T')[0];
    
    if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
    
    currentMacros.dailyHistory[today] = {
        calories: currentMacros.calories,
        protein: currentMacros.protein,
        carbs: currentMacros.carbs,
        fats: currentMacros.fats
    };

    const progressTotalCalories = document.getElementById('progress-total-calories');
    if (progressTotalCalories) {
        progressTotalCalories.innerText = currentMacros.calories;
    }

    renderProgressChart();
    updateBMI();
    nextStep(15);
}

function renderProgressChart() {
    const container = document.getElementById('chart-bars-container');
    if (!container) return;
    container.innerHTML = '';
    
    const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = daysShort[date.getDay()];
        
        const data = currentMacros.dailyHistory[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        
        const maxVal = 3000;
        const totalCals = data.calories || ((data.protein * 4) + (data.carbs * 4) + (data.fats * 9));
        const scaleFactor = Math.min(1, totalCals / maxVal);
        
        // Scale segments proportionally to fill the bar up to 100% (150px)
        const pHeight = totalCals > 0 ? ((data.protein * 4) / totalCals) * (scaleFactor * 150) : 0;
        const cHeight = totalCals > 0 ? ((data.carbs * 4) / totalCals) * (scaleFactor * 150) : 0;
        const fHeight = totalCals > 0 ? ((data.fats * 9) / totalCals) * (scaleFactor * 150) : 0;

        const barHtml = `
            <div class="bar-column">
                <div class="bar-stack">
                    <div class="segment fats" style="height: ${fHeight}px"></div>
                    <div class="segment carbs" style="height: ${cHeight}px"></div>
                    <div class="segment protein" style="height: ${pHeight}px"></div>
                </div>
                <span class="day-label">${dayLabel}</span>
            </div>
        `;
        container.innerHTML += barHtml;
    }
}

function updateBMI() {
    if (!userData.weight || !userData.height) return;
    
    const heightInMeters = userData.height / 100;
    const bmi = (userData.weight / (heightInMeters * heightInMeters)).toFixed(1);
    
    const bmiEl = document.getElementById('bmi-number');
    const statusTextEl = document.getElementById('bmi-status-text');
    const pointerEl = document.getElementById('bmi-pointer');
    
    bmiEl.innerText = bmi;
    
    let status = "Норма";
    let statusClass = "healthy";
    let pointerPos = 50; 

    if (bmi < 18.5) {
        status = "Дефицит";
        statusClass = "underweight";
        pointerPos = (bmi / 18.5) * 25;
    } else if (bmi < 25) {
        status = "Норма";
        statusClass = "healthy";
        pointerPos = 25 + ((bmi - 18.5) / 6.5) * 25;
    } else if (bmi < 30) {
        status = "Лишний";
        statusClass = "overweight";
        pointerPos = 50 + ((bmi - 25) / 5) * 25;
    } else {
        status = "Ожирение";
        statusClass = "obese";
        pointerPos = 75 + Math.min(25, ((bmi - 30) / 10) * 25);
    }

    statusTextEl.innerText = status;
    statusTextEl.className = `status-badge ${statusClass}`;
    pointerEl.style.left = `${pointerPos}%`;
}

function openSettings() {
    nextStep(16);
    loadSettingsData();
}

function loadSettingsData() {
    const tg = window.Telegram.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        const nameEl = document.getElementById('settings-name');
        if (nameEl) {
            nameEl.innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        }
        
        const avatarEl = document.getElementById('settings-avatar');
        if (avatarEl) {
            if (user.photo_url) {
                avatarEl.innerHTML = `<img src="${user.photo_url}" alt="Avatar">`;
            } else {
                const letter = user.first_name ? user.first_name.charAt(0).toUpperCase() : '?';
                avatarEl.innerHTML = `<div class="avatar-placeholder">${letter}</div>`;
            }
        }
    } else {
        const nameEl = document.getElementById('settings-name');
        if (nameEl) nameEl.innerText = 'Гость';
    }

    const activityMap = { 
        1.2: 'Сидячий', 
        1.375: 'Лёгкий', 
        1.55: 'Умеренный', 
        1.725: 'Высокая', 
        1.9: 'Экстремальная' 
    };
    
    const goalMap = { 
        'lose': 'Похудение', 
        'maintain': 'Норма', 
        'gain': 'Масса' 
    };
    
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    setText('set-activity-text', activityMap[userData.activity] || 'Норма');
    setText('set-weight-text', (userData.weight || 0) + ' кг');
    setText('set-goal-text', goalMap[userData.goal] || 'Здоровье');
    setText('set-height-text', (userData.height || 0) + ' см');
}

function resetAppData() {
    if (confirm('Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.')) {
        localStorage.clear();
        location.reload();
    }
}

function setProgress(id, percent) {
    const circle = document.getElementById(id);
    if (circle) {
        const radius = 40; 
        const circumference = 2 * Math.PI * radius;
        
        const offset = circumference - (percent / 100 * circumference);
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
    }
}