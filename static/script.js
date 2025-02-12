// Time format state
let use24HourFormat = JSON.parse(localStorage.getItem('use24HourFormat')) ?? true;

// Default timezones and time constants
const DEFAULT_TIMEZONES = [
    'America/Los_Angeles',
    'America/New_York',
    'Europe/Athens'
];

const TIME_PERIODS = {
    MORNING: { start: 5, end: 12, label: 'Morning', icon: '🌅' },
    AFTERNOON: { start: 12, end: 17, label: 'Afternoon', icon: '☀️' },
    EVENING: { start: 17, end: 21, label: 'Evening', icon: '🌆' },
    NIGHT: { start: 21, end: 5, label: 'Night', icon: '🌙' }
};

// Time ranges for day/night calculation
const BUSINESS_HOURS = {
    START: 9,  // 9 AM
    END: 17,   // 5 PM
    EARLY: 7,  // 7 AM
    LATE: 19   // 7 PM
};

// Slider configuration
const SLIDER_CONFIG = {
    STEPS: 96,  // 24 hours * 4 (15-minute increments)
    MINUTES_PER_STEP: 15
};

// Initialize selected timezones from localStorage or default timezones
let selectedTimezones = new Set(JSON.parse(localStorage.getItem('selectedTimezones')) || DEFAULT_TIMEZONES);

// Initialize Select2
$(document).ready(function() {
    $('#timezoneSelect').select2({
        placeholder: "Search for a timezone...",
        width: '100%',
        theme: 'default'
    });

    // Load saved settings
    loadSettings();

    // Set slider to current time
    initializeTimeSlider();

    // Restore previously selected timezones
    selectedTimezones.forEach(timezone => {
        addTimezoneCard(timezone);
    });

    // Initialize time display
    updateTime();

    // Initialize time format toggle button state
    const formatText = document.querySelector('#toggleTimeFormat .format-text');
    formatText.textContent = use24HourFormat ? '24h' : '12h';

    // Add click event listener for time format toggle
    document.getElementById('toggleTimeFormat').addEventListener('click', toggleTimeFormat);
});

function toggleTimeFormat() {
    use24HourFormat = !use24HourFormat;
    const formatText = document.querySelector('#toggleTimeFormat .format-text');
    formatText.textContent = use24HourFormat ? '24h' : '12h';
    updateAllTimezones();
    updateTime();
    saveSettings();
}

function formatTime(dateTime) {
    return use24HourFormat ? 
        dateTime.toFormat('HH:mm') : 
        dateTime.toFormat('h:mm a');
}

function initializeTimeSlider() {
    const now = luxon.DateTime.local();
    const totalMinutes = now.hour * 60 + now.minute;
    const sliderValue = Math.round(totalMinutes / SLIDER_CONFIG.MINUTES_PER_STEP);
    
    const slider = document.getElementById('timeSlider');
    slider.min = 0;
    slider.max = SLIDER_CONFIG.STEPS - 1;
    slider.value = sliderValue;
    
    // Update labels
    updateSliderLabels();
}

function updateSliderLabels() {
    const slider = document.getElementById('timeSlider');
    const baseTime = getCurrentBaseTime();
    
    // Update -3h and +3h labels
    const minus3h = baseTime.minus({ hours: 3 }).toFormat('HH:mm');
    const plus3h = baseTime.plus({ hours: 3 }).toFormat('HH:mm');
    
    document.getElementById('sliderStartTime').textContent = minus3h;
    document.getElementById('sliderEndTime').textContent = plus3h;
}

function getCurrentBaseTime() {
    const slider = document.getElementById('timeSlider');
    const totalMinutes = slider.value * SLIDER_CONFIG.MINUTES_PER_STEP;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return luxon.DateTime.local().set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0
    });
}

function getTimePeriod(hour) {
    if (hour >= TIME_PERIODS.NIGHT.end && hour < TIME_PERIODS.MORNING.end) {
        return TIME_PERIODS.MORNING;
    } else if (hour >= TIME_PERIODS.MORNING.end && hour < TIME_PERIODS.AFTERNOON.end) {
        return TIME_PERIODS.AFTERNOON;
    } else if (hour >= TIME_PERIODS.AFTERNOON.end && hour < TIME_PERIODS.EVENING.end) {
        return TIME_PERIODS.EVENING;
    } else {
        return TIME_PERIODS.NIGHT;
    }
}

