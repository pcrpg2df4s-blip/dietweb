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

// 1. Инициализация и навигация
function startApp() {
    loadUserData();
    if (userData.gender && userData.height) {
        // Если данные уже есть, переходим на экран 14 (Home)
        goToStep(14);
    } else {
        nextStep(1);
    }
}

function nextStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    
    // Обновляем прогресс-бар (шаги 1-10)
    if (step <= 10) {
        const progress = (step / 10) * 100;
        const progressBar = document.querySelector('.progress');
        if (progressBar) progressBar.style.width = `${progress}%`;
    }

    // Обработка специальных шагов
    if (step === 11) {
        // Запуск экрана загрузки/анализа
        startLoading();
    }
    
    if (step === 12) {
        calculateMacros();
    }
    
    if (step === 14) {
        updateHomeUI();
        updateCalendarDates();
    }
}

function goToStep(step) {
    nextStep(step);
}

// 2. Сбор данных
function selectGender(gender) {
    userData.gender = gender;
    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    setTimeout(() => nextStep(2), 300);
}

function selectActivity(activity) {
    userData.activity = activity;
    setTimeout(() => nextStep(3), 300);
}

function savePhysical() {
    userData.height = parseInt(document.getElementById('height').value);
    userData.weight = parseInt(document.getElementById('weight').value);
    userData.age = parseInt(document.getElementById('age').value);
    if (userData.height && userData.weight && userData.age) {
        nextStep(4);
    } else {
        alert('Please fill all fields');
    }
}

function selectGoal(goal) {
    userData.goal = goal;
    nextStep(5);
}

function selectStopper(stopper) {
    userData.stopper = stopper;
    nextStep(6);
}

function selectDiet(diet) {
    userData.diet = diet;
    nextStep(7);
}

function selectAccomplish(accomplish) {
    userData.accomplish = accomplish;
    nextStep(8);
}

function saveBirthdate() {
    userData.birthdate = document.getElementById('birthdate').value;
    if (userData.birthdate) {
        nextStep(9);
    } else {
        alert('Please select date');
    }
}

// 3. Анализ и расчеты
function startLoading() {
    let progress = 0;
    const bar = document.getElementById('loading-bar-fill');
    const text = document.getElementById('loading-status-text');
    const title = document.getElementById('loading-title');
    
    const statuses = [
        "Analyzing your metabolism...",
        "Calculating optimal macros...",
        "Creating your custom plan...",
        "Finalizing results..."
    ];

    const interval = setInterval(() => {
        progress += 2;
        bar.style.width = `${progress}%`;
        
        if (progress % 25 === 0) {
            text.innerText = statuses[Math.floor(progress / 26)];
        }

        if (progress >= 100) {
            clearInterval(interval);
            nextStep(12);
        }
    }, 50);
}

function calculateMacros() {
    // BMR Calculation (Mifflin-St Jeor Equation)
    let bmr;
    if (userData.gender === 'male') {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age + 5;
    } else {
        bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age - 161;
    }

    const tdee = bmr * userData.activity;
    
    // Set calories based on goal
    if (userData.goal === 'Lose weight') {
        currentMacros.totalCalories = Math.round(tdee - 500);
    } else if (userData.goal === 'Gain muscle') {
        currentMacros.totalCalories = Math.round(tdee + 300);
    } else {
        currentMacros.totalCalories = Math.round(tdee);
    }

    // Set macro ratios
    currentMacros.totalProtein = Math.round((currentMacros.totalCalories * 0.3) / 4);
    currentMacros.totalCarbs = Math.round((currentMacros.totalCalories * 0.4) / 4);
    currentMacros.totalFats = Math.round((currentMacros.totalCalories * 0.3) / 9);

    document.getElementById('res-calories').innerText = currentMacros.totalCalories;
    document.getElementById('res-protein').innerText = `${currentMacros.totalProtein}g`;
    document.getElementById('res-carbs').innerText = `${currentMacros.totalCarbs}g`;
    document.getElementById('res-fats').innerText = `${currentMacros.totalFats}g`;
    
    saveUserData();
}

