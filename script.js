const CONFIG_LOCAL = {
    VERSION: "FINAL_1.0"
};

const API_URL = "https://white-enters-true-outputs.trycloudflare.com/api/analyze";

/**
 * Triggers haptic feedback using Telegram WebApp API or browser fallback.
 * @param {string} style - 'light', 'medium', 'heavy', 'success', 'error', 'warning'
 */
function triggerHaptic(style) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        const haptic = window.Telegram.WebApp.HapticFeedback;
        if (['light', 'medium', 'heavy'].includes(style)) {
            haptic.impactOccurred(style);
        } else if (['success', 'error', 'warning'].includes(style)) {
            haptic.notificationOccurred(style);
        } else if (style === 'selection') {
            haptic.selectionChanged();
        }
    } else if (navigator.vibrate) {
        switch (style) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'success':
                navigator.vibrate([50, 30, 50]);
                break;
            case 'error':
                navigator.vibrate([50, 100, 50]);
                break;
        }
    }
}

/**
 * Helper function to get emoji based on food name
 * @param {string} foodName
 * @returns {string} emoji
 */
function getEmojiForFood(foodName) {
    if (!foodName) return '🥗';
    const name = foodName.toLowerCase();

    const emojiMap = {
        'яблоко': '🍎', 'apple': '🍎',
        'банан': '🍌', 'banana': '🍌',
        'суп': '🥣', 'борщ': '🥣', 'солянка': '🥣', 'бульон': '🥣', 'soup': '🥣',
        'пицца': '🍕', 'pizza': '🍕',
        'бургер': '🍔', 'бутерброд': '🍔', 'сэндвич': '🍔', 'burger': '🍔', 'sandwich': '🍔',
        'кофе': '☕', 'латте': '☕', 'coffee': '☕', 'latte': '☕',
        'чай': '🍵', 'tea': '🍵',
        'курица': '🥩', 'мясо': '🥩', 'стейк': '🥩', 'chicken': '🥩', 'meat': '🥩', 'steak': '🥩',
        'рыба': '🍣', 'суши': '🍣', 'роллы': '🍣', 'fish': '🍣', 'sushi': '🍣',
        'каша': '🍚', 'овсянка': '🍚', 'рис': '🍚', 'porridge': '🍚', 'rice': '🍚',
        'торт': '🍰', 'пирожное': '🍰', 'шоколад': '🍰', 'cake': '🍰', 'chocolate': '🍰',
        'яйца': '🥚', 'омлет': '🥚', 'eggs': '🥚', 'omelette': '🥚',
        'хлеб': '🍞', 'булка': '🍞', 'bread': '🍞',
        'овощи': '🥦', 'салат': '🥗', 'vegetables': '🥦', 'salad': '🥗',
        'фрукты': '🍎', 'ягода': '🍓', 'fruits': '🍎', 'berries': '🍓',
        'молоко': '🥛', 'йогурт': '🥛', 'milk': '🥛', 'yogurt': '🥛',
        'сыр': '🧀', 'cheese': '🧀',
        'печенье': '🍪', 'cookie': '🍪',
        'мороженое': '🍦', 'ice cream': '🍦',
        'вино': '🍷', 'пиво': '🍺', 'wine': '🍷', 'beer': '🍺',
        'вода': '💧', 'water': '💧'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (name.includes(key)) {
            return emoji;
        }
    }

    return '🥗';
}

const imageAnalysisCache = {};

function getImageHash(base64String) {
    if (!base64String) return "";
    return `${base64String.length}_${base64String.substring(0, 100)}_${base64String.slice(-100)}`;
}

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

let isCameraPermissionGranted = false;
let cameraMode = 'log'; // 'log' for logging, 'cook' for recipes, 'check' for product check
let currentRecipeData = null;
let thumbnailDataUrl = null; // Global storage for current photo
let caloriesChart = null;
let weightChart = null;

let celebratedStatus = {
    calories: false,
    protein: false,
    fats: false,
    carbs: false
};

// Глобальный перехватчик ошибок для диагностики
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", message, source, lineno);
    return false;
};

window.onunhandledrejection = function(event) {
    console.error("Unhandled rejection:", event.reason);
};

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    console.log("App started. Version: " + CONFIG_LOCAL.VERSION);
    
    loadSavedData();
    initBMIModal();
    initErrorModal();
    initManualAddModal();
    initAddMenu();
    initRecipeModal();
    initCheckModal();
    initDeleteConfirmModal();
    initTheme();
    checkStreakOnLoad();
    initRuler();
    initWeightModal();
    initHeightRuler();
    initHeightModal();
    initGalleryButton();
    initDateSpinner();
    initSplashScreenCleanup();
});

function initSplashScreenCleanup() {
    const splash = document.getElementById('splash-screen');
    const video = document.getElementById('splash-video');
    if (!splash || !video) return;

    const removeSplash = () => {
        splash.classList.add('splash-exit');
        setTimeout(() => {
            splash.remove();
        }, 900);
    };

    // Video might already be playing due to the instant script in index.html
    // We just handle the cleanup here.
    const timer = setTimeout(removeSplash, 2500);
    video.onended = () => {
        clearTimeout(timer);
        removeSplash();
    };
}

function initGalleryButton() {
    const galleryBtn = document.getElementById('gallery-btn');
    const galleryInput = document.getElementById('gallery-input');

    if (galleryBtn && galleryInput) {
        galleryBtn.addEventListener('click', () => {
            galleryInput.click();
        });

        galleryInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                processUploadedFile(file);
            }
        });
    }
}

function processUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;

        // Create thumbnail for the uploaded image
        const img = new Image();
        img.onload = () => {
            const smallCanvas = document.createElement('canvas');
            const shortSide = Math.min(img.width, img.height);
            const startX = (img.width - shortSide) / 2;
            const startY = (img.height - shortSide) / 2;

            smallCanvas.width = 256;
            smallCanvas.height = 256;
            const smallCtx = smallCanvas.getContext('2d');
            smallCtx.drawImage(img, startX, startY, shortSide, shortSide, 0, 0, 256, 256);
            const thumbnailDataUrl = smallCanvas.toDataURL('image/jpeg', 0.7);

            // Hide camera controls and show analysis overlay
            document.querySelector('.camera-controls').classList.add('hidden');
            const analysisOverlay = document.getElementById('analysis-overlay');
            analysisOverlay.style.display = 'flex';
            analysisOverlay.classList.remove('hidden');

            // Start AI analysis
            showLoader(cameraMode);
            startAnalysis(imageData, thumbnailDataUrl);
        };
        img.src = imageData;
    };
    reader.readAsDataURL(file);
}

/**
 * Generic Ruler Initialization
 * @param {string} containerId - ID of the container for ticks
 * @param {string} scrollAreaId - ID of the scrollable area
 * @param {string} valueDisplayId - ID of the element to display value
 * @param {object} options - { min, max, initialValue, isVertical, step, pixelsPerUnit }
 */