function calculateDayProgress(hour, minute) {
    return ((hour * 60 + minute) / (24 * 60)) * 100;
}

function addTimezone() {
    const select = document.getElementById('timezoneSelect');
    const timezone = select.value;
    
    if (!selectedTimezones.has(timezone)) {
        selectedTimezones.add(timezone);
        addTimezoneCard(timezone);
        saveSettings();
    }
}

function addTimezoneCard(timezone) {
    const card = document.createElement('div');
    card.className = 'timezone-card';
    card.id = `timezone-${timezone.replace(/\//g, '-')}`;
    card.innerHTML = `
        <div class="delete-confirm">
            <span>Delete?</span>
            <button class="confirm-yes" onclick="confirmDelete('${timezone}', true)">Yes</button>
            <button class="confirm-no" onclick="confirmDelete('${timezone}', false)">No</button>
        </div>
        <span class="remove-btn" onclick="showDeleteConfirm('${timezone}')">&times;</span>
        <div class="content">
            <div>
                <div class="timezone-name">${timezone}</div>
                <div class="time">Loading...</div>
                <div class="timezone-offset">Loading...</div>
            </div>
            <div class="time-details">
                <span class="time-period">Loading...</span>
            </div>
        </div>
        <div class="time-progress">
            <div class="time-progress-bar"></div>
        </div>
    `;
    
    document.getElementById('timezoneList').appendChild(card);
    sortTimezoneCards(getCurrentBaseTime());
}

function showDeleteConfirm(timezone) {
    // Hide any other visible confirmation popups
    document.querySelectorAll('.delete-confirm.visible').forEach(popup => {
        if (popup.closest('.timezone-card').id !== `timezone-${timezone.replace(/\//g, '-')}`) {
            popup.classList.remove('visible');
        }
    });
    
    // Show this confirmation popup
    const card = document.getElementById(`timezone-${timezone.replace(/\//g, '-')}`);
    const confirm = card.querySelector('.delete-confirm');
    confirm.classList.add('visible');
}

function confirmDelete(timezone, confirmed) {
    const card = document.getElementById(`timezone-${timezone.replace(/\//g, '-')}`);
    const confirm = card.querySelector('.delete-confirm');
    confirm.classList.remove('visible');
    
    if (confirmed) {
        selectedTimezones.delete(timezone);
        card.remove();
        saveSettings();
        updateMeetingSummary(getCurrentBaseTime());
    }
}

function updateTime() {
    const baseTime = getCurrentBaseTime();
    const timeString = formatTime(baseTime);
    document.getElementById('selectedTime').textContent = timeString;
    
    updateAllTimezones();
    updateSliderLabels();
}

function updateMeetingSummary(baseTime) {
    const summaryElement = document.getElementById('meetingSummary');
    const recommendationText = document.getElementById('recommendationText').textContent;
    
    let summary = `📅 Proposed Meeting Time\n`;
    summary += `──────────────────────\n\n`;
    
    // Add the recommendation
    summary += `${recommendationText}\n\n`;
    
    // Add times for each timezone
    [...selectedTimezones].sort((a, b) => {
        const timeA = baseTime.setZone(a);
        const timeB = baseTime.setZone(b);
        return timeA.valueOf() - timeB.valueOf();
    }).forEach(timezone => {
        try {
            const zonedTime = baseTime.setZone(timezone);
            const timeStr = formatTime(zonedTime);
            const zoneAbbr = zonedTime.toFormat('ZZZZ');
            const dayName = zonedTime.toFormat('cccc');
            const isDayTime = isDaytime(zonedTime.hour);
            const icon = isDayTime ? '☀️' : '🌙';
            summary += `${icon} ${timezone} (${zoneAbbr}): ${timeStr} ${dayName}\n`;
        } catch (error) {
            console.error('Error formatting time for timezone:', timezone, error);
        }
    });
    
    summaryElement.textContent = summary;
}

