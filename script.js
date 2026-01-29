const urlParams = new URLSearchParams(window.location.search);
let apiKeyFromUrl = urlParams.get('api_key');

// Try to get from URL, otherwise from localStorage
if (apiKeyFromUrl) {
    localStorage.setItem('dietApp_google_api_key', apiKeyFromUrl);
} else {
    apiKeyFromUrl = localStorage.getItem('dietApp_google_api_key');
}

console.log("Debug: API Key:", apiKeyFromUrl ? "Present (Starts with " + apiKeyFromUrl.substring(0, 5) + "...)" : "Not found");

const CONFIG = {
    GOOGLE_API_KEY: apiKeyFromUrl || "",
    VERSION: "999.0"
};

if (!CONFIG.GOOGLE_API_KEY) {
    console.warn("GOOGLE_API_KEY not found in URL parameters");
}

console.log("App Version:", CONFIG.VERSION);

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
    dailyHistory: {} // Format: { "2026-01-29": { calories: 0, protein: 0, carbs: 0, fats: 0 } }
};

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
});

function saveAllData() {
    localStorage.setItem('dietApp_userData', JSON.stringify(userData));
    localStorage.setItem('dietApp_macros', JSON.stringify(currentMacros));
}

function loadSavedData() {
    const savedUser = localStorage.getItem('dietApp_userData');
    const savedMacros = localStorage.getItem('dietApp_macros');

    if (savedUser && savedMacros) {
        userData = JSON.parse(savedUser);
        currentMacros = JSON.parse(savedMacros);
        
        // Reset daily counters if it's a new day
        const today = new Date().toISOString().split('T')[0];
        if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
        
        // Check if we need to reset today's temporary counters
        // This is simple: if the last update wasn't today, reset the active counters
        const lastUpdate = localStorage.getItem('dietApp_lastUpdate');
        if (lastUpdate !== today) {
            // Save yesterday's data into history before resetting if not already there
            if (lastUpdate) {
                currentMacros.dailyHistory[lastUpdate] = {
                    calories: currentMacros.calories,
                    protein: currentMacros.protein,
                    carbs: currentMacros.carbs,
                    fats: currentMacros.fats
                };
            }
            
            // Reset for the new day
            currentMacros.calories = 0;
            currentMacros.protein = 0;
            currentMacros.carbs = 0;
            currentMacros.fats = 0;
            currentMacros.foodHistory = []; // Optional: keep or clear history? Image suggests clear or separate.
            
            localStorage.setItem('dietApp_lastUpdate', today);
            saveAllData();
        }

        // Если уже есть рассчитанные цели, идем сразу на главный экран
        if (currentMacros.totalCalories > 0) {
            setTimeout(() => {
                initHomeScreenFromSaved();
                nextStep(12);
            }, 100);
        }
    }
}

function initHomeScreenFromSaved() {
    // Обновляем UI из сохраненных данных
    const caloriesLeft = Math.max(0, currentMacros.totalCalories - currentMacros.calories);
    const proteinLeft = Math.max(0, currentMacros.totalProtein - currentMacros.protein);
    const carbsLeft = Math.max(0, currentMacros.totalCarbs - currentMacros.carbs);
    const fatsLeft = Math.max(0, currentMacros.totalFats - currentMacros.fats);

    document.getElementById('home-calories-left').innerText = caloriesLeft;
    document.getElementById('home-protein-eaten').innerText = proteinLeft;
    document.getElementById('home-carbs-eaten').innerText = carbsLeft;
    document.getElementById('home-fats-eaten').innerText = fatsLeft;

    setHomeProgress('home-ring-calories', (currentMacros.calories / currentMacros.totalCalories) * 100, 282.7);
    setHomeProgress('home-ring-protein', (currentMacros.protein / currentMacros.totalProtein) * 100, 100);
    setHomeProgress('home-ring-carbs', (currentMacros.carbs / currentMacros.totalCarbs) * 100, 100);
    setHomeProgress('home-ring-fats', (currentMacros.fats / currentMacros.totalFats) * 100, 100);

    // Восстанавливаем историю еды
    const foodList = document.getElementById('food-list');
    foodList.innerHTML = '';
    
    if (currentMacros.foodHistory && currentMacros.foodHistory.length > 0) {
        currentMacros.foodHistory.forEach(itemHtml => {
            const div = document.createElement('div');
            div.className = 'food-item';
            div.innerHTML = itemHtml;
            foodList.appendChild(div);
        });
    } else {
        foodList.innerHTML = '<div class="empty-state">Пока нет записей. Нажмите +, чтобы добавить.</div>';
    }

    updateCalendarDates();
}