// 4. Основной функционал (Home)
function updateHomeUI() {
    const calLeft = currentMacros.totalCalories - currentMacros.calories;
    document.getElementById('calories-left').innerText = calLeft > 0 ? calLeft : 0;
    
    // Update main ring
    const progress = Math.min(100, (currentMacros.calories / currentMacros.totalCalories) * 100);
    setHomeProgress('main-ring-fill', progress, 283); // 2 * PI * 45

    // Update macro rings
    updateMacroCard('protein', currentMacros.protein, currentMacros.totalProtein, 113); // 2 * PI * 18
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
        container.innerHTML = '<div class="empty-state">No meals added today</div>';
        return;
    }

    container.innerHTML = currentMacros.foodHistory.map((item, index) => `
        <div class="food-item">
            ${item.image ? `<img src="${item.image}" class="food-img">` : '<div class="food-img-placeholder">🍲</div>'}
            <div class="food-details">
                <div class="food-header">
                    <h4>${item.name}</h4>
                    <span class="food-time">${item.time || 'Today'}</span>
                </div>
                <div class="food-calories">
                    <span class="fire-icon">🔥</span> ${item.calories} kcal
                </div>
                <div class="food-macros-mini">
                    <span><div class="macro-mini-dot" style="background: #ff7070"></div> ${item.protein}g</span>
                    <span><div class="macro-mini-dot" style="background: #ffb366"></div> ${item.carbs}g</span>
                    <span><div class="macro-mini-dot" style="background: #66b3ff"></div> ${item.fats}g</span>
                </div>
            </div>
            <button class="delete-food-btn" onclick="deleteFoodItem(${index})">×</button>
        </div>
    `).join('');
}

// 5. Камера и Анализ (Симуляция)
function openCamera() {
    const video = document.getElementById('camera-video');
    const step = document.querySelector('.camera-step');
    step.classList.add('active');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Camera error:", err);
            // Если камера не поддерживается, просто имитируем
            setTimeout(simulateAnalysis, 1000);
        });
}

function closeCamera() {
    const video = document.getElementById('camera-video');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    document.querySelector('.camera-step').classList.remove('active');
}

function takePhoto() {
    // В реальности здесь захват кадра. Мы просто имитируем.
    closeCamera();
    simulateAnalysis();
}

function simulateAnalysis() {
    const analysisStep = document.querySelector('.analysis-step');
    analysisStep.classList.add('active');
    
    // Имитация "умного" анализа
    const results = [
        { name: "Avocado Toast", calories: 350, protein: 12, carbs: 45, fats: 18 },
        { name: "Chicken Salad", calories: 420, protein: 35, carbs: 15, fats: 22 },
        { name: "Salmon with Rice", calories: 580, protein: 42, carbs: 55, fats: 24 }
    ];
    
    const randomFood = results[Math.floor(Math.random() * results.length)];
    
    setTimeout(() => {
        analysisStep.classList.remove('active');
        addFoodItem(randomFood);
    }, 2500);
}