function setupRuler(containerId, scrollAreaId, valueDisplayId, options) {
    const container = document.getElementById(containerId);
    const scrollArea = document.getElementById(scrollAreaId);
    const display = document.getElementById(valueDisplayId);
    if (!container || !scrollArea) return;

    const {
        min = 30,
        max = 150,
        initialValue = 75,
        isVertical = false,
        step = 0.1,
        pixelsPerUnit = 20
    } = options;

    container.innerHTML = '';
    
    // For weight (step 0.1), we want 10 ticks per 1kg
    // For height (step 1), we want 1 tick per 1cm
    const totalSteps = Math.round((max - min) / step);

    const ticks = [];
    for (let i = 0; i <= totalSteps; i++) {
        const val = min + i * step;
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.dataset.value = val;
        
        if (step === 0.1) {
            // Weight logic
            if (Math.round(val * 10) % 10 === 0) tick.classList.add('major');
            else if (Math.round(val * 10) % 5 === 0) {}
            else tick.classList.add('minor');
        } else {
            // Height logic (step 1)
            if (Math.round(val) % 10 === 0) tick.classList.add('major');
            else tick.classList.add('minor');
        }
        
        if (isVertical && i === totalSteps) {
            tick.style.marginBottom = '0px';
        } else if (!isVertical && i === totalSteps) {
            tick.style.marginRight = '0px';
        }
        container.appendChild(tick);
        ticks.push(tick);
    }

    let lastVibratedVal = -1;

    const onScroll = () => {
        // GEOMETRIC DETECTION: Find the tick closest to the center line
        const scrollAreaRect = scrollArea.getBoundingClientRect();
        const center = isVertical
            ? scrollAreaRect.top + scrollAreaRect.height / 2
            : scrollAreaRect.left + scrollAreaRect.width / 2;

        // Optimization: Start from approximate index
        const scrollPos = isVertical ? scrollArea.scrollTop : scrollArea.scrollLeft;
        let approxIndex = Math.round(scrollPos / pixelsPerUnit);
        approxIndex = Math.max(0, Math.min(ticks.length - 1, approxIndex));

        let closestTick = ticks[approxIndex];
        let minDiff = Infinity;

        // Check a wider range of neighbors for robust geometric detection
        // Using +/- 10 ticks to ensure we don't miss the center due to scroll momentum or sub-pixel issues
        const searchRange = 10;
        for (let i = Math.max(0, approxIndex - searchRange); i <= Math.min(ticks.length - 1, approxIndex + searchRange); i++) {
            const tickRect = ticks[i].getBoundingClientRect();
            const tickCenter = isVertical
                ? tickRect.top + tickRect.height / 2
                : tickRect.left + tickRect.width / 2;
            const diff = Math.abs(center - tickCenter);
            if (diff < minDiff) {
                minDiff = diff;
                closestTick = ticks[i];
            }
        }

        const value = parseFloat(closestTick.dataset.value);
        const displayValue = step < 1 ? value.toFixed(1) : Math.round(value);
        
        if (display) display.innerText = displayValue;

        if (displayValue !== lastVibratedVal) {
            triggerHaptic('selection');
            lastVibratedVal = displayValue;
        }
        
        return parseFloat(displayValue);
    };

    scrollArea.addEventListener('scroll', onScroll);

    // Initial positioning
    const setPosition = (val) => {
        const targetPos = ((val - min) / step) * pixelsPerUnit;
        if (isVertical) {
            scrollArea.scrollTop = targetPos;
        } else {
            scrollArea.scrollLeft = targetPos;
        }
        if (display) display.innerText = step < 1 ? val.toFixed(1) : Math.round(val);
    };

    setTimeout(() => setPosition(initialValue), 10);

    return { setPosition, getValue: () => parseFloat(display.innerText) };
}

function initRuler() {
    // Replaced by specific initializers
}

function initWeightModal() {
    const modal = document.getElementById('weight-modal');
    const closeBtn = document.getElementById('close-weight-modal');
    const saveBtn = document.getElementById('save-weight-btn');

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 400);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const weightVal = parseFloat(document.getElementById('settings-weight-val').innerText);
            if (!isNaN(weightVal)) {
                userData.weight = weightVal;
                
                // Add to history (One Date = One Record)
                if (!currentMacros.weightHistory) currentMacros.weightHistory = [];
                const todayStr = new Date().toISOString().split('T')[0];
                const existingEntryIndex = currentMacros.weightHistory.findIndex(entry =>
                    entry.date && entry.date.split('T')[0] === todayStr
                );
                
                if (existingEntryIndex !== -1) {
                    currentMacros.weightHistory[existingEntryIndex].weight = weightVal;
                    currentMacros.weightHistory[existingEntryIndex].date = new Date().toISOString();
                } else {
                    currentMacros.weightHistory.push({
                        date: new Date().toISOString(),
                        weight: weightVal
                    });
                }

                calculateNorms();
                saveAllData();
                updateAllUINorms();
                updateWeightWidgets();
                updateBMI();
                if (typeof renderWeightChart === 'function') renderWeightChart();
                initHomeScreenFromSaved();
                
                // Update settings text if visible
                const setWeightText = document.getElementById('set-weight-text');
                if (setWeightText) setWeightText.innerText = weightVal.toFixed(1) + ' кг';

                triggerHaptic('success');
                closeModal();
            }
        });
    }

    const weightCard = document.querySelector('.weight-card');
    if (weightCard) {
        weightCard.onclick = (e) => {
            e.stopPropagation();
            openWeightRuler();
        };
    }
}

function openWeightRuler() {
    const modal = document.getElementById('weight-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    setupRuler('settings-weight-ruler', 'settings-weight-ruler-area', 'settings-weight-val', {
        min: 30,
        max: 160,
        initialValue: userData.weight || 75,
        isVertical: false,
        step: 0.1,
        pixelsPerUnit: 20
    });
}

function initHeightRuler() {
    // Replaced by specific initializers
}

function initHeightModal() {
    const modal = document.getElementById('height-modal');
    const closeBtn = document.getElementById('close-height-modal');
    const saveBtn = document.getElementById('save-height-btn');

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 400);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const heightVal = parseInt(document.getElementById('settings-height-val').innerText);
            if (!isNaN(heightVal)) {
                userData.height = heightVal;
                
                calculateNorms();
                saveAllData();
                updateAllUINorms();
                updateBMI();
                initHomeScreenFromSaved();
                
                // Update settings text if visible
                const setHeightText = document.getElementById('set-height-text');
                if (setHeightText) setHeightText.innerText = heightVal + ' см';
                
                triggerHaptic('success');
                closeModal();
            }
        });
    }
}

function openHeightRuler() {
    const modal = document.getElementById('height-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    setupRuler('settings-height-ruler', 'settings-height-ruler-area', 'settings-height-val', {
        min: 120,
        max: 220,
        initialValue: userData.height || 175,
        isVertical: true,
        step: 1,
        pixelsPerUnit: 20
    });
}

/**
 * Streak logic
 */
function calculateStreak() {
    if (!currentMacros.dailyHistory) return 0;

    const today = new Date().toISOString().split('T')[0];
    const history = currentMacros.dailyHistory;
    
    // Check if today has entries
    const loggedToday = history[today] && history[today].calories > 0;
    
    let streak = 0;
    let currentDate = new Date();

    if (loggedToday) {
        streak = 1;
    }
    
    // Start checking from yesterday
    currentDate.setDate(currentDate.getDate() - 1);
    
    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (history[dateStr] && history[dateStr].calories > 0) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function checkStreakOnLoad() {
    const streakCount = calculateStreak();
    localStorage.setItem('streakCount', streakCount);
    updateStreakUI(streakCount);
}

function updateStreak() {
    const streakCount = calculateStreak();
    localStorage.setItem('streakCount', streakCount);
    updateStreakUI(streakCount);
}

function updateStreakUI(count) {
    const streakCountEl = document.getElementById('streak-count');
    if (streakCountEl) {
        streakCountEl.innerText = count;
    }
    
    const statsStreakCountEl = document.getElementById('stats-streak-count');
    if (statsStreakCountEl) {
        statsStreakCountEl.innerText = count;
    }

    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
        if (count > 0) {
            streakBadge.style.display = 'flex';
        } else {
            streakBadge.style.display = 'none';
        }
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
            
            // Re-render weight chart with new theme colors
            if (typeof renderWeightChart === 'function') {
                if (weightChart) {
                    weightChart.destroy();
                    weightChart = null;
                }
                renderWeightChart();
            }
        });
    }
}

let loaderInterval = null;

function showLoader(mode = 'food') {
    const loader = document.getElementById('ai-loader');
    const fill = loader.querySelector('.progress-bar-fill');
    const statusText = document.getElementById('loader-status');
    const titleText = document.getElementById('loader-title');
    const iconEl = loader.querySelector('.loader-icon');
    
    loader.classList.remove('hidden');
    fill.style.width = '0%';

    let messages = [];
    if (mode === 'check') {
        titleText.innerText = "Анализ продукта...";
        if (iconEl) iconEl.innerText = "🔎";
        messages = [
            "Смотрим на фото...",
            "Ищем химикаты...",
            "Проверяем Е-шки...",
            "Пробуем еду...",
            "Считаем и складываем..."
        ];
    } else {
        titleText.innerText = "Анализ еды...";
        if (iconEl) iconEl.innerText = "✨";
        messages = [
            "Смотрим на фото...",
            "Определяем продукты...",
            "Считаем БЖУ..."
        ];
    }
    
    statusText.innerText = messages[0];

    let progress = 0;
    const startTime = Date.now();

    if (loaderInterval) clearInterval(loaderInterval);
    
    loaderInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        // Progress emulation: 0% to 90% over 4 seconds
        if (progress < 90) {
            progress += Math.random() * 2;
            if (progress > 90) progress = 90;
            fill.style.width = `${progress}%`;
        }

        // Cycle through messages every 1000ms
        const msgIndex = Math.min(Math.floor(elapsed / 1000), messages.length - 1);
        statusText.innerText = messages[msgIndex];
    }, 100);
}

function hideLoader() {
    const loader = document.getElementById('ai-loader');
    const fill = loader.querySelector('.progress-bar-fill');
    
    if (loaderInterval) clearInterval(loaderInterval);
    
    fill.style.width = '100%';
    
    setTimeout(() => {
        loader.classList.add('hidden');
        fill.style.width = '0%';
    }, 300);
}

