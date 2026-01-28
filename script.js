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

const tg = window.Telegram.WebApp;
tg.expand();

function nextStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
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
    const GEMINI_API_KEY = "AIzaSyAREA3WrdAOeizK3ZYPuvsL4NvNfYB6muQ"; // From .env
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
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
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // Расчет калорий
    let bmr;
    if (userData.gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) - 161;
    }
    const calories = Math.round(bmr * userData.activity);
    
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

    // Загрузка советов от Gemini
    fetchGeminiTips(userData, calories, carbs, protein, fats).then(tips => {
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
    });

    nextStep(11);
}

function goToHome() {
    // Обновляем данные на главной странице
    document.getElementById('home-calories-left').innerText = document.getElementById('res-calories').innerText;
    document.getElementById('home-protein-left').innerText = document.getElementById('res-protein').innerText.replace('г', '');
    document.getElementById('home-carbs-left').innerText = document.getElementById('res-carbs').innerText.replace('г', '');
    document.getElementById('home-fats-left').innerText = document.getElementById('res-fats').innerText.replace('г', '');

    // Обновляем кольца на главной (пока 0% прогресса, так как ничего не съедено)
    setHomeProgress('home-ring-calories', 0, 282.7); // 2 * PI * 45
    setHomeProgress('home-ring-protein', 0, 100);
    setHomeProgress('home-ring-carbs', 0, 100);
    setHomeProgress('home-ring-fats', 0, 100);

    // Обновляем даты календаря
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

function setProgress(id, percent) {
    const circle = document.getElementById(id);
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
}

function calculateAndSend() {
    showResults();
    // Отправляем данные боту (фоном)
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    let bmr;
    if (userData.gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * userData.age) - 161;
    }
    const totalCalories = Math.round(bmr * userData.activity);

    tg.sendData(JSON.stringify({
        calories: totalCalories,
        details: userData
    }));
}