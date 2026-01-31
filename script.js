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

// 1. Инициализация и навигация
function initApp() {
    console.log('Initializing application...');
    
    // Сброс UI при старте: скрываем все модалки, спиннеры и оверлеи
    document.querySelectorAll('.step, .loading-container, .analysis-step, .camera-step').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });

    try {
        loadUserData();
    } catch (e) {
        console.error("Critical load error:", e);
        localStorage.clear();
    }

    const isDataValid = userData &&
                       userData.gender &&
                       userData.height &&
                       userData.weight &&
                       userData.goal &&
                       userData.goal !== '';

    console.log('Is user data valid?', isDataValid);

    if (isDataValid) {
        console.log('Navigating to Dashboard (step-12)');
        goToStep(12);
    } else {
        console.log('Navigating to Registration (step-1)');
        localStorage.clear();
        goToStep(1);
    }
}

function startApp() {
    initApp();
}

function nextStep(step) {
    console.log(`Navigating to step-${step}`);
    
    const target = document.getElementById(`step-${step}`);
    if (!target) {
        console.error(`Error: Step-${step} element not found!`);
        return;
    }

    document.querySelectorAll('.step, .loading-container, .analysis-step, .camera-step').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });

    target.classList.remove('hidden');
    target.classList.add('active');
    
    // Progress bar update logic
    const stepProgressMap = {
        1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70, 8: 80, 9: 90, 10: 100
    };
    
    if (stepProgressMap[step]) {
        const progressBar = target.querySelector('.progress');
        if (progressBar) progressBar.style.width = `${stepProgressMap[step]}%`;
    }

    if (step === 10) {
        startLoading();
    }
    
    if (step === 11) {
        calculateMacros();
    }
    
    if (step === 12) {
        updateHomeUI();
        updateCalendarDates();
    }
}

function prevStep(step) {
    nextStep(step);
}

function goToStep(step) {
    nextStep(step);
}

// 2. Сбор данных
function selectGender(gender) {
    console.log('Gender selected:', gender);
    userData.gender = gender;
    nextStep(2);
}

function selectActivity(activity) {
    console.log('Activity selected:', activity);
    userData.activity = activity;
    nextStep(3);
}

function savePhysical() {
    console.log('savePhysical called');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    
    const height = heightInput ? parseInt(heightInput.value) : null;
    const weight = weightInput ? parseInt(weightInput.value) : null;
    
    // В текущей верстке index.html на шаге 4 только Рост и Вес.
    // Возраст (age) может отсутствовать или быть на другом шаге,
    // но в userData он есть. Для прохождения шага 4 достаточно роста и веса.
    
    console.log('Weight/Height saved, going to next step', { height, weight });
    
    if (height && weight) {
        userData.height = height;
        userData.weight = weight;
        // Если на этом шаге нет поля возраста, берем дефолтный или из userData
        if (!userData.age) userData.age = 25;
        
        nextStep(5); // Идем к Дате Рождения
    } else {
        console.log('Validation failed:', { height, weight });
        alert('Пожалуйста, заполните все поля (Рост и Вес)');
    }
}

function saveBorn() {
    const input = document.getElementById('birthdate');
    const val = input ? input.value : null;
    console.log('Birthday selected:', val);

    if (val) {
        userData.birthdate = val;
        nextStep(6);
    } else {
        alert('Пожалуйста, выберите дату');
    }
}

function selectGoal(goal) {
    console.log('Goal selected:', goal);
    userData.goal = goal;
    nextStep(7);
}

function selectStopper(stopper) {
    console.log('Stopper selected:', stopper);
    userData.stopper = stopper;
    nextStep(8);
}

function selectDiet(diet) {
    console.log('Diet selected:', diet);
    userData.diet = diet;
    nextStep(9);
}

function selectAccomplish(accomplish) {
    console.log('Accomplish selected:', accomplish);
    userData.accomplish = accomplish;
    nextStep(10);
}

// 3. Анализ и расчеты
function startLoading() {
    console.log('startLoading called');
    let progress = 0;
    const bar = document.getElementById('load-progress');
    const percentText = document.getElementById('load-percentage');
    const statusText = document.getElementById('load-status');
    
    const statuses = [
        "Анализируем ваш метаболизм...",
        "Рассчитываем оптимальные макросы...",
        "Создаем ваш персональный план...",
        "Финальная настройка результатов..."
    ];

    const checks = [
        'check-calories',
        'check-carbs',
        'check-protein',
        'check-fats',
        'check-health'
    ];

    // Сброс галочек перед началом
    checks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active', 'checked');
    });

    const interval = setInterval(() => {
        progress += 1;
        if (bar) bar.style.width = `${progress}%`;
        if (percentText) percentText.innerText = `${progress}%`;
        
        // Обновление статуса
        if (progress % 25 === 0) {
            const statusIdx = Math.min(statuses.length - 1, Math.floor(progress / 26));
            if (statusText) statusText.innerText = statuses[statusIdx];
        }

        // Ставим галочки по мере прогресса
        if (progress === 20) document.getElementById(checks[0])?.classList.add('checked');
        if (progress === 40) document.getElementById(checks[1])?.classList.add('checked');
        if (progress === 60) document.getElementById(checks[2])?.classList.add('checked');
        if (progress === 80) document.getElementById(checks[3])?.classList.add('checked');
        if (progress === 95) document.getElementById(checks[4])?.classList.add('checked');

        if (progress >= 100) {
            clearInterval(interval);
            console.log('Loading complete');
            const finalBtn = document.getElementById('final-btn');
            if (finalBtn) {
                finalBtn.style.display = 'block';
                finalBtn.classList.add('fade-in');
                finalBtn.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, 40);
}

function showResults() {
    console.log('showResults called');
    calculateMacros();
    nextStep(11);
}

function calculateMacros() {
    console.log('Calculating macros for', userData);
    let bmr;
    if (userData.gender === 'male') {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age + 5;
    } else {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age - 161;
    }

    const tdee = bmr * (userData.activity || 1.2);
    
    if (userData.goal === 'lose') {
        currentMacros.totalCalories = Math.round(tdee - 500);
    } else if (userData.goal === 'gain') {
        currentMacros.totalCalories = Math.round(tdee + 300);
    } else {
        currentMacros.totalCalories = Math.round(tdee);
    }

    currentMacros.totalProtein = Math.round((currentMacros.totalCalories * 0.3) / 4);
    currentMacros.totalCarbs = Math.round((currentMacros.totalCalories * 0.4) / 4);
    currentMacros.totalFats = Math.round((currentMacros.totalCalories * 0.3) / 9);

    const updateEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    updateEl('res-calories', currentMacros.totalCalories);
    updateEl('res-protein', `${currentMacros.totalProtein}г`);
    updateEl('res-carbs', `${currentMacros.totalCarbs}г`);
    updateEl('res-fats', `${currentMacros.totalFats}г`);
    
    const goalEl = document.getElementById('goal-text');
    if (goalEl) {
        const goals = { 'lose': 'Похудение', 'maintain': 'Поддержание веса', 'gain': 'Набор массы' };
        goalEl.innerText = `Ваша цель: ${goals[userData.goal] || 'Здоровье'}`;
    }

    const weightEl = document.getElementById('target-weight');
    if (weightEl) weightEl.innerText = `${userData.weight} кг`;
    
    saveUserData();
}

function goToHome() {
    console.log('Entering Dashboard');
    
    // Показываем таббар
    const tabBar = document.getElementById('global-tab-bar');
    if (tabBar) {
        tabBar.style.display = 'flex';
        tabBar.classList.remove('hidden');
    }

    // Сохраняем и обновляем UI
    saveUserData();
    updateHomeUI();
    updateCalendarDates();
    
    nextStep(12);
}

// 4. Основной функционал (Home)
function updateHomeUI() {
    const calLeft = currentMacros.totalCalories - currentMacros.calories;
    const calEl = document.getElementById('calories-left');
    if (calEl) calEl.innerText = calLeft > 0 ? calLeft : 0;
    
    const progress = Math.min(100, (currentMacros.calories / currentMacros.totalCalories) * 100);
    setHomeProgress('main-ring-fill', progress, 283);

    updateMacroCard('protein', currentMacros.protein, currentMacros.totalProtein, 113);
    updateMacroCard('carbs', currentMacros.carbs, currentMacros.totalCarbs, 113);
    updateMacroCard('fats', currentMacros.fats, currentMacros.totalFats, 113);

    renderFoodHistory();
}

function updateMacroCard(id, current, total, circ) {
    const percent = Math.min(100, (current / total) * 100);
    const valueEl = document.getElementById(`home-${id}-value`);
    if (valueEl) valueEl.innerText = `${current}g`;
    
    const circle = document.getElementById(`${id}-ring-fill`);
    if (circle) {
        const offset = circ - (percent / 100 * circ);
        circle.style.strokeDasharray = `${circ} ${circ}`;
        circle.style.strokeDashoffset = offset;
    }
}

function renderFoodHistory() {
    const container = document.getElementById('food-history-container');
    if (!container) return;
    
    if (currentMacros.foodHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет записей за сегодня</div>';
        return;
    }

    container.innerHTML = currentMacros.foodHistory.map((item, index) => `
        <div class="food-item">
            ${item.image ? `<img src="${item.image}" class="food-img">` : '<div class="food-img-placeholder">🍲</div>'}
            <div class="food-details">
                <div class="food-header">
                    <h4>${item.name}</h4>
                    <span class="food-time">${item.time || 'Сегодня'}</span>
                </div>
                <div class="food-calories">
                    <span class="fire-icon">🔥</span> ${item.calories} ккал
                </div>
                <div class="food-macros-mini">
                    <span><div class="macro-mini-dot" style="background: #ff7070"></div> ${item.protein}г</span>
                    <span><div class="macro-mini-dot" style="background: #ffb366"></div> ${item.carbs}г</span>
                    <span><div class="macro-mini-dot" style="background: #66b3ff"></div> ${item.fats}г</span>
                </div>
            </div>
            <button class="delete-food-btn" onclick="deleteFoodItem(${index})">×</button>
        </div>
    `).join('');
}

// 5. Камера и Анализ (Симуляция)
function openCamera() {
    const video = document.getElementById('camera-video');
    nextStep(13); // camera-step

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            if (video) video.srcObject = stream;
        })
        .catch(err => {
            console.error("Camera error:", err);
            setTimeout(simulateAnalysis, 1000);
        });
}