function initAddMenu() {
    const addBtn = document.getElementById('add-btn-main');
    const menu = document.getElementById('add-options-menu');
    const cameraBtn = document.getElementById('option-camera-btn');
    const textBtn = document.getElementById('option-text-btn');
    const cookingBtn = document.getElementById('option-cooking-btn');
    const checkBtn = document.getElementById('option-check-btn');

    if (addBtn && menu) {
        addBtn.addEventListener('click', (e) => {
            triggerHaptic('light');
            e.stopPropagation();
            menu.classList.toggle('hidden');
            addBtn.style.transform = menu.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(45deg)';
            addBtn.style.transition = 'transform 0.3s ease';
        });

        const updateCameraHint = (text) => {
            const hint = document.getElementById('camera-hint');
            if (hint) hint.innerText = text;
        };

        cameraBtn.addEventListener('click', () => {
            triggerHaptic('light');
            cameraMode = 'log';
            updateCameraHint("Сфоткай еду — определим КБЖУ");
            menu.classList.add('hidden');
            addBtn.style.transform = 'rotate(0deg)';
            openCamera();
        });

        textBtn.addEventListener('click', () => {
            triggerHaptic('light');
            cameraMode = 'log';
            menu.classList.add('hidden');
            addBtn.style.transform = 'rotate(0deg)';
            const manualModal = document.getElementById('manual-add-modal');
            if (manualModal) manualModal.classList.remove('hidden');
        });

        if (cookingBtn) {
            cookingBtn.addEventListener('click', () => {
                triggerHaptic('light');
                cameraMode = 'cook';
                updateCameraHint("Сфоткай свои продукты");
                menu.classList.add('hidden');
                addBtn.style.transform = 'rotate(0deg)';
                openCamera();
            });
        }

        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                triggerHaptic('light');
                cameraMode = 'check';
                updateCameraHint("Сфоткай состав на упаковке");
                menu.classList.add('hidden');
                addBtn.style.transform = 'rotate(0deg)';
                openCamera();
            });
        }

        document.addEventListener('click', (e) => {
            if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== addBtn) {
                menu.classList.add('hidden');
                addBtn.style.transform = 'rotate(0deg)';
            }
        });
    }
}

async function analyzeTextFood(foodName, userCalories) {
    let prompt = "";
    const cookingRules = `
    - Assume standard cooking methods: If the user says "Fried eggs" or "Steak", assume oil was used for frying (add fats).
    - Account for common hidden calories: If the dish implies sauce, marination, or breading (e.g., "Cutlet"), add some carbs and fats even if not explicitly mentioned.
    - Be realistic, not theoretical: Provide values for the finished dish on the plate, not raw ingredients. For example, a Steak should have 0.5g-2g of carbs for caramelization/spices and more fats from oil.
    `;

    if (userCalories) {
        prompt = `User ate: "${foodName}" worth ${userCalories} kcal. ${cookingRules} Estimate macros (Protein, Fat, Carbs) based on this calorie count. Return ONLY JSON: {"name": "${foodName}", "calories": ${userCalories}, "protein": 10, "carbs": 10, "fats": 10}`;
    } else {
        prompt = `User ate: "${foodName}". ${cookingRules} Estimate calories and macros (Protein, Fat, Carbs) for a standard portion. Return ONLY JSON: {"name": "${foodName}", "calories": 100, "protein": 10, "carbs": 10, "fats": 10}`;
    }

    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: foodName,
                prompt: prompt
            })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        return {
            id: Date.now().toString(),
            name: result.name || result.product_name || foodName,
            calories: parseInt(result.calories) || parseInt(userCalories) || 0,
            protein: parseInt(result.protein) || 0,
            fats: parseInt(result.fats) || 0,
            carbs: parseInt(result.carbs) || 0
        };
    } catch (e) {
        console.error("Proxy text analysis error:", e);
        return {
            id: Date.now().toString(),
            name: foodName,
            calories: parseInt(userCalories) || 0,
            protein: 0,
            fats: 0,
            carbs: 0
        };
    }
}

function initErrorModal() {
    const modal = document.getElementById('error-modal');
    const closeBtn = document.getElementById('error-close-btn');
    const manualBtn = document.getElementById('manual-add-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (manualBtn) {
        manualBtn.addEventListener('click', () => {
            console.log("Manual add clicked");
            modal.classList.add('hidden');
            const manualModal = document.getElementById('manual-add-modal');
            if (manualModal) {
                manualModal.classList.remove('hidden');
            }
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

function initManualAddModal() {
    const modal = document.getElementById('manual-add-modal');
    const cancelBtn = document.getElementById('cancel-manual-btn');
    const saveBtn = document.getElementById('save-manual-btn');

    const clearInputs = () => {
        document.getElementById('manual-name').value = '';
        document.getElementById('manual-calories').value = '';
        document.getElementById('manual-protein').value = '';
        document.getElementById('manual-fat').value = '';
        document.getElementById('manual-carbs').value = '';
        document.getElementById('edit-food-id').value = '';
        document.getElementById('manual-modal-title').innerText = 'Добавить блюдо';
        document.getElementById('save-manual-btn').innerText = 'Добавить';
    };

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            clearInputs();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            triggerHaptic('success');
            const id = document.getElementById('edit-food-id').value;
            const name = document.getElementById('manual-name').value.trim();
            const cals = document.getElementById('manual-calories').value.trim();
            const protein = document.getElementById('manual-protein').value.trim();
            const fat = document.getElementById('manual-fat').value.trim();
            const carbs = document.getElementById('manual-carbs').value.trim();

            if (!name) {
                console.error("Пожалуйста, введите название блюда");
                return;
            }

            // If user provided macros manually
            if (protein !== '' || fat !== '' || carbs !== '') {
                const foodItem = {
                    id: id || Date.now().toString(),
                    name: name,
                    calories: parseInt(cals) || ( (parseInt(protein) || 0) * 4 + (parseInt(fat) || 0) * 9 + (parseInt(carbs) || 0) * 4 ),
                    protein: parseInt(protein) || 0,
                    fats: parseInt(fat) || 0,
                    carbs: parseInt(carbs) || 0
                };

                if (id) {
                    const foodIndex = currentMacros.foodHistory.findIndex(f => f.id === id);
                    if (foodIndex !== -1) currentMacros.foodHistory[foodIndex] = foodItem;
                } else {
                    addFoodToHome(foodItem, null);
                }

                saveBtn.disabled = false;
                recalculateMacros();
                saveAllData();
                initHomeScreenFromSaved();
                modal.classList.add('hidden');
                clearInputs();
                return;
            }

            if (!cals || parseInt(cals) === 0) {
                // AI Recalculation - if calories are empty or zero
                saveBtn.innerText = "Считаю...";
                saveBtn.disabled = true;

                try {
                    const aiResult = await analyzeTextFood(name);
                    
                    if (id) {
                        // Editing existing with AI
                        const foodIndex = currentMacros.foodHistory.findIndex(f => f.id === id);
                        if (foodIndex !== -1) {
                            currentMacros.foodHistory[foodIndex].name = aiResult.name;
                            currentMacros.foodHistory[foodIndex].calories = aiResult.calories;
                            currentMacros.foodHistory[foodIndex].protein = aiResult.protein;
                            currentMacros.foodHistory[foodIndex].fats = aiResult.fats;
                            currentMacros.foodHistory[foodIndex].carbs = aiResult.carbs;
                        }
                    } else {
                        // Adding new with AI
                        addFoodToHome(aiResult, null);
                    }
                } catch (err) {
                    console.error("AI recalculation error:", err);
                } finally {
                    saveBtn.disabled = false;
                    recalculateMacros();
                    saveAllData();
                    initHomeScreenFromSaved();
                    modal.classList.add('hidden');
                    clearInputs();
                }
            } else {
                // Manual input with only calories provided - we still use AI to estimate macros for these calories
                saveBtn.innerText = "Считаю...";
                saveBtn.disabled = true;
                
                try {
                    const aiResult = await analyzeTextFood(name, cals);
                    
                    if (id) {
                        const foodIndex = currentMacros.foodHistory.findIndex(f => f.id === id);
                        if (foodIndex !== -1) {
                            currentMacros.foodHistory[foodIndex].name = aiResult.name;
                            currentMacros.foodHistory[foodIndex].calories = aiResult.calories;
                            currentMacros.foodHistory[foodIndex].protein = aiResult.protein;
                            currentMacros.foodHistory[foodIndex].fats = aiResult.fats;
                            currentMacros.foodHistory[foodIndex].carbs = aiResult.carbs;
                        }
                    } else {
                        addFoodToHome(aiResult, null);
                    }
                } catch (err) {
                    console.error("AI recalculation error with cals:", err);
                    // Fallback to 0 macros if AI fails
                    const foodItem = {
                        id: id || Date.now().toString(),
                        name: name,
                        calories: parseInt(cals) || 0,
                        protein: 0,
                        fats: 0,
                        carbs: 0
                    };
                    if (id) {
                        const foodIndex = currentMacros.foodHistory.findIndex(f => f.id === id);
                        if (foodIndex !== -1) currentMacros.foodHistory[foodIndex] = foodItem;
                    } else {
                        addFoodToHome(foodItem, null);
                    }
                } finally {
                    saveBtn.disabled = false;
                    recalculateMacros();
                    saveAllData();
                    initHomeScreenFromSaved();
                    modal.classList.add('hidden');
                    clearInputs();
                }
            }
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                clearInputs();
            }
        });
    }
}

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
                } catch (e2) {
                    console.error("[Storage] Still failing after trimming:", e2);
                }
            } else {
                console.error("Ошибка: Превышен лимит памяти браузера.");
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
        } else {
            // Reveal onboarding container if user is new
            const container = document.querySelector('.container');
            if (container) container.style.display = 'block';
        }
        checkInitialCelebration();
    } else {
        // Explicitly show onboarding for new users when no data exists
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'block';
        }
        // Ensure the first step is active
        nextStep(1);
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
            
            const foodIcon = food.thumbnail
                ? `<div class="food-img-placeholder"><img src="${food.thumbnail}" class="food-thumb-image" alt="Фото еды"></div>`
                : `<div class="food-img-placeholder">${getEmojiForFood(food.name)}</div>`;

            div.innerHTML = `
                ${foodIcon}
                <div class="food-info">
                    <div class="food-header">
                        <span class="food-name">${food.name}</span>
                    </div>
                    <div class="food-calories"><span class="fire-icon">🔥</span> ${Math.round(food.calories)} ккал</div>
                    <div class="food-macros-mini">
                        <span><div class="macro-mini-dot dot-protein"></div> Б: ${Math.round(food.protein)}г</span>
                        <span><div class="macro-mini-dot dot-carbs"></div> У: ${Math.round(food.carbs)}г</span>
                        <span><div class="macro-mini-dot dot-fats"></div> Ж: ${Math.round(food.fats)}г</span>
                    </div>
                </div>
                <div class="food-item-right">
                    <span class="food-time">${food.time || (food.timestamp ? new Date(food.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '')}</span>
                    <div class="food-actions">
                        <button class="action-icon-btn edit-btn" data-id="${food.id}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-icon-btn delete-btn" data-index="${index}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
            foodList.appendChild(div);
        });

        // Add listeners for edit and delete buttons
        foodList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        foodList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteFood(parseInt(btn.dataset.index)));
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
                    <circle class="ring-track" cx="24" cy="24" r="${radius}" fill="transparent" stroke-width="3"></circle>
                    <circle class="ring-progress" cx="24" cy="24" r="${radius}" fill="transparent" stroke-width="3"
                        stroke-dasharray="${circumference} ${circumference}"
                        stroke-dashoffset="${offset}"
                        stroke-linecap="round"
                        transform="rotate(-90 24 24)"></circle>
                    <text x="24" y="24" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="currentColor">${dayNumber}</text>
                </svg>
            </div>
        `;
        container.appendChild(dayCard);
    }
}

const tg = window.Telegram.WebApp;
tg.expand();

function nextStep(stepNumber) {
    triggerHaptic('light');
    const targetStepEl = document.getElementById(`step-${stepNumber}`);
    
    if (!targetStepEl) return;

    // Reveal container if it was hidden (first navigation)
    const container = document.querySelector('.container');
    if (container && container.style.display !== 'block') {
        container.style.display = 'block';
    }

    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    targetStepEl.classList.add('active');
    
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

    // Initialize rulers if entering height or weight onboarding steps
    if (stepNumber === 4) {
        initOnboardingHeightRuler();
    } else if (stepNumber === 'height-weight') {
        initOnboardingWeightRuler();
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

function initOnboardingHeightRuler() {
    setupRuler('onboarding-height-ruler', 'onboarding-height-ruler-area', 'onboarding-height-val', {
        min: 120,
        max: 220,
        initialValue: userData.height || 175,
        isVertical: true,
        step: 1,
        pixelsPerUnit: 20 // STRICTLY 20px (2px tick + 18px margin)
    });
}

function initOnboardingWeightRuler() {
    setupRuler('onboarding-weight-ruler', 'onboarding-weight-ruler-area', 'onboarding-weight-val', {
        min: 30,
        max: 160,
        initialValue: userData.weight || 75,
        isVertical: false,
        step: 0.1,
        pixelsPerUnit: 20
    });
}

function saveHeightOnboarding() {
    triggerHaptic('success');
    userData.height = parseInt(document.getElementById('onboarding-height-val').innerText);
    nextStep('height-weight');
}

function saveWeightOnboarding() {
    triggerHaptic('success');
    userData.weight = parseFloat(document.getElementById('onboarding-weight-val').innerText);
    nextStep(5);
}

function saveBorn() {
    const birthdate = document.getElementById('birthdate').value;
    if (!birthdate) {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert("Пожалуйста, выберите дату рождения");
        } else {
            console.error("Пожалуйста, выберите дату рождения");
        }
        return;
    }
    userData.birthdate = birthdate;
    
    // Calculate age precisely
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }
    
    userData.age = age;
    triggerHaptic('success');
    nextStep(6);
}

/**
 * Date Spinner Initialization
 */
function initDateSpinner() {
    const dayCol = document.getElementById('spinner-day');
    const monthCol = document.getElementById('spinner-month');
    const yearCol = document.getElementById('spinner-year');
    const birthdateInput = document.getElementById('birthdate');

    if (!dayCol || !monthCol || !yearCol) return;

    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    // Populate Days (1-31)
    let daysHtml = '';
    for (let i = 1; i <= 31; i++) {
        daysHtml += `<div class="spinner-item" data-value="${i}">${i}</div>`;
    }
    dayCol.innerHTML = daysHtml;

    // Populate Months
    let monthsHtml = '';
    months.forEach((m, i) => {
        monthsHtml += `<div class="spinner-item" data-value="${i + 1}">${m}</div>`;
    });
    monthCol.innerHTML = monthsHtml;

    // Populate Years (1960-2025)
    let yearsHtml = '';
    for (let i = 1960; i <= 2025; i++) {
        yearsHtml += `<div class="spinner-item" data-value="${i}">${i}</div>`;
    }
    yearCol.innerHTML = yearsHtml;

    let selectedDay = 1;
    let selectedMonth = 1;
    let selectedYear = 2000;

    const updateSelectedDate = () => {
        const formattedMonth = selectedMonth.toString().padStart(2, '0');
        const formattedDay = selectedDay.toString().padStart(2, '0');
        birthdateInput.value = `${selectedYear}-${formattedMonth}-${formattedDay}`;
    };

    const itemHeight = 40;

    const handleScroll = (col, type) => {
        const scrollTop = col.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
        const items = col.querySelectorAll('.spinner-item');
        
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
                const val = parseInt(item.dataset.value);
                if (type === 'day') {
                    if (selectedDay !== val) {
                        selectedDay = val;
                        triggerHaptic('selection');
                    }
                } else if (type === 'month') {
                    if (selectedMonth !== val) {
                        selectedMonth = val;
                        triggerHaptic('selection');
                    }
                } else if (type === 'year') {
                    if (selectedYear !== val) {
                        selectedYear = val;
                        triggerHaptic('selection');
                    }
                }
            } else {
                item.classList.remove('active');
            }
        });
        updateSelectedDate();
    };

    dayCol.addEventListener('scroll', () => handleScroll(dayCol, 'day'));
    monthCol.addEventListener('scroll', () => handleScroll(monthCol, 'month'));
    yearCol.addEventListener('scroll', () => handleScroll(yearCol, 'year'));

    // Initial position for Day 1, Month 1 (Jan), Year 2000
    const scrollDateSpinnerToDefault = () => {
        const dayIndex = 1 - 1;
        const monthIndex = 1 - 1;
        const yearIndex = 2000 - 1960;
        
        // Use scrollTo for more control and explicit behavior
        dayCol.scrollTo({ top: dayIndex * itemHeight, behavior: 'auto' });
        monthCol.scrollTo({ top: monthIndex * itemHeight, behavior: 'auto' });
        yearCol.scrollTo({ top: yearIndex * itemHeight, behavior: 'auto' });
        
        // Force active states
        handleScroll(dayCol, 'day');
        handleScroll(monthCol, 'month');
        handleScroll(yearCol, 'year');
    };

    // Run after DOM is fully ready and painted
    if (document.readyState === 'complete') {
        setTimeout(scrollDateSpinnerToDefault, 200);
    } else {
        window.addEventListener('load', () => setTimeout(scrollDateSpinnerToDefault, 200));
    }
    
    // Also trigger on nextStep(5) to ensure it works when the screen is actually shown
    const originalNextStep = window.nextStep;
    window.nextStep = function(stepNumber) {
        if (typeof originalNextStep === 'function') {
            originalNextStep(stepNumber);
        }
        if (stepNumber === 5) {
            setTimeout(scrollDateSpinnerToDefault, 50);
        }
    };
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

            // Haptic Feedback for progress bar (every 4%)
            if (currentPercent % 4 === 0) {
                if (currentPercent < 60) {
                    triggerHaptic('light');
                } else if (currentPercent < 90) {
                    triggerHaptic('medium');
                } else if (currentPercent < 100) {
                    triggerHaptic('heavy');
                }
            }

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
            triggerHaptic('success');
            document.getElementById('loading-title').innerText = "План успешно составлен!";
            statusEl.style.display = 'none';
            
            // Cinematic Reveal with 400ms delay
            setTimeout(() => {
                const btnContainer = document.getElementById('final-btn-container');
                if (btnContainer) {
                    btnContainer.classList.add('visible');
                    triggerHaptic('medium');
                }
            }, 400);
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
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt
            })
        });
        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        // The result should already be the parsed JSON from the server
        return Array.isArray(result) ? result : (result.tips || []);
    } catch (e) {
        console.error("Proxy tips error:", e);
        return [
            { icon: "🥗", text: "Следите за балансом БЖУ ежедневно" },
            { icon: "💧", text: "Пейте достаточное количество воды" },
            { icon: "🏃", text: "Старайтесь больше двигаться" },
            { icon: "😴", text: "Соблюдайте режим сна" }
        ];
    }
}

function calculateNorms() {
    const { weight, height, age, gender, activity, goal } = userData;
    
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    
    let calories = Math.round(bmr * activity);
    
    // Корректировка по цели
    if (goal === 'lose') {
        calories -= 500; // Дефицит для похудения
    } else if (goal === 'gain') {
        calories += 500; // Профицит для набора массы
    }
    
    // Расчет БЖУ
    const protein = Math.round((calories * 0.3) / 4);
    const fats = Math.round((calories * 0.3) / 9);
    const carbs = Math.round((calories * 0.4) / 4);

    currentMacros.totalCalories = calories;
    currentMacros.totalProtein = protein;
    currentMacros.totalCarbs = carbs;
    currentMacros.totalFats = fats;

    return { calories, protein, fats, carbs };
}

function showResults() {
    // userData.height and userData.weight are now already set via onboarding rulers
    
    const norms = calculateNorms();
    const { calories, protein, fats, carbs } = norms;

    // Обновление UI
    document.getElementById('res-calories').innerText = calories;
    document.getElementById('res-carbs').innerText = carbs + 'г';
    document.getElementById('res-protein').innerText = protein + 'г';
    document.getElementById('res-fats').innerText = fats + 'г';
    document.getElementById('target-weight').innerText = userData.weight + ' кг';
    
    const goalMap = {
        'lose': 'Похудение',
        'maintain': 'Поддержание веса',
        'gain': 'Набор массы'
    };
    const goalText = goalMap[userData.goal] || 'Здоровье';
    document.getElementById('goal-text').innerText = `Ваша цель: ${goalText}`;

    // Анимация
    setProgress('ring-calories', 100);
    setProgress('ring-carbs', 100);
    setProgress('ring-protein', 100);
    setProgress('ring-fats', 100);
    
    // Переход сразу
    nextStep(11);

    // Загрузка советов в фоновом режиме
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
    }).catch(error => {
        console.error("Tips error", error);
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

    // ШАГ 1 (Проверка): Перед тем как показать #camera-permission-ui, проверь if (!isCameraPermissionGranted)
    if (!isCameraPermissionGranted) {
        permissionUI.classList.remove('hidden');
        permissionUI.classList.remove('fade-out');
    } else {
        permissionUI.classList.add('hidden');
    }
    
    // Explicitly hide analysis card and show controls at start
    const analysisOverlay = document.getElementById('analysis-overlay');
    analysisOverlay.style.display = 'none';
    analysisOverlay.classList.add('hidden');
    document.querySelector('.camera-controls').classList.remove('hidden');

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
        
        // ШАГ 2 (Успех): Установи isCameraPermissionGranted = true
        isCameraPermissionGranted = true;

        // Success: Hide instructions with animation
        permissionUI.classList.add('fade-out');
        setTimeout(() => {
            permissionUI.classList.add('hidden');
        }, 500);
        
    } catch (err) {
        console.error("Error accessing camera:", err);
        // ШАГ 3 (Ошибка): Установи isCameraPermissionGranted = false
        isCameraPermissionGranted = false;

        // Error: Show instructions with manual fix prompt
        permissionUI.classList.remove('hidden'); // Ensure it's visible on error
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
    
    // Resize for AI: max 1000px width/height while maintaining aspect ratio
    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    const maxDim = 1000;
    
    if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
            targetHeight = (maxDim / targetWidth) * targetHeight;
            targetWidth = maxDim;
        } else {
            targetWidth = (maxDim / targetHeight) * targetWidth;
            targetHeight = maxDim;
        }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Draw the current frame from the video onto the canvas with resizing
    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    
    // Convert to JPEG with quality 0.8 to reduce size
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Create thumbnail
    const smallCanvas = document.createElement('canvas');
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const shortSide = Math.min(vWidth, vHeight);
    const startX = (vWidth - shortSide) / 2;
    const startY = (vHeight - shortSide) / 2;

    smallCanvas.width = 256;
    smallCanvas.height = 256;
    const smallCtx = smallCanvas.getContext('2d');
    
    // Draw with square crop from center
    smallCtx.drawImage(video, startX, startY, shortSide, shortSide, 0, 0, 256, 256);
    thumbnailDataUrl = smallCanvas.toDataURL('image/jpeg', 0.7);
    
    // Set to analysis image (hidden legacy tag)
    const analyzedImg = document.getElementById('analyzed-img');
    if (analyzedImg) analyzedImg.src = imageData;
    
    // Freeze video feed visually by stopping tracks but keeping screen
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }

    // Hide controls and show analysis overlay
    document.querySelector('.camera-controls').classList.add('hidden');
    const analysisOverlay = document.getElementById('analysis-overlay');
    analysisOverlay.style.display = 'flex';
    analysisOverlay.classList.remove('hidden');
    
    // Start AI analysis
    showLoader(cameraMode);
    startAnalysis(imageData, thumbnailDataUrl);
}

async function startAnalysis(imageData, thumbnailDataUrl) {
    let progress = 0;
    const circ = 2 * Math.PI * 52; // New radius r=52
    
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 3;
        if (progress > 100) progress = 100;
        
        // Update new UI elements
        const percentVal = document.getElementById('analysis-percent-val');
        if (percentVal) percentVal.innerText = progress;
        
        setHomeProgress('analysis-progress-circle', progress, circ);
        
        if (progress === 100) {
            clearInterval(interval);
            // Add slight delay at 100% for "expensive" feel
            setTimeout(() => {
                document.getElementById('analysis-overlay').classList.add('hidden');
                closeCamera(); // Now fully close the camera screen
                finishAnalysis(imageData, thumbnailDataUrl);
            }, 500);
        }
    }, 150);
}