function removeTimezone(timezone) {
    if (confirm('Are you sure you want to remove this timezone?')) {
        selectedTimezones.delete(timezone);
        document.getElementById(`timezone-${timezone}`).remove();
        saveSettings();
        updateMeetingSummary(getCurrentBaseTime());
    }
}

function resetToDefaults() {
    // Clear existing timezones
    clearAllTimezones();
    
    // Reset to default timezones
    selectedTimezones = new Set(DEFAULT_TIMEZONES);
    selectedTimezones.forEach(timezone => {
        addTimezoneCard(timezone);
    });
    
    // Reset time format to 24h
    use24HourFormat = true;
    const formatText = document.querySelector('#toggleTimeFormat .format-text');
    formatText.textContent = '24h';
    
    // Update displays
    updateAllTimezones();
    updateTime();
    
    // Save new defaults
    saveSettings();
}

function clearAllTimezones() {
    selectedTimezones.clear();
    saveSettings();
    
    const timezoneList = document.getElementById('timezoneList');
    timezoneList.innerHTML = '';
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
}

function saveSettings() {
    localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat));
    localStorage.setItem('selectedTimezones', JSON.stringify(Array.from(selectedTimezones)));
}

function loadSettings() {
    // Time format
    use24HourFormat = JSON.parse(localStorage.getItem('use24HourFormat')) ?? true;
    
    // Selected timezones (already handled in initialization)
    const savedTimezones = JSON.parse(localStorage.getItem('selectedTimezones'));
    if (savedTimezones) {
        selectedTimezones = new Set(savedTimezones);
    }
}

function isDaytime(hour) {
    return hour >= BUSINESS_HOURS.EARLY && hour < BUSINESS_HOURS.LATE;
}

function getTimeScore(hour) {
    // Core business hours get highest score
    if (hour >= BUSINESS_HOURS.START && hour < BUSINESS_HOURS.END) {
        // Optimal hours (10 AM - 4 PM) get perfect score
        if (hour >= 10 && hour < 16) {
            return 1.0;
        }
        // Early or late business hours get very good score
        return 0.9;
    }
    // Early morning or early evening hours
    else if ((hour >= BUSINESS_HOURS.EARLY && hour < BUSINESS_HOURS.START) ||
             (hour >= BUSINESS_HOURS.END && hour < BUSINESS_HOURS.LATE)) {
        // More favorable early/late hours
        if ((hour >= 8 && hour < 9) || (hour >= 17 && hour < 18)) {
            return 0.75;
        }
        // Less favorable early/late hours
        return 0.6;
    }
    // Late evening hours (19-22) get lower score
    else if (hour >= BUSINESS_HOURS.LATE && hour < 22) {
        return 0.4;
    }
    // Night hours (22-7) get lowest score
    else {
        return 0.2;
    }
}

function updateRecommendation(timeScores) {
    const avgScore = timeScores.reduce((a, b) => a + b, 0) / timeScores.length;
    const marker = document.getElementById('recommendationMarker');
    const recommendationText = document.getElementById('recommendationText');
    
    // Update marker position
    marker.style.left = `${avgScore * 100}%`;
    
    // Count zones in different time ranges
    const businessHoursCount = timeScores.filter(score => score >= 0.9).length;
    const acceptableHoursCount = timeScores.filter(score => score >= 0.6 && score < 0.9).length;
    const challengingHoursCount = timeScores.filter(score => score < 0.6).length;
    
    // Generate recommendation text
    if (avgScore > 0.9) {
        recommendationText.textContent = '✨ Perfect! Core business hours for all zones';
    } else if (avgScore > 0.8) {
        recommendationText.textContent = `✨ Great! Business hours for ${businessHoursCount}/${timeScores.length} zones`;
    } else if (avgScore > 0.6) {
        recommendationText.textContent = `👍 Good - ${businessHoursCount} business, ${acceptableHoursCount} acceptable`;
    } else if (avgScore > 0.4) {
        const earlyLateCount = acceptableHoursCount;
        recommendationText.textContent = `😐 Workable - ${earlyLateCount} early/late, ${challengingHoursCount} challenging`;
    } else {
        recommendationText.textContent = `⚠️ Difficult - ${challengingHoursCount}/${timeScores.length} zones outside work hours`;
    }
}

