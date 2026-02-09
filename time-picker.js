// Custom Time Picker
function initTimePicker() {
    const timeInput = document.getElementById('manual-time');
    const overlay = document.getElementById('time-picker-overlay');
    const doneBtn = document.getElementById('time-picker-done');
    const cancelBtn = document.getElementById('time-picker-cancel');
    const hoursColumn = document.getElementById('hours-column');
    const minutesColumn = document.getElementById('minutes-column');

    let selectedHour = new Date().getHours();
    let selectedMinute = new Date().getMinutes();

    // Generate hours (00-23)
    function generateHours() {
        hoursColumn.innerHTML = '';
        // Add padding items
        for (let i = 0; i < 2; i++) {
            const padding = document.createElement('div');
            padding.className = 'time-picker-item';
            padding.style.visibility = 'hidden';
            hoursColumn.appendChild(padding);
        }

        for (let i = 0; i < 24; i++) {
            const item = document.createElement('div');
            item.className = 'time-picker-item';
            item.textContent = String(i).padStart(2, '0');
            item.dataset.value = i;
            hoursColumn.appendChild(item);
        }

        // Add padding items
        for (let i = 0; i < 2; i++) {
            const padding = document.createElement('div');
            padding.className = 'time-picker-item';
            padding.style.visibility = 'hidden';
            hoursColumn.appendChild(padding);
        }
    }

    // Generate minutes (00-59)
    function generateMinutes() {
        minutesColumn.innerHTML = '';
        // Add padding items
        for (let i = 0; i < 2; i++) {
            const padding = document.createElement('div');
            padding.className = 'time-picker-item';
            padding.style.visibility = 'hidden';
            minutesColumn.appendChild(padding);
        }

        for (let i = 0; i < 60; i++) {
            const item = document.createElement('div');
            item.className = 'time-picker-item';
            item.textContent = String(i).padStart(2, '0');
            item.dataset.value = i;
            minutesColumn.appendChild(item);
        }

        // Add padding items
        for (let i = 0; i < 2; i++) {
            const padding = document.createElement('div');
            padding.className = 'time-picker-item';
            padding.style.visibility = 'hidden';
            minutesColumn.appendChild(padding);
        }
    }

    // Update active item
    function updateActiveItems() {
        // Hours
        const hourItems = hoursColumn.querySelectorAll('.time-picker-item');
        hourItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.value == selectedHour) {
                item.classList.add('active');
            }
        });

        // Minutes
        const minuteItems = minutesColumn.querySelectorAll('.time-picker-item');
        minuteItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.value == selectedMinute) {
                item.classList.add('active');
            }
        });
    }

    // Scroll to selected value
    function scrollToValue(column, value) {
        const items = column.querySelectorAll('.time-picker-item[data-value]');
        const targetItem = Array.from(items).find(item => item.dataset.value == value);
        if (targetItem) {
            targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    // Handle scroll
    function handleScroll(column, isHour) {
        const items = column.querySelectorAll('.time-picker-item[data-value]');
        const columnRect = column.getBoundingClientRect();
        const centerY = columnRect.top + columnRect.height / 2;

        let closestItem = null;
        let closestDistance = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenterY = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(centerY - itemCenterY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            const value = parseInt(closestItem.dataset.value);
            if (isHour) {
                selectedHour = value;
            } else {
                selectedMinute = value;
            }
            updateActiveItems();
        }
    }

    // Open picker
    timeInput.addEventListener('click', () => {
        triggerHaptic('light');

        // Parse current value if exists
        if (timeInput.value && timeInput.value !== '--:--') {
            const [hours, minutes] = timeInput.value.split(':');
            selectedHour = parseInt(hours);
            selectedMinute = parseInt(minutes);
        } else {
            const now = new Date();
            selectedHour = now.getHours();
            selectedMinute = now.getMinutes();
        }

        generateHours();
        generateMinutes();
        overlay.classList.remove('hidden');

        setTimeout(() => {
            scrollToValue(hoursColumn, selectedHour);
            scrollToValue(minutesColumn, selectedMinute);
            updateActiveItems();
        }, 100);
    });

    // Handle scroll events
    let hourScrollTimeout;
    hoursColumn.addEventListener('scroll', () => {
        clearTimeout(hourScrollTimeout);
        hourScrollTimeout = setTimeout(() => {
            handleScroll(hoursColumn, true);
            scrollToValue(hoursColumn, selectedHour);
        }, 150);
    });

    let minuteScrollTimeout;
    minutesColumn.addEventListener('scroll', () => {
        clearTimeout(minuteScrollTimeout);
        minuteScrollTimeout = setTimeout(() => {
            handleScroll(minutesColumn, false);
            scrollToValue(minutesColumn, selectedMinute);
        }, 150);
    });

    // Done button
    doneBtn.addEventListener('click', () => {
        triggerHaptic('success');
        const timeString = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
        timeInput.value = timeString;
        overlay.classList.add('hidden');
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        triggerHaptic('light');
        overlay.classList.add('hidden');
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            triggerHaptic('light');
            overlay.classList.add('hidden');
        }
    });
}