async function finishAnalysis(imageData, thumbnailDataUrl) {
    const hash = getImageHash(imageData) + "_" + cameraMode;
    if (imageAnalysisCache[hash]) {
        console.log("Using cached analysis result");
        if (cameraMode === 'cook') {
            showRecipeModal(imageAnalysisCache[hash]);
        } else if (cameraMode === 'check') {
            showCheckResult(imageAnalysisCache[hash]);
        } else {
            addFoodToHome(imageAnalysisCache[hash], thumbnailDataUrl);
        }
        return;
    }

    let prompt;
    if (cameraMode === 'cook') {
        prompt = `Analyze the image for available ingredients. Suggest ONE simple, appetizing recipe in RUSSIAN language (name and instructions).
        If the image is blurry, make your best guess based on colors and shapes.
        Return ONLY a JSON object: { "recipeName": "Название блюда", "calories": 500, "protein": 20, "fat": 15, "carbs": 60, "instructions": "Шаг 1: ...\\nШаг 2: ..." }`;
    } else if (cameraMode === 'check') {
        prompt = `Ты — эксперт по питанию. Проанализируй фото состава продукта.
        Будь лоялен и реалистичен. Не штрафуй сильно за обычные ингредиенты, такие как подсолнечное масло, мука или сахар в умеренных количествах.
        Уменьши штрафы за "Е-добавки" в 2-3 раза, так как многие из них безопасны.
        Низкие оценки (ниже 50) ставь только за откровенно вредные продукты (чипсы, газировка, продукты с высокой степенью переработки и токсичности).
        Обычные продукты (например, пшеничная тортилья, хлеб, йогурт) должны получать 75-85 баллов.
 
        Если текст размыт, попробуй распознать ключевые слова или сделай предположение на основе бренда/вида продукта.
        Верни ответ СТРОГО в формате JSON: { "product_name": "...", "score": 50, "pros": "...", "cons": "...", "verdict": "..." }
        Требования: product_name: Краткое название продукта СТРОГО НА РУССКОМ ЯЗЫКЕ (1-3 слова). score: Оценка полезности от 0 до 100. Весь текст должен быть на русском языке.`;
    } else {
        prompt = `You are a helpful nutritionist AI.
        Analyze this food image. If the image is blurry or unclear, MAKE A BEST GUESS based on visible colors and shapes.
        Do NOT return an error unless it is absolutely clearly not food (like a photo of a car or a wall).
        
        CRITICAL RULES:
        - Assume standard cooking methods: If you see "Fried eggs" or "Steak", assume oil was used for frying (add fats).
        - Account for common hidden calories: If the dish implies sauce, marination, or breading (e.g., "Cutlet"), add some carbs and fats even if not explicitly visible.
        - Be realistic, not theoretical: Provide values for the finished dish on the plate, not raw ingredients. For example, a Steak should have 0.5g-2g of carbs for caramelization/spices and more fats from oil.
        - Salads: Assume dressing/oil unless it looks completely dry.
 
        Provide a single, definitive estimate based on visual evidence.
        1. Краткое название продукта (1-2 слова) на русском, в поле "product_name".
        2. Калории (ккал), белки (г), жиры (г), углеводы (г).
        3. Общее описание (короткий текст до 150 символов), в поле "description".
        Always return JSON: {"product_name": "Название", "calories": 100, "protein": 10, "carbs": 10, "fats": 10, "description": "Описание"}`;
    }
    
    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageData.split(',')[1],
                mime_type: "image/jpeg",
                prompt: prompt
            })
        });
 
        const result = await response.json();
 
        if (result.error) {
            console.error("Proxy API error:", result.error);
            throw new Error(result.error);
        }
        
        imageAnalysisCache[hash] = result;
        if (cameraMode === 'cook') {
            showRecipeModal(result);
        } else if (cameraMode === 'check') {
            showCheckResult(result);
        } else {
            // Now map the received JSON keys to expected food entry keys
            const foodResult = {
                id: Date.now().toString(),
                name: result.product_name || result.name || result.recipeName || "Еда",
                calories: Number(result.calories) || 0,
                protein: Number(result.protein) || 0,
                carbs: Number(result.carbs) || 0,
                fats: Number(result.fats) || Number(result.fat) || 0,
            };
            addFoodToHome(foodResult, thumbnailDataUrl);
        }
        hideLoader();
 
    } catch (err) {
        console.error("Critical AI Error:", err);
        
        // Замени alert на вызов нового окна
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.classList.remove('hidden');
        }
        
        // We still need to leave analysis screen if it was active
        const analysisOverlay = document.getElementById('analysis-overlay');
        if (analysisOverlay) {
            analysisOverlay.classList.add('hidden');
        }
        closeCamera();
        hideLoader();
        nextStep(12); // Go back home
    }
}

function addFoodToHome(food, thumbnail) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const foodEntry = {
        id: food.id || Date.now().toString(),
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        time: time,
        thumbnail: thumbnail
    };

    if (!currentMacros.foodHistory) currentMacros.foodHistory = [];
    currentMacros.foodHistory.unshift(foodEntry);
    
    recalculateMacros();
    saveAllData();
    updateStreak();
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
    itemToDeleteIndex = index;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function openEditModal(id) {
    const food = currentMacros.foodHistory.find(f => f.id === id);
    if (!food) return;

    document.getElementById('manual-modal-title').innerText = 'Редактировать блюдо';
    document.getElementById('save-manual-btn').innerText = 'Сохранить';
    document.getElementById('edit-food-id').value = food.id;
    document.getElementById('manual-name').value = food.name;
    document.getElementById('manual-calories').value = Math.round(food.calories);
    document.getElementById('manual-protein').value = food.protein || '';
    document.getElementById('manual-fat').value = food.fats || '';
    document.getElementById('manual-carbs').value = food.carbs || '';
    document.getElementById('manual-add-modal').classList.remove('hidden');
}

let itemToDeleteIndex = null;

function initDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (itemToDeleteIndex !== null) {
                triggerHaptic('medium');
                if (currentMacros.foodHistory && currentMacros.foodHistory[itemToDeleteIndex]) {
                    currentMacros.foodHistory.splice(itemToDeleteIndex, 1);
                    recalculateMacros();
                    saveAllData();
                    initHomeScreenFromSaved();
                    updateStreak();
                }
                itemToDeleteIndex = null;
                modal.classList.add('hidden');
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            itemToDeleteIndex = null;
            modal.classList.add('hidden');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                itemToDeleteIndex = null;
                modal.classList.add('hidden');
            }
        });
    }
}

function goToHome() {
    // Norms are already in currentMacros thanks to calculateNorms
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

function checkInitialCelebration() {
    if (currentMacros.calories >= currentMacros.totalCalories) celebratedStatus.calories = true;
    if (currentMacros.protein >= currentMacros.totalProtein) celebratedStatus.protein = true;
    if (currentMacros.carbs >= currentMacros.totalCarbs) celebratedStatus.carbs = true;
    if (currentMacros.fats >= currentMacros.totalFats) celebratedStatus.fats = true;
}

function triggerConfetti(type) {
    const colors = {
        protein: ['#e58b8b', '#ff4d4d'], // Красный
        fats: ['#8bb6e5', '#3498db'],    // Синий/Голубой
        carbs: ['#e5b68b', '#27ae60'],   // Зеленый (user asked for green for carbs)
        calories: ['#f1c40f', '#e67e22'] // Золотой/Оранжевый
    };

    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors[type] || ['#ffffff']
    });
}

function setHomeProgress(id, percent, circumference) {
    // Триггер конфетти для колец на главной
    if (percent >= 100) {
        let type = null;
        if (id === 'home-ring-calories') type = 'calories';
        if (id === 'home-ring-protein') type = 'protein';
        if (id === 'home-ring-carbs') type = 'carbs';
        if (id === 'home-ring-fats') type = 'fats';

        if (type && !celebratedStatus[type]) {
            celebratedStatus[type] = true;
            triggerConfetti(type);
            triggerHaptic('success');
        }
    }

    const circle = document.getElementById(id);
    if (!circle) return;
    // Ограничиваем визуальное заполнение максимум на 100%
    const visualPercent = Math.min(percent, 100);
    const offset = circumference - (visualPercent / 100 * circumference);
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
}