const tg = window.Telegram.WebApp;
tg.expand();

function nextStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) targetStep.classList.add('active');
    
    // Manage Global Tab Bar visibility
    const globalTabBar = document.getElementById('global-tab-bar');
    if (globalTabBar) {
        // Show tab bar only on main screens (12: Home, 15: Progress, 16: Settings)
        if (stepNumber === 12 || stepNumber === 15 || stepNumber === 16) {
            globalTabBar.style.display = 'flex';
            
            // Update active state in tab bar
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
    
    // Рассчитываем возраст примерно
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
    }, 40); // Скорость анимации (40мс * 100 = 4 секунды на весь процесс)
}

async function fetchGeminiTips(userData, calories, carbs, protein, fats) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GOOGLE_API_KEY}`;
    
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
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
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
    console.log('showResults() called');
    
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    console.log('Height:', height, 'Weight:', weight);
    
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
    
    console.log('Calculated calories:', calories);
    
    // Расчет БЖУ (Примерное распределение: 30% белки, 30% жиры, 40% углеводы)
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
    document.getElementById('goal-text').innerText = `Ваша цель: ${goalMap[userData.goal] || 'Здоровье'}`;

    // Анимация колец (100% заполнение для примера)
    setProgress('ring-calories', 100);
    setProgress('ring-carbs', 85);
    setProgress('ring-protein', 90);
    setProgress('ring-fats', 70);

    console.log('Starting fetchGeminiTips...');
    
    // Загрузка советов от Gemini
    fetchGeminiTips(userData, calories, carbs, protein, fats).then(tips => {
        console.log('Tips received:', tips);
        const container = document.getElementById('ai-tips');
        container.innerHTML = '';
        tips.forEach(tip => {
            container.innerHTML += `
                <div class="tip-item">
                    <div class="tip-icon">${tip.icon}</div>
                    <div class="tip-text">${tip.text}</div>
                </div>
            `;
        });
        
        console.log('Moving to step 11');
        nextStep(11);
    }).catch(error => {
        console.error('Error in fetchGeminiTips:', error);
        // Even if tips fail, still move to next step
        nextStep(11);
    });
}

let videoStream = null;
async function openCamera() {
    // Используем нативный способ через input для избежания постоянных запросов разрешений
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Прямой вызов камеры на мобильных устройствах
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            document.getElementById('analyzed-img').src = imageData;
            startAnalysis(imageData);
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

function closeCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    nextStep(12);
}

function takePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg');
    document.getElementById('analyzed-img').src = imageData;
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    startAnalysis(imageData);
}

async function startAnalysis(imageData) {
    nextStep(14);
    
    // Анимация прогресса
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
    console.log("Starting finishAnalysis...");
    // Вызываем Gemini для анализа еды
    const prompt = `Анализируй это изображение еды максимально точно. 
    1. Определи конкретное название блюда или основного продукта СТРОГО на РУССКОМ ЯЗЫКЕ. Даже если это "Burger", пиши "Бургер".
    2. Оцени размер порции визуально.
    3. Рассчитай примерное содержание: калории (ккал), белки (г), жиры (г), углеводы (г).
    
    СПРАВКА ДЛЯ ТОЧНОСТИ: 
    - Авокадо (половина, ~70г) = 110 ккал.
    - Авокадо (целое, ~150г) = 240 ккал.
    - Яйцо (1 шт) = 70 ккал.
    Будь максимально реалистичен.
    
    Верни ответ СТРОГО в формате JSON без лишнего текста и без markdown-разметки:
    {"name": "Название на русском", "calories": 450, "protein": 25, "carbs": 5, "fats": 35}`;
    
    try {
        if (!CONFIG.GOOGLE_API_KEY) {
            throw new Error("API Key is missing in CONFIG");
        }

        console.log("Fetching from Gemini 2.0...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } }] }]
            })
        });

        const data = await response.json();
        console.log("Gemini Raw Data received:", data);

        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }
        
        if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            console.error("Gemini response structure is invalid:", data);
            throw new Error("Empty or blocked response");
        }

        let text = data.candidates[0].content.parts[0].text;
        console.log("Gemini response text:", text);
        
        // Очистка от возможной markdown разметки
        text = text.replace(/```json|```/g, '').trim();
        
        const result = JSON.parse(text);
        console.log("Parsed result:", result);
        addFoodToHome(result, imageData);
    } catch (err) {
        console.error("AI Analysis error details:", err);
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert(`[v${CONFIG.VERSION}] Ошибка анализа: ${err.message}`);
        } else {
            alert(`Ошибка анализа: ${err.message}`);
        }
        nextStep(12); // Возвращаемся на главный экран в любом случае при ошибке
    }
}

function addFoodToHome(food, image) {
    // Обновляем съеденное
    currentMacros.protein += food.protein;
    currentMacros.carbs += food.carbs;
    currentMacros.fats += food.fats;
    currentMacros.calories += food.calories;

    // Update daily history immediately
    const today = new Date().toISOString().split('T')[0];
    if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
    currentMacros.dailyHistory[today] = {
        calories: currentMacros.calories,
        protein: currentMacros.protein,
        carbs: currentMacros.carbs,
        fats: currentMacros.fats
    };

    // Рассчитываем остаток
    const caloriesLeft = Math.max(0, currentMacros.totalCalories - currentMacros.calories);
    const proteinLeft = Math.max(0, currentMacros.totalProtein - currentMacros.protein);
    const carbsLeft = Math.max(0, currentMacros.totalCarbs - currentMacros.carbs);
    const fatsLeft = Math.max(0, currentMacros.totalFats - currentMacros.fats);
    
    // Обновляем UI (Остаток)
    document.getElementById('home-calories-left').innerText = caloriesLeft;
    document.getElementById('home-protein-eaten').innerText = proteinLeft;
    document.getElementById('home-carbs-eaten').innerText = carbsLeft;
    document.getElementById('home-fats-eaten').innerText = fatsLeft;

    // Обновляем кольца (процент съеденного)
    setHomeProgress('home-ring-calories', (currentMacros.calories / currentMacros.totalCalories) * 100, 282.7);
    setHomeProgress('home-ring-protein', (currentMacros.protein / currentMacros.totalProtein) * 100, 100);
    setHomeProgress('home-ring-carbs', (currentMacros.carbs / currentMacros.totalCarbs) * 100, 100);
    setHomeProgress('home-ring-fats', (currentMacros.fats / currentMacros.totalFats) * 100, 100);

    // Добавляем в список
    const foodList = document.getElementById('food-list');
    if (foodList.querySelector('.empty-state')) foodList.innerHTML = '';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const itemContent = `
        <img src="${image}" class="food-img">
        <div class="food-details">
            <div class="food-header">
                <h4>${food.name}</h4>
                <span class="food-time">${time}</span>
            </div>
            <div class="food-calories"><span class="fire-icon">🔥</span> ${food.calories} ккал</div>
            <div class="food-macros-mini">
                <span><div class="macro-mini-dot" style="background: #ff8a80;"></div> Б: ${food.protein}г</span>
                <span><div class="macro-mini-dot" style="background: #ffcc80;"></div> У: ${food.carbs}г</span>
                <span><div class="macro-mini-dot" style="background: #81d4fa;"></div> Ж: ${food.fats}г</span>
            </div>
        </div>
    `;
    
    const item = document.createElement('div');
    item.className = 'food-item';
    item.innerHTML = itemContent;
    foodList.prepend(item);

    // Сохраняем в историю
    if (!currentMacros.foodHistory) currentMacros.foodHistory = [];
    currentMacros.foodHistory.unshift(itemContent);
    saveAllData();

    nextStep(12);
}

function goToHome() {
    // Сохраняем цели из расчета
    currentMacros.totalCalories = parseInt(document.getElementById('res-calories').innerText);
    currentMacros.totalProtein = parseInt(document.getElementById('res-protein').innerText.replace('г', ''));
    currentMacros.totalCarbs = parseInt(document.getElementById('res-carbs').innerText.replace('г', ''));
    currentMacros.totalFats = parseInt(document.getElementById('res-fats').innerText.replace('г', ''));
    
    // Изначально все съеденное по нулям
    currentMacros.calories = 0;
    currentMacros.protein = 0;
    currentMacros.carbs = 0;
    currentMacros.fats = 0;
    currentMacros.foodHistory = [];

    // В UI отображаем остаток (равен полной цели)
    document.getElementById('home-calories-left').innerText = currentMacros.totalCalories;
    document.getElementById('home-calories-total').innerText = `Ккал осталось`;
    
    document.getElementById('home-protein-eaten').innerText = currentMacros.totalProtein;
    document.getElementById('home-carbs-eaten').innerText = currentMacros.totalCarbs;
    document.getElementById('home-fats-eaten').innerText = currentMacros.totalFats;

    // Сбрасываем кольца
    setHomeProgress('home-ring-calories', 0, 282.7);
    setHomeProgress('home-ring-protein', 0, 100);
    setHomeProgress('home-ring-carbs', 0, 100);
    setHomeProgress('home-ring-fats', 0, 100);

    // Очищаем список еды
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
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Находим понедельник текущей недели
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    const dayElements = document.querySelectorAll('.calendar-day');
    dayElements.forEach((el, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        
        const dayNum = date.getDate();
        el.querySelector('.day-number').innerText = dayNum;
        
        // Подсвечиваем сегодняшний день
        if (date.toDateString() === now.toDateString()) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function updateProgressPage() {
    const today = new Date().toISOString().split('T')[0];
    
    // Ensure daily history exists
    if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
    
    // Update current day from currentMacros
    currentMacros.dailyHistory[today] = {
        calories: currentMacros.calories,
        protein: currentMacros.protein,
        carbs: currentMacros.carbs,
        fats: currentMacros.fats
    };

    // 1. Update Total Calories
    const progressTotalCalories = document.getElementById('progress-total-calories');
    if (progressTotalCalories) {
        progressTotalCalories.innerText = currentMacros.calories;
    }

    // 2. Render Chart
    renderProgressChart();

    // 3. Update BMI
    updateBMI();

    nextStep(15);
}

function renderProgressChart() {
    const container = document.getElementById('chart-bars-container');
    if (!container) return;
    container.innerHTML = '';
    
    const daysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    
    // Get last 7 days starting from Monday of current week
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = daysShort[date.getDay()];
        
        const data = currentMacros.dailyHistory[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        
        // Calculate heights (max 150px)
        const maxVal = 5000; // Updated for higher calorie support
        const pHeight = Math.min(150, (data.protein * 4 / maxVal) * 150);
        const cHeight = Math.min(150, (data.carbs * 4 / maxVal) * 150);
        const fHeight = Math.min(150, (data.fats * 9 / maxVal) * 150);

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
    let pointerPos = 50; // default middle

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
    console.log("Открываем настройки...");

    // 1. Загружаем данные из Телеграм (Имя + Фото)
    const tg = window.Telegram.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Имя
        const nameEl = document.getElementById('settings-name');
        if (nameEl) {
            nameEl.innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        }
        
        // Аватарка
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
        // Если открыто не в телеграме
        const nameEl = document.getElementById('settings-name');
        if (nameEl) nameEl.innerText = 'Гость';
    }

    // 2. Словари для перевода данных в текст
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
    
    // 3. Заполняем поля (с проверкой на ошибки)
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // Берем данные из глобальной переменной userData
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