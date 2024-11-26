// Time format state
let use24HourFormat = true;

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

    // Set slider to current time
    initializeTimeSlider();

    // Restore previously selected timezones
    selectedTimezones.forEach(timezone => {
        addTimezoneCard(timezone);
    });

    // Initialize time display
    updateTime();

    // Initialize time format toggle
    document.getElementById('toggleTimeFormat').addEventListener('click', toggleTimeFormat);
});

function toggleTimeFormat() {
    use24HourFormat = !use24HourFormat;
    const formatText = document.querySelector('#toggleTimeFormat .format-text');
    formatText.textContent = use24HourFormat ? '24h' : '12h';
    updateAllTimezones();
    updateTime();
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
    
    if (selectedTimezones.has(timezone)) {
        alert('This timezone is already added!');
        return;
    }
    
    selectedTimezones.add(timezone);
    saveTimezones();
    addTimezoneCard(timezone);
    updateAllTimezones();
}

function addTimezoneCard(timezone) {
    const card = document.createElement('div');
    card.className = 'timezone-card';
    card.id = `timezone-${timezone.replace(/\//g, '-')}`;
    card.innerHTML = `
        <span class="remove-btn" onclick="removeTimezone('${timezone}')">&times;</span>
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
    selectedTimezones.delete(timezone);
    saveTimezones();
    
    const card = document.getElementById(`timezone-${timezone.replace(/\//g, '-')}`);
    if (card) {
        card.remove();
    }
    updateAllTimezones();
}

function resetToDefaults() {
    // Clear existing timezones
    clearAllTimezones();
    
    // Add default timezones
    DEFAULT_TIMEZONES.forEach(timezone => {
        selectedTimezones.add(timezone);
        addTimezoneCard(timezone);
    });
    
    saveTimezones();
    updateAllTimezones();
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
}

function clearAllTimezones() {
    selectedTimezones.clear();
    saveTimezones();
    
    const timezoneList = document.getElementById('timezoneList');
    timezoneList.innerHTML = '';
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
    modal.hide();
}

function saveTimezones() {
    localStorage.setItem('selectedTimezones', JSON.stringify([...selectedTimezones]));
}

function isDaytime(hour) {
    return hour >= BUSINESS_HOURS.EARLY && hour < BUSINESS_HOURS.LATE;
}

function getTimeScore(hour) {
    if (hour >= BUSINESS_HOURS.START && hour < BUSINESS_HOURS.END) {
        return 1; // Business hours
    } else if (hour >= BUSINESS_HOURS.EARLY && hour < BUSINESS_HOURS.START) {
        return 0.7; // Early but acceptable
    } else if (hour >= BUSINESS_HOURS.END && hour < BUSINESS_HOURS.LATE) {
        return 0.7; // Late but acceptable
    } else {
        return 0.3; // Outside acceptable hours
    }
}

function updateRecommendation(timeScores) {
    const avgScore = timeScores.reduce((a, b) => a + b, 0) / timeScores.length;
    const marker = document.getElementById('recommendationMarker');
    const recommendationText = document.getElementById('recommendationText');
    
    // Update marker position
    marker.style.left = `${avgScore * 100}%`;
    
    // Update recommendation text
    if (avgScore > 0.8) {
        recommendationText.textContent = '✨ Great time!';
    } else if (avgScore > 0.6) {
        recommendationText.textContent = '👍 Good time';
    } else if (avgScore > 0.4) {
        recommendationText.textContent = '😐 Acceptable';
    } else {
        recommendationText.textContent = '⚠️ Reconsider';
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
            const daytime = isDaytime(localHour);
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
                
                // Update progress bar with marker
                progressBar.style.width = '100%';
                progressBar.innerHTML = `<div class="time-progress-marker" style="left: ${dayProgress}%"></div>`;
                
                // Update card styling
                card.className = `timezone-card ${daytime ? 'daytime' : 'nighttime'}`;
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