function updateCalendarDates() {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    const dayElements = document.querySelectorAll('.day-card');
    dayElements.forEach((el, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        
        const dayNum = date.getDate();
        const dayNumEl = el.querySelector('.day-number') || el.querySelector('text');
        if (dayNumEl) dayNumEl.textContent = dayNum;
        
        if (date.toDateString() === now.toDateString()) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

function updateProgressPage() {
    triggerHaptic('light');
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
    updateWeightWidgets();
    updateBMI();
    nextStep(15);
}

function renderProgressChart() {
    const ctx = document.getElementById('totalCaloriesChart');
    if (!ctx) return;

    const daysShortRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const now = new Date();
    
    // Get Monday of current week
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);

    const labels = [];
    const proteinData = [];
    const carbsData = [];
    const fatsData = [];
    let totalWeekCalories = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        labels.push(daysShortRu[date.getDay()]);
        
        const data = currentMacros.dailyHistory[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        
        const pCals = data.protein * 4;
        const cCals = data.carbs * 4;
        const fCals = data.fats * 9;
        
        proteinData.push(pCals);
        carbsData.push(cCals);
        fatsData.push(fCals);

        // If it's today, update the large display
        if (dateStr === now.toISOString().split('T')[0]) {
            const todayCals = data.calories || (pCals + cCals + fCals);
            document.getElementById('progress-total-calories').innerText = Math.round(todayCals);
        }
    }

    // Calculate dynamic scale
    let maxWeekVal = 0;
    for (let i = 0; i < 7; i++) {
        const total = proteinData[i] + carbsData[i] + fatsData[i];
        if (total > maxWeekVal) maxWeekVal = total;
    }
    
    let suggestedMax = 600;
    if (maxWeekVal * 1.1 > 600) {
        suggestedMax = Math.ceil((maxWeekVal * 1.1) / 600) * 600;
    }
    const stepSize = suggestedMax / 3;

    if (caloriesChart) {
        caloriesChart.data.labels = labels;
        caloriesChart.data.datasets[0].label = 'Жиры';
        caloriesChart.data.datasets[0].data = fatsData;
        caloriesChart.data.datasets[1].label = 'Углеводы';
        caloriesChart.data.datasets[1].data = carbsData;
        caloriesChart.data.datasets[2].label = 'Белки';
        caloriesChart.data.datasets[2].data = proteinData;
        
        // Update scales dynamically
        caloriesChart.options.scales.y.suggestedMax = suggestedMax;
        caloriesChart.options.scales.y.ticks.stepSize = stepSize;
        
        caloriesChart.update();
    } else {
        caloriesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Жиры',
                        data: fatsData,
                        backgroundColor: '#8bb6e5',
                        borderRadius: (ctx) => {
                            const val = ctx.raw;
                            const idx = ctx.dataIndex;
                            const hasCarbs = carbsData[idx] > 0;
                            const hasProtein = proteinData[idx] > 0;
                            if (!hasCarbs && !hasProtein && val > 0) return { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 };
                            return 0;
                        },
                        borderSkipped: false,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        borderWidth: 0
                    },
                    {
                        label: 'Углеводы',
                        data: carbsData,
                        backgroundColor: '#e5b68b',
                        borderRadius: (ctx) => {
                            const val = ctx.raw;
                            const idx = ctx.dataIndex;
                            const hasProtein = proteinData[idx] > 0;
                            if (!hasProtein && val > 0) return { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 };
                            return 0;
                        },
                        borderSkipped: false,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        borderWidth: 0
                    },
                    {
                        label: 'Белки',
                        data: proteinData,
                        backgroundColor: '#e58b8b',
                        borderRadius: {
                            topLeft: 5,
                            topRight: 5,
                            bottomLeft: 0,
                            bottomRight: 0
                        },
                        borderSkipped: false,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#000',
                        bodyColor: '#666',
                        borderColor: '#eee',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${Math.round(context.raw)} ккал`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#aaa',
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif"
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        min: 0,
                        suggestedMax: suggestedMax,
                        ticks: {
                            stepSize: stepSize,
                            color: '#aaa',
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif"
                            },
                            padding: 10
                        },
                        grid: {
                            color: '#f0f0f0',
                            borderDash: [4, 4],
                            drawBorder: false,
                            drawTicks: false
                        },
                        border: {
                            display: false,
                            dash: [4, 4]
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 5,
                        right: 5,
                        bottom: 0,
                        left: 0
                    }
                }
            }
        });
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

/**
 * Weight and Progress Widgets Logic
 */
function logNewWeight() {
    openWeightRuler();
}

function updateWeightWidgets() {
    const currentWeightEl = document.getElementById('stats-current-weight');
    const streakCountEl = document.getElementById('stats-streak-count');
    
    if (currentWeightEl) currentWeightEl.innerText = userData.weight || '--';
    
    // Update streak from existing logic
    const streakCount = parseInt(localStorage.getItem('streakCount')) || 0;
    if (streakCountEl) streakCountEl.innerText = streakCount;
    
    updateStreakDots(streakCount);
    renderWeightChart();
}

function updateStreakDots(count) {
    const dotsContainer = document.getElementById('stats-streak-dots');
    if (!dotsContainer) return;
    
    const dayLabels = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
    dotsContainer.innerHTML = '';
    
    // Get current day of week (0 for Sunday, 1 for Monday, etc.)
    const now = new Date();
    let currentDay = now.getDay();
    // Adjust to our array: 0=Mon, 1=Tue, ..., 6=Sun
    // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    let todayIdx = currentDay === 0 ? 6 : currentDay - 1;

    for (let i = 0; i < 7; i++) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const dot = document.createElement('div');
        dot.className = 'streak-dot circle-day';
        
        // Highlight logic:
        // 1. Current day is always highlighted (orange/active)
        // 2. Previous days are highlighted if streak count covers them
        // For simplicity: if it's today, it's active.
        // If it's before today and (todayIdx - i) < count, it's active.
        if (i === todayIdx) {
            dot.classList.add('active');
        } else if (i < todayIdx && (todayIdx - i) < count) {
            dot.classList.add('active');
        }
        
        const label = document.createElement('span');
        label.className = 'day-label';
        label.innerText = dayLabels[i];
        if (i === todayIdx) {
            label.style.color = '#ff9500'; // Highlight current day label
            label.style.fontWeight = 'bold';
        }
        
        dayColumn.appendChild(dot);
        dayColumn.appendChild(label);
        dotsContainer.appendChild(dayColumn);
    }
}

function renderWeightChart() {
    const canvas = document.getElementById('weightHistoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const style = getComputedStyle(document.body);
    const gridColor = style.getPropertyValue('--border-color').trim() || '#e5e5ea';
    const textColor = style.getPropertyValue('--text-secondary').trim() || '#8e8e93';
    const cardBg = style.getPropertyValue('--bg-card').trim() || '#ffffff';
    
    // Get primary text color for points and lines (Black in Light, White in Dark)
    const primaryColor = style.getPropertyValue('--text-primary').trim() || '#000000';
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const accentColor = isDark ? '#ffffff' : '#000000';

    // Create gradient based on theme
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    if (isDark) {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    } else {
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    }

    const history = currentMacros.weightHistory || [];
    // Get last 7 entries or all if less
    const lastEntries = history.slice(-7);
    
    const labels = lastEntries.map(e => {
        const d = new Date(e.date);
        const day = d.getDate();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}`;
    });
    const data = lastEntries.map(e => e.weight);

    // If no history, add current weight as first point
    if (data.length === 0) {
        labels.push('Сегодня');
        data.push(userData.weight);
    }

    if (weightChart) {
        weightChart.data.labels = labels;
        weightChart.data.datasets[0].data = data;
        weightChart.data.datasets[0].backgroundColor = gradient;
        weightChart.data.datasets[0].borderColor = accentColor;
        weightChart.data.datasets[0].pointBackgroundColor = accentColor;
        weightChart.data.datasets[0].pointBorderColor = cardBg;
        weightChart.options.scales.y.grid.color = 'rgba(128, 128, 128, 0.15)';
        weightChart.options.scales.y.ticks.color = textColor;
        weightChart.options.scales.x.ticks.color = textColor;
        weightChart.update();
    } else {
        weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: accentColor,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: accentColor,
                    pointBorderColor: cardBg,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    },
                    y: {
                        suggestedMin: Math.min(...data) - 2,
                        suggestedMax: Math.max(...data) + 2,
                        grid: {
                            color: 'rgba(128, 128, 128, 0.15)',
                            borderDash: [8, 4],
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    }
}

function openSettings() {
    triggerHaptic('light');
    nextStep(16);
    loadSettingsData();
}

function updateAllUINorms() {
    // Update home screen norms
    const caloriesLeft = Math.round(Math.max(0, currentMacros.totalCalories - currentMacros.calories));
    const proteinLeft = Math.round(Math.max(0, currentMacros.totalProtein - currentMacros.protein));
    const carbsLeft = Math.round(Math.max(0, currentMacros.totalCarbs - currentMacros.carbs));
    const fatsLeft = Math.round(Math.max(0, currentMacros.totalFats - currentMacros.fats));

    const elCalories = document.getElementById('home-calories-left');
    const elProtein = document.getElementById('home-protein-eaten');
    const elCarbs = document.getElementById('home-carbs-eaten');
    const elFats = document.getElementById('home-fats-eaten');

    if (elCalories) elCalories.innerText = caloriesLeft;
    if (elProtein) elProtein.innerText = proteinLeft;
    if (elCarbs) elCarbs.innerText = carbsLeft;
    if (elFats) elFats.innerText = fatsLeft;

    setHomeProgress('home-ring-calories', (currentMacros.calories / currentMacros.totalCalories) * 100, 282.7);
    setHomeProgress('home-ring-protein', (currentMacros.protein / currentMacros.totalProtein) * 100, 100);
    setHomeProgress('home-ring-carbs', (currentMacros.carbs / currentMacros.totalCarbs) * 100, 100);
    setHomeProgress('home-ring-fats', (currentMacros.fats / currentMacros.totalFats) * 100, 100);

    // Update settings display
    loadSettingsData();
}

function editSetting(type) {
    const modal = document.getElementById('settings-edit-modal');
    const title = document.getElementById('edit-modal-title');
    const container = document.getElementById('edit-input-container');
    const saveBtn = document.getElementById('save-edit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    const goalMap = { 'lose': '📉 Похудение', 'maintain': '⚖️ Норма', 'gain': '💪 Набор массы' };
    const activityMap = {
        1.2: '🧘 Сидячий (0-2)',
        1.375: '🚶 Лёгкий (2-3)',
        1.55: '🏃 Умеренный (3-5)',
        1.725: '🚴 Высокая (6+)',
        1.9: '🏋️ Экстремальная'
    };

    let content = '';
    let currentTitle = '';
    let selectedVal = null;

    if (type === 'goal') selectedVal = userData.goal;
    if (type === 'activity') selectedVal = userData.activity;

    switch (type) {
        case 'weight':
            currentTitle = 'Вес';
            content = `<input type="number" id="edit-value-input" class="modal-input" value="${userData.weight}">`;
            break;
        case 'height':
            modal.classList.add('hidden');
            openHeightRuler();
            return;
        case 'activity':
            currentTitle = 'Активность';
            content = `<div class="choice-grid">`;
            for (const [val, label] of Object.entries(activityMap)) {
                const isActive = userData.activity == val ? 'active' : '';
                content += `<button class="choice-card ${isActive}" data-value="${val}">${label}</button>`;
            }
            content += `</div><input type="hidden" id="edit-value-input" value="${userData.activity}">`;
            break;
        case 'goal':
            currentTitle = 'Цель';
            content = `<div class="choice-grid">`;
            for (const [val, label] of Object.entries(goalMap)) {
                const isActive = userData.goal == val ? 'active' : '';
                content += `<button class="choice-card ${isActive}" data-value="${val}">${label}</button>`;
            }
            content += `</div><input type="hidden" id="edit-value-input" value="${userData.goal}">`;
            break;
    }

    title.innerText = currentTitle;
    container.innerHTML = content;
    modal.classList.remove('hidden');

    // Add click listeners for choice cards
    if (type === 'activity' || type === 'goal') {
        const cards = container.querySelectorAll('.choice-card');
        cards.forEach(card => {
            card.onclick = () => {
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const newVal = card.getAttribute('data-value');
                document.getElementById('edit-value-input').value = newVal;
                triggerHaptic('light');
            };
        });
    }

    const handleSave = () => {
        const input = document.getElementById('edit-value-input');
        const val = input.value;

        if (type === 'weight' || type === 'height') {
            if (val && !isNaN(val)) {
                userData[type] = parseFloat(val);
            }
        } else if (type === 'activity') {
            userData.activity = parseFloat(val);
        } else if (type === 'goal') {
            userData.goal = val;
        }

        triggerHaptic('success');
        calculateNorms();
        saveAllData();
        updateAllUINorms();
        closeModal();
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    saveBtn.onclick = handleSave;
    cancelBtn.onclick = closeModal;
    saveBtn.innerText = "Добавить";
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
    const modal = document.getElementById('reset-confirm-modal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('confirm-reset-btn');
    const cancelBtn = document.getElementById('cancel-reset-btn');
    
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            triggerHaptic('warning');
            localStorage.clear();
            location.reload();
        };
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            triggerHaptic('light');
            modal.classList.add('hidden');
        };
    }

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            triggerHaptic('light');
            modal.classList.add('hidden');
        }
    };
}