function addFoodItem(item) {
    const now = new Date();
    const timeStr = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const newItem = {
        ...item,
        time: timeStr,
        image: null // Здесь могла бы быть ссылка на фото
    };

    currentMacros.foodHistory.unshift(newItem);
    currentMacros.calories += item.calories;
    currentMacros.protein += item.protein;
    currentMacros.carbs += item.carbs;
    currentMacros.fats += item.fats;

    updateHomeUI();
    saveUserData();
    
    // Визуальный фидбек
    alert(`Added: ${item.name} (+${item.calories} kcal)`);
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
    const saved = localStorage.getItem('web4fun_data');
    if (saved) {
        const data = JSON.parse(saved);
        userData = data.user;
        
        // Сброс дневных данных, если наступил новый день
        const today = new Date().toDateString();
        if (data.lastUpdate !== today) {
            // Сохраняем в историю перед сбросом
            if (data.macros && data.lastUpdate) {
                const histDate = new Date(data.lastUpdate).toISOString().split('T')[0];
                if (!currentMacros.dailyHistory) currentMacros.dailyHistory = {};
                currentMacros.dailyHistory[histDate] = {
                    calories: data.macros.calories,
                    protein: data.macros.protein,
                    carbs: data.macros.carbs,
                    fats: data.macros.fats
                };
            }
            
            currentMacros.calories = 0;
            currentMacros.protein = 0;
            currentMacros.carbs = 0;
            currentMacros.fats = 0;
            currentMacros.foodHistory = [];
        } else {
            currentMacros = data.macros;
        }
        
        // Синхронизируем цели
        currentMacros.totalCalories = data.macros.totalCalories;
        currentMacros.totalProtein = data.macros.totalProtein;
        currentMacros.totalCarbs = data.macros.totalCarbs;
        currentMacros.totalFats = data.macros.totalFats;
        
        if (!currentMacros.dailyHistory) currentMacros.dailyHistory = data.macros.dailyHistory || {};
    }
}

function resetAllData() {
    if (confirm("Are you sure you want to reset all data and history?")) {
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
        el.querySelector('.day-number').innerText = dayNum;
        el.querySelector('.day-name').innerText = days[date.getDay()];
        
        // Progress Logic
        const dateStr = date.toISOString().split('T')[0];
        const dayData = currentMacros.dailyHistory ? currentMacros.dailyHistory[dateStr] : null;
        const totalCalories = currentMacros.totalCalories || 2000;
        
        let progress = 0;
        if (dayData && dayData.calories) {
            progress = Math.min(100, (dayData.calories / totalCalories) * 100);
        }
        
        const ring = el.querySelector('.day-ring-container');
        if (ring) {
            ring.style.background = `conic-gradient(var(--primary-color, #000) ${progress}%, #f0f0f5 ${progress}%)`;
            ring.style.borderRadius = '50%';
        }

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
        
        const maxVal = 5000;
        const pHeight = Math.min(150, (data.protein * 4 / maxVal) * 150);
        const cHeight = Math.min(150, (data.carbs * 4 / maxVal) * 150);
        const fHeight = Math.min(150, (data.fats * 9 / maxVal) * 150);

        const barHtml = `
            <div class="bar-column">
                <div class="bar-stack">
                    <div class="segment protein" style="height: ${pHeight}px"></div>
                    <div class="segment carbs" style="height: ${cHeight}px"></div>
                    <div class="segment fats" style="height: ${fHeight}px"></div>
                </div>
                <span class="day-label">${dayLabel}</span>
            </div>
        `;
        container.innerHTML += barHtml;
    }
}

function updateBMI() {
    const bmi = userData.weight / ((userData.height / 100) ** 2);
    const bmiEl = document.getElementById('bmi-value');
    if (bmiEl) bmiEl.innerText = bmi.toFixed(1);
    
    const pointer = document.getElementById('bmi-pointer');
    if (pointer) {
        // Simple mapping: 15 to 35 BMI -> 0% to 100%
        let pos = ((bmi - 15) / (35 - 15)) * 100;
        pos = Math.max(0, Math.min(100, pos));
        pointer.style.left = `${pos}%`;
    }
}

// 8. Настройки
function updateSettingsUI() {
    document.getElementById('set-weight').innerText = `${userData.weight} kg`;
    document.getElementById('set-height').innerText = `${userData.height} cm`;
    document.getElementById('set-age').innerText = `${userData.age}`;
    document.getElementById('set-goal').innerText = userData.goal;
    
    document.getElementById('set-target-calories').innerText = currentMacros.totalCalories;
    document.getElementById('set-target-protein').innerText = `${currentMacros.totalProtein}g`;
    document.getElementById('set-target-carbs').innerText = `${currentMacros.totalCarbs}g`;
    document.getElementById('set-target-fats').innerText = `${currentMacros.totalFats}g`;
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', startApp);