function updateAllTimezones() {
    const baseTime = getCurrentBaseTime();
    const timeScores = [];

    selectedTimezones.forEach(timezone => {
        try {
            // Convert the time to the target timezone
            const zonedTime = baseTime.setZone(timezone);
            const localHour = zonedTime.hour;
            const localMinute = zonedTime.minute;
            
            // Calculate time period and progress
            const timePeriod = getTimePeriod(localHour);
            const dayProgress = calculateDayProgress(localHour, localMinute);
            const timeScore = getTimeScore(localHour);
            timeScores.push(timeScore);
            
            // Update the card
            const card = document.getElementById(`timezone-${timezone.replace(/\//g, '-')}`);
            if (card) {
                const timeElement = card.querySelector('.time');
                const periodElement = card.querySelector('.time-period');
                const progressBar = card.querySelector('.time-progress-bar');
                const offsetElement = card.querySelector('.timezone-offset');
                
                // Format time with named timezone abbreviation
                const timeStr = formatTime(zonedTime);
                const zoneAbbr = zonedTime.toFormat('ZZZZ');
                timeElement.textContent = timeStr;
                offsetElement.textContent = zoneAbbr;
                
                periodElement.textContent = `${timePeriod.icon} ${timePeriod.label}`;
                periodElement.className = `time-period ${timePeriod.label.toLowerCase()}`;
                
                // Update progress bar color and marker
                const timeColor = getTimeColor(localHour);
                progressBar.style.width = '100%';
                progressBar.style.background = timeColor;
                progressBar.innerHTML = `<div class="time-progress-marker" style="left: ${dayProgress}%"></div>`;
                
                // Update card styling
                card.className = 'timezone-card';
            }
        } catch (error) {
            console.error('Error converting time for timezone:', timezone, error);
            const card = document.getElementById(`timezone-${timezone.replace(/\//g, '-')}`);
            if (card) {
                const timeElement = card.querySelector('.time');
                timeElement.textContent = 'Invalid timezone';
            }
        }
    });

    // Sort timezone cards
    sortTimezoneCards(baseTime);

    // Update the recommendation bar
    if (timeScores.length > 0) {
        updateRecommendation(timeScores);
    }

    // Update the meeting summary
    updateMeetingSummary(baseTime);
}

function getTimeColor(hour) {
    // Define color stops for each hour (24 colors)
    const colors = [
        '#2d3748', // 0:00 (Midnight)
        '#1a365d', // 1:00
        '#1a365d', // 2:00
        '#2b6cb0', // 3:00
        '#2b6cb0', // 4:00
        '#4299e1', // 5:00 (Dawn)
        '#63b3ed', // 6:00
        '#90cdf4', // 7:00
        '#fbd38d', // 8:00
        '#fbd38d', // 9:00
        '#f6ad55', // 10:00
        '#ed8936', // 11:00
        '#dd6b20', // 12:00 (Noon)
        '#ed8936', // 13:00
        '#f6ad55', // 14:00
        '#fbd38d', // 15:00
        '#90cdf4', // 16:00
        '#63b3ed', // 17:00
        '#4299e1', // 18:00
        '#3182ce', // 19:00
        '#2b6cb0', // 20:00
        '#2c5282', // 21:00
        '#1a365d', // 22:00
        '#2d3748'  // 23:00
    ];
    return colors[hour];
}

function sortTimezoneCards(baseTime) {
    const timezoneList = document.getElementById('timezoneList');
    const cards = Array.from(timezoneList.children);
    
    cards.sort((a, b) => {
        const timeA = baseTime.setZone(a.id.replace('timezone-', '').replace(/-/g, '/'));
        const timeB = baseTime.setZone(b.id.replace('timezone-', '').replace(/-/g, '/'));
        return timeA.valueOf() - timeB.valueOf();
    });
    
    cards.forEach(card => timezoneList.appendChild(card));
}

document.getElementById('timeSlider').addEventListener('input', updateTime);