function closeCamera() {
    const video = document.getElementById('camera-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    nextStep(12);
}

function takePhoto() {
    closeCamera();
    simulateAnalysis();
}

function simulateAnalysis() {
    nextStep(14); // analysis-step
    
    const results = [
        { name: "Авокадо тост", calories: 350, protein: 12, carbs: 45, fats: 18 },
        { name: "Куриный салат", calories: 420, protein: 35, carbs: 15, fats: 22 },
        { name: "Лосось с рисом", calories: 580, protein: 42, carbs: 55, fats: 24 }
    ];
    
    const randomFood = results[Math.floor(Math.random() * results.length)];
    
    setTimeout(() => {
        addFoodItem(randomFood);
        nextStep(12);
    }, 2500);
}

function addFoodItem(item) {
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const newItem = {
        ...item,
        time: timeStr,
        image: null
    };

    currentMacros.foodHistory.unshift(newItem);
    currentMacros.calories += item.calories;
    currentMacros.protein += item.protein;
    currentMacros.carbs += item.carbs;
    currentMacros.fats += item.fats;

    updateHomeUI();
    saveUserData();
}

function deleteFoodItem(index) {
    const item = currentMacros.foodHistory[index];
    currentMacros.calories -= item.calories;
    currentMacros.protein -= item.protein;
    currentMacros.carbs -= item.carbs;
    currentMacros.fats -= item.fats;
    
    currentMacros.foodHistory.splice(index, 1);
    
    updateHomeUI();
    saveUserData();
}

// 6. Хранение данных (localStorage)
function saveUserData() {
    try {
        const data = {
            user: userData,
            macros: currentMacros,
            lastUpdate: new Date().toDateString()
        };
        localStorage.setItem('web4fun_data', JSON.stringify(data));
        console.log("Data saved successfully");
    } catch (e) {
        console.error("Save error:", e);
    }
}

function loadUserData() {
    try {
        const saved = localStorage.getItem('web4fun_data');
        if (!saved) return;

        const data = JSON.parse(saved);
        if (!data || !data.user || !data.macros) {
            throw new Error("Invalid data structure");
        }

        userData = data.user;
        const today = new Date().toDateString();
        
        if (data.lastUpdate !== today) {
            if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
            const d = new Date(data.lastUpdate);
            const histDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            currentMacros.dailyHistory[histDate] = {
                calories: data.macros.calories,
                protein: data.macros.protein,
                carbs: data.macros.carbs,
                fats: data.macros.fats
            };
            
            currentMacros.calories = 0;
            currentMacros.protein = 0;
            currentMacros.carbs = 0;
            currentMacros.fats = 0;
            currentMacros.foodHistory = [];
        } else {
            currentMacros = data.macros;
        }
        
        currentMacros.totalCalories = data.macros.totalCalories;
        currentMacros.totalProtein = data.macros.totalProtein;
        currentMacros.totalCarbs = data.macros.totalCarbs;
        currentMacros.totalFats = data.macros.totalFats;
        
        if (!currentMacros.dailyHistory) currentMacros.dailyHistory = data.macros.dailyHistory || {};
    } catch (e) {
        console.error("Error parsing localStorage:", e);
        localStorage.clear();
    }
}

function resetAppData() {
    if (confirm("Вы уверены, что хотите сбросить все данные?")) {
        localStorage.clear();
        location.reload();
    }
}

// 7. Прогресс и Календарь
function updateCalendar() {
    nextStep(15);
    updateProgressPage();
}

function setHomeProgress(id, percent, circumference) {
    const circle = document.getElementById(id);
    if (!circle) return;
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
}

function updateCalendarDates() {
    const days = ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'];
    const now = new Date();
    
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    const dayElements = document.querySelectorAll('.calendar-day');
    dayElements.forEach((el, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        
        const dayNum = date.getDate();
        const numEl = el.querySelector('.day-number');
        const nameEl = el.querySelector('.day-name');
        if (numEl) numEl.innerText = dayNum;
        if (nameEl) nameEl.innerText = days[date.getDay()];
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dayData = currentMacros.dailyHistory ? currentMacros.dailyHistory[dateStr] : null;
        
        let percent = 0;
        if (dayData && dayData.calories) {
            percent = Math.min(100, Math.round((dayData.calories / currentMacros.totalCalories) * 100));
        }
        
        const ring = el.querySelector('.day-ring-container');
        if (ring) {
            ring.style.background = `conic-gradient(#FF9F0A ${percent}%, #E5E5EA 0)`;
        }

        if (date.toDateString() === now.toDateString()) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function updateProgressPage() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
    
    currentMacros.dailyHistory[today] = {
        calories: currentMacros.calories,
        protein: currentMacros.protein,
        carbs: currentMacros.carbs,
        fats: currentMacros.fats
    };

    const calEl = document.getElementById('progress-total-calories');
    if (calEl) calEl.innerText = currentMacros.calories;

    renderProgressChart();
    updateBMI();
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
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const dayLabel = daysShort[date.getDay()];
        const data = currentMacros.dailyHistory[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        
        const maxVal = 5000;
        const pHeight = Math.min(150, (data.protein * 4 / maxVal) * 150);
        const cHeight = Math.min(150, (data.carbs * 4 / maxVal) * 150);
        const fHeight = Math.min(150, (data.fats * 9 / maxVal) * 150);

        container.innerHTML += `
            <div class="bar-column">
                <div class="bar-stack">
                    <div class="segment protein" style="height: ${pHeight}px"></div>
                    <div class="segment carbs" style="height: ${cHeight}px"></div>
                    <div class="segment fats" style="height: ${fHeight}px"></div>
                </div>
                <span class="day-label">${dayLabel}</span>
            </div>
        `;
    }
}

function updateBMI() {
    const bmi = userData.weight / ((userData.height / 100) ** 2);
    const bmiEl = document.getElementById('bmi-value');
    if (bmiEl) bmiEl.innerText = bmi.toFixed(1);
    
    const pointer = document.getElementById('bmi-pointer');
    if (pointer) {
        let pos = ((bmi - 15) / (35 - 15)) * 100;
        pos = Math.max(0, Math.min(100, pos));
        pointer.style.left = `${pos}%`;
    }
}

function openSettings() {
    nextStep(16);
    updateSettingsUI();
}

function updateSettingsUI() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };
    set('set-weight', `${userData.weight} кг`);
    set('set-height', `${userData.height} см`);
    set('set-age', userData.age);
    set('set-goal', userData.goal);
    set('set-target-calories', currentMacros.totalCalories);
    set('set-target-protein', `${currentMacros.totalProtein}г`);
    set('set-target-carbs', `${currentMacros.totalCarbs}г`);
    set('set-target-fats', `${currentMacros.totalFats}г`);
}

document.addEventListener('DOMContentLoaded', startApp);