function setProgress(id, percent) {
    const circle = document.getElementById(id);
    if (circle) {
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        
        // Ограничиваем визуальное заполнение максимум на 100%
        const visualPercent = Math.min(percent, 100);
        const offset = circumference - (visualPercent / 100 * circumference);
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
    }
}

function initRecipeModal() {
    const saveBtn = document.getElementById('save-recipe-btn');
    const cancelBtn = document.getElementById('cancel-recipe-btn');
    const modal = document.getElementById('recipe-modal');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (currentRecipeData) {
                const foodItem = {
                    id: Date.now().toString(),
                    name: currentRecipeData.recipeName,
                    calories: currentRecipeData.calories,
                    protein: currentRecipeData.protein,
                    fats: currentRecipeData.fat,
                    carbs: currentRecipeData.carbs,
                    thumbnail: thumbnailDataUrl // Use the global photo
                };
                addFoodToHome(foodItem, thumbnailDataUrl);
                modal.classList.add('hidden');
                currentRecipeData = null;
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}

function showRecipeModal(recipeData) {
    currentRecipeData = recipeData;
    
    document.getElementById('recipe-title').innerText = recipeData.recipeName || "Рецепт";
    document.getElementById('recipe-cal').innerText = recipeData.calories || 0;
    document.getElementById('recipe-p').innerText = recipeData.protein || 0;
    document.getElementById('recipe-f').innerText = recipeData.fat || 0;
    document.getElementById('recipe-c').innerText = recipeData.carbs || 0;
    
    // Formatting instructions
    const instructionsContainer = document.getElementById('recipe-instructions');
    if (instructionsContainer) {
        instructionsContainer.innerHTML = '';
        const instructionsText = recipeData.instructions || "";
        const steps = instructionsText.split('\n').filter(step => step.trim() !== '');
        
        steps.forEach((stepText) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'recipe-step-item';
            stepDiv.textContent = stepText;
            instructionsContainer.appendChild(stepDiv);
        });
    }
    
    const modal = document.getElementById('recipe-modal');
    if (modal) modal.classList.remove('hidden');
}

function initCheckModal() {
    const recheckBtn = document.getElementById('recheck-btn');
    const closeBtn = document.getElementById('close-check-btn');
    const modal = document.getElementById('check-result-modal');

    if (recheckBtn) {
        recheckBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            cameraMode = 'check';
            openCamera();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}

function showCheckResult(result) {
    const modal = document.getElementById('check-result-modal');
    const scoreFill = document.getElementById('check-score-fill');
    const scoreNum = document.getElementById('check-score-number');
    const summaryText = document.getElementById('check-summary');
    const nameDisplay = document.getElementById('product-name-display');

    if (!modal || !scoreFill || !scoreNum || !summaryText) return;

    // Reset before animation
    scoreNum.innerText = "0";
    scoreFill.style.width = "0%";
    if (nameDisplay) nameDisplay.innerText = result.product_name || "";
    
    const score = result.score || 0;

    // Set color based on score
    let color = "#ff3b30"; // Red 0-40
    if (score > 40 && score <= 70) {
        color = "#ff9f0a"; // Orange/Yellow 41-70
    } else if (score > 70) {
        color = "#34c759"; // Green 71-100
    }
    scoreFill.style.backgroundColor = color;

    // Create cards HTML
    const pros = result.pros || "";
    const cons = result.cons || "";
    const verdict = result.verdict || "";

    summaryText.innerHTML = `
        <div class="analysis-card-item" style="border-left: 4px solid ${color}">
            <div class="analysis-card-title">Плюсы состава</div>
            <div class="analysis-card-text">${pros}</div>
        </div>
        <div class="analysis-card-item" style="border-left: 4px solid ${color}">
            <div class="analysis-card-title">Минусы состава</div>
            <div class="analysis-card-text">${cons}</div>
        </div>
        <div class="analysis-card-item" style="border-left: 4px solid ${color}">
            <div class="analysis-card-title">Вердикт</div>
            <div class="analysis-card-text">${verdict}</div>
        </div>
    `;

    modal.classList.remove('hidden');
    
    // Start animation after modal is visible
    setTimeout(() => {
        animateScore(score);
    }, 100);
}

function animateScore(targetScore) {
    const scoreFill = document.getElementById('check-score-fill');
    const scoreNum = document.getElementById('check-score-number');
    if (!scoreFill || !scoreNum) return;

    let currentScore = 0;
    const duration = 1200; // 1.2 seconds
    const startTime = performance.now();

    function update(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function: easeOutCubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        currentScore = Math.floor(easeProgress * targetScore);
        
        scoreNum.innerText = currentScore;
        scoreFill.style.width = (easeProgress * targetScore) + "%";

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            scoreNum.innerText = targetScore;
            scoreFill.style.width = targetScore + "%";
        }
    }

    requestAnimationFrame(update);
}