// Add keyboard controls for time adjustment
document.addEventListener('keydown', function(event) {
    const slider = document.getElementById('timeSlider');
    const currentValue = parseInt(slider.value);
    
    switch(event.key) {
        case 'ArrowLeft':
            // Move 15 minutes backward (1 step)
            if (currentValue > 0) {
                slider.value = currentValue - 1;
                updateTime();
            }
            event.preventDefault();
            break;
        case 'ArrowRight':
            // Move 15 minutes forward (1 step)
            if (currentValue < SLIDER_CONFIG.STEPS - 1) {
                slider.value = currentValue + 1;
                updateTime();
            }
            event.preventDefault();
            break;
    }
});

function copyMeetingSummary() {
    const summaryText = document.getElementById('meetingSummary').textContent;
    navigator.clipboard.writeText(summaryText).then(() => {
        const feedback = document.getElementById('copyFeedback');
        feedback.textContent = '✓ Copied to clipboard!';
        feedback.classList.add('show');
        
        setTimeout(() => {
            feedback.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        const feedback = document.getElementById('copyFeedback');
        feedback.textContent = '❌ Failed to copy. Please try again.';
        feedback.classList.add('show');
    });
}

function addToCalendar() {
    // Set default date to tomorrow
    const tomorrow = luxon.DateTime.local().plus({ days: 1 });
    document.getElementById('meetingDate').value = tomorrow.toFormat('yyyy-MM-dd');
    
    // Set default title
    const baseTime = getCurrentBaseTime();
    const timeStr = formatTime(baseTime);
    document.getElementById('meetingTitle').value = `Meeting at ${timeStr}`;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('calendarModal'));
    modal.show();
}

function generateCalendarEvent() {
    const title = document.getElementById('meetingTitle').value;
    const date = document.getElementById('meetingDate').value;
    const duration = document.getElementById('meetingDuration').value;
    const description = document.getElementById('meetingDescription').value;

    // Get the selected time
    const baseTime = getCurrentBaseTime();
    
    // Create start datetime
    const startDateTime = luxon.DateTime.fromISO(date)
        .set({
            hour: baseTime.hour,
            minute: baseTime.minute
        });
    
    // Create end datetime
    const endDateTime = startDateTime.plus({ minutes: parseInt(duration) });

    // Generate timezone information
    let timezoneInfo = '\n\nMeeting Times:\n';
    selectedTimezones.forEach(timezone => {
        const zonedTime = startDateTime.setZone(timezone);
        const timeStr = formatTime(zonedTime);
        const zoneAbbr = zonedTime.toFormat('ZZZZ');
        timezoneInfo += `${timezone} (${zoneAbbr}): ${timeStr}\n`;
    });

    // Create calendar event URL
    const eventParams = {
        text: title,
        details: description + timezoneInfo,
        dates: `${startDateTime.toFormat('yyyyMMdd')}T${startDateTime.toFormat('HHmmss')}/${endDateTime.toFormat('yyyyMMdd')}T${endDateTime.toFormat('HHmmss')}`,
    };

    // Create Google Calendar URL
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventParams.text)}&details=${encodeURIComponent(eventParams.details)}&dates=${eventParams.dates}`;

    // Create .ics file content
    const icsContent = generateICSFile(title, description + timezoneInfo, startDateTime, endDateTime);
    const icsBlob = new Blob([icsContent], { type: 'text/calendar' });
    const icsUrl = URL.createObjectURL(icsBlob);

    // Create download links
    const downloadIcs = document.createElement('a');
    downloadIcs.href = icsUrl;
    downloadIcs.download = 'meeting.ics';
    downloadIcs.click();

    // Open Google Calendar in new tab
    window.open(googleUrl, '_blank');

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('calendarModal'));
    modal.hide();
}

function generateICSFile(title, description, start, end) {
    const formatDateTime = (dt) => dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Timezone Scheduler//EN
BEGIN:VEVENT
UID:${Date.now()}@timezone-scheduler
DTSTAMP:${formatDateTime(luxon.DateTime.local())}
DTSTART:${formatDateTime(start)}
DTEND:${formatDateTime(end)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
END:VEVENT
END:VCALENDAR`;
}
