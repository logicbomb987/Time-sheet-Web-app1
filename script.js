document.addEventListener('DOMContentLoaded', () => {
  const clockInInput = document.getElementById('clockInNumber');
  const clockOutInput = document.getElementById('clockOutNumber');
  const calendarDays = document.getElementById('calendarDays');
  const currentMonthElement = document.getElementById('currentMonth');
  const prevMonthButton = document.getElementById('prevMonth');
  const nextMonthButton = document.getElementById('nextMonth');
  const menuButton = document.getElementById('menuButton');
  const settingsModal = document.getElementById('settingsModal');
  const editDate = document.getElementById('editDate');
  const editClockIn = document.getElementById('editClockIn');
  const editClockOut = document.getElementById('editClockOut');
  const saveTimeEdit = document.getElementById('saveTimeEdit');
  const timeEditModal = document.getElementById('timeEditModal');
  const clearTimeEntry = document.getElementById('clearTimeEntry');

  // Phone numbers toggle functionality
  const phoneNumbersToggle = document.getElementById('phoneNumbersToggle');
  const phoneNumbersContent = document.getElementById('phoneNumbersContent');
  const savePhoneNumbersButton = document.createElement('button');
  savePhoneNumbersButton.id = 'savePhoneNumbers';
  savePhoneNumbersButton.className = 'save-button';
  savePhoneNumbersButton.textContent = 'Save Phone Numbers';

  phoneNumbersToggle.addEventListener('click', () => {
    phoneNumbersToggle.classList.toggle('active');
    phoneNumbersContent.classList.toggle('show');
  });

  let currentDate = new Date();
  const MAX_MONTHLY_HOURS = 124;

  function getStorageKey(date) {
    return `timesheet_${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
  }

  function getTimeData(date) {
    const key = getStorageKey(date);
    try {
      const data = localStorage.getItem(key);
      if (!data) return { status: 'none', clockIn: null, clockOut: null };
      const parsed = JSON.parse(data);
      // Validate the parsed data has the expected structure
      if (typeof parsed !== 'object' || !('status' in parsed)) {
        throw new Error('Invalid data structure');
      }
      return parsed;
    } catch (error) {
      console.error('Error reading time data:', error);
      // Clear corrupted data
      localStorage.removeItem(key);
      return { status: 'none', clockIn: null, clockOut: null };
    }
  }

  function setTimeData(date, data) {
    try {
      const key = getStorageKey(date);
      const validData = {
        status: data.status || 'none',
        clockIn: data.clockIn || null,
        clockOut: data.clockOut || null
      };
      localStorage.setItem(key, JSON.stringify(validData));
    } catch (error) {
      console.error('Error saving time data:', error);
    }
  }

  function formatTime(date) {
    return date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  }

  function calculateDuration(clockIn, clockOut) {
    if (!clockIn || !clockOut) return '';
    const diff = new Date(clockOut) - new Date(clockIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  function openModal(modal) {
    modal.style.display = 'block';
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }

  function createClockButton(date, timeData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    // If it's a past date with no time recorded
    if (compareDate < today && timeData.status === 'none') {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'no-time-message';
      messageDiv.textContent = 'No time recorded';
      messageDiv.style.color = '#999';
      messageDiv.style.fontSize = '0.8rem';
      messageDiv.style.textAlign = 'center';
      messageDiv.style.padding = '0.5rem';
      messageDiv.style.fontStyle = 'italic';
      return messageDiv;
    }

    const button = document.createElement('a');
    
    if (timeData.status === 'in') {
      button.href = `tel:${clockOutInput.value}`;
      button.className = 'clock-button clock-out';
      button.textContent = 'Clock Out';
      button.onclick = () => {
        timeData.status = 'out';
        timeData.clockOut = new Date().toISOString();
        setTimeData(date, timeData);
        renderCalendar(currentDate);
      };
    } else if (timeData.status === 'none') {
      // Check monthly hours before allowing clock in
      const monthlyHours = calculateMonthlyHours(date.getFullYear(), date.getMonth());
      const totalMinutesWorked = (monthlyHours.hours * 60) + monthlyHours.minutes;
      const maxMinutes = MAX_MONTHLY_HOURS * 60;
      const remainingMinutes = maxMinutes - totalMinutesWorked;
      const remainingHours = Math.floor(remainingMinutes / 60);
      const remainingMins = Math.floor(remainingMinutes % 60);

      if (totalMinutesWorked > (MAX_MONTHLY_HOURS * 60 * 0.95)) { // Over 95% of monthly limit
        button.href = 'javascript:void(0)';
        button.className = 'clock-button clock-in warning-clock';
        button.textContent = 'Clock In';
        button.onclick = (e) => {
          e.preventDefault();
          showWarningModal(remainingHours, remainingMins, () => {
            // Callback after warning confirmation
            const phoneNumber = clockInInput.value;
            window.location.href = `tel:${phoneNumber}`;
            timeData.status = 'in';
            timeData.clockIn = new Date().toISOString();
            setTimeData(date, timeData);
            renderCalendar(currentDate);
          });
        };
      } else {
        button.href = `tel:${clockInInput.value}`;
        button.className = 'clock-button clock-in';
        button.textContent = 'Clock In';
        button.onclick = () => {
          timeData.status = 'in';
          timeData.clockIn = new Date().toISOString();
          setTimeData(date, timeData);
          renderCalendar(currentDate);
        };
      }
    } else {
      button.className = 'clock-button clock-complete';
      button.textContent = 'Complete';
      button.href = 'javascript:void(0)';
    }
    
    return button;
  }

  function createTimeDisplay(date, timeData) {
    const div = document.createElement('div');
    div.className = 'time-display';
    
    if (timeData.clockIn) {
      const inTime = document.createElement('div');
      inTime.className = 'time-entry';
      inTime.textContent = `In: ${formatTime(timeData.clockIn)}`;
      div.appendChild(inTime);
    }
    
    if (timeData.clockOut) {
      const outTime = document.createElement('div');
      outTime.className = 'time-entry';
      outTime.textContent = `Out: ${formatTime(timeData.clockOut)}`;
      div.appendChild(outTime);
    }
    
    if (timeData.clockIn && timeData.clockOut) {
      const duration = document.createElement('div');
      duration.className = 'duration';
      duration.textContent = `Total: ${calculateDuration(timeData.clockIn, timeData.clockOut)}`;
      div.appendChild(duration);
    }
    
    return div;
  }

  function calculateMonthlyHours(year, month) {
    let totalMinutes = 0;
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const timeData = getTimeData(date);
      
      if (timeData.clockIn && timeData.clockOut) {
        const diff = new Date(timeData.clockOut) - new Date(timeData.clockIn);
        totalMinutes += diff / (1000 * 60);
      }
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: Math.floor(totalMinutes % 60)
    };
  }

  function formatHoursAndMinutes(hours, minutes) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  function updateProgressBar(timeWorked) {
    const progressSection = document.querySelector('.progress-section');
    const progressBar = document.querySelector('.progress-bar');
    const progressStats = document.querySelector('.progress-stats');
    const hoursRemaining = document.querySelector('.hours-remaining');
    
    const totalMinutesWorked = (timeWorked.hours * 60) + timeWorked.minutes;
    const maxMinutes = MAX_MONTHLY_HOURS * 60;
    const remainingMinutes = maxMinutes - totalMinutesWorked;
    
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = Math.floor(remainingMinutes % 60);
    
    const percentage = (totalMinutesWorked / maxMinutes) * 100;
    
    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update stats with more detailed formatting
    progressStats.innerHTML = `
      <span class="worked">${formatHoursAndMinutes(timeWorked.hours, timeWorked.minutes)}</span>
      <span class="separator"> of </span>
      <span class="total">${MAX_MONTHLY_HOURS} hours</span>
    `;
    
    hoursRemaining.innerHTML = `
      <span class="label">Remaining: </span>
      <span class="time">${formatHoursAndMinutes(remainingHours, remainingMins)}</span>
    `;
    
    // Update status classes
    progressBar.classList.remove('warning', 'danger');
    hoursRemaining.classList.remove('warning', 'danger');
    
    if (percentage >= 90) {
      progressBar.classList.add('danger');
      hoursRemaining.classList.add('danger');
    } else if (percentage >= 75) {
      progressBar.classList.add('warning');
      hoursRemaining.classList.add('warning');
    }
  }

  function showWarningModal(remainingHours, remainingMins, callback) {
    const warningModal = document.createElement('div');
    warningModal.className = 'modal warning-modal';
    warningModal.style.display = 'block';
    
    warningModal.innerHTML = `
      <div class="modal-content warning-content">
        <div class="modal-header">
          <h2>Monthly Hours Warning</h2>
          <button class="close-button" data-modal="warningModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>You are approaching your monthly hours limit!</p>
            <p>Remaining time: <strong>${remainingHours} hours and ${remainingMins} minutes</strong></p>
            <p>Do you want to continue clocking in?</p>
          </div>
          <div class="warning-actions">
            <button class="warning-button continue">Continue</button>
            <button class="warning-button cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(warningModal);
    
    const closeBtn = warningModal.querySelector('.close-button');
    const continueBtn = warningModal.querySelector('.continue');
    const cancelBtn = warningModal.querySelector('.cancel');
    
    closeBtn.onclick = () => {
      document.body.removeChild(warningModal);
    };
    
    continueBtn.onclick = () => {
      document.body.removeChild(warningModal);
      if (callback) callback();
    };
    
    cancelBtn.onclick = () => {
      document.body.removeChild(warningModal);
    };
    
    warningModal.onclick = (e) => {
      if (e.target === warningModal) {
        document.body.removeChild(warningModal);
      }
    };
  }

  saveTimeEdit.addEventListener('click', () => {
    const selectedDate = new Date(editDate.value + 'T00:00:00'); // Fix timezone issue
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      alert('Please select a valid date');
      return;
    }

    const timeData = getTimeData(selectedDate);
    let updated = false;
    
    if (editClockIn.value) {
      const [hours, minutes] = editClockIn.value.split(':');
      const clockInDate = new Date(selectedDate);
      clockInDate.setHours(hours, minutes, 0);
      timeData.clockIn = clockInDate.toISOString();
      timeData.status = timeData.clockOut ? 'out' : 'in';
      updated = true;
    }

    if (editClockOut.value) {
      const [hours, minutes] = editClockOut.value.split(':');
      const clockOutDate = new Date(selectedDate);
      clockOutDate.setHours(hours, minutes, 0);
      timeData.clockOut = clockOutDate.toISOString();
      timeData.status = 'out';
      updated = true;
    }

    if (updated) {
      setTimeData(selectedDate, timeData);
      
      // Immediately update the calendar
      renderCalendar(currentDate);
      
      // Show success feedback
      const feedback = document.createElement('div');
      feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 4px;
        z-index: 1002;
        animation: fadeInOut 3s forwards;
      `;
      feedback.textContent = 'Time updated successfully!';
      document.body.appendChild(feedback);

      // Add CSS animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `;
      document.head.appendChild(style);

      // Remove feedback after animation
      setTimeout(() => {
        document.body.removeChild(feedback);
        document.head.removeChild(style);
      }, 3000);

      // Clear the inputs
      editClockIn.value = '';
      editClockOut.value = '';
      editDate.value = '';
    }

    closeModal('timeEditModal');
  });

  clearTimeEntry.addEventListener('click', () => {
    const selectedDate = new Date(editDate.value + 'T00:00:00');
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      alert('Please select a valid date');
      return;
    }

    // Show confirmation dialog
    const confirmClear = confirm('Are you sure you want to clear all time entries for this date?');
    if (!confirmClear) {
      return;
    }

    // Clear the time data for the selected date
    setTimeData(selectedDate, { status: 'none', clockIn: null, clockOut: null });

    // Clear the input fields
    editClockIn.value = '';
    editClockOut.value = '';
    editDate.value = '';

    // Update the calendar
    renderCalendar(currentDate);

    // Show success feedback
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 1rem 2rem;
      border-radius: 4px;
      z-index: 1002;
      animation: fadeInOut 3s forwards;
    `;
    feedback.textContent = 'Time entry cleared successfully!';
    document.body.appendChild(feedback);

    // Add CSS animation if not already present
    if (!document.querySelector('style[data-animation="fadeInOut"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-animation', 'fadeInOut');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove feedback after animation
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 3000);

    closeModal('timeEditModal');
  });

  // Set max date for edit date input to today
  const today = new Date();
  editDate.max = today.toISOString().split('T')[0];

  // Load saved phone numbers on page load
  function loadSavedPhoneNumbers() {
    const savedClockInNumber = localStorage.getItem('clockInNumber') || '';
    const savedClockOutNumber = localStorage.getItem('clockOutNumber') || '';
    
    clockInInput.value = savedClockInNumber;
    clockOutInput.value = savedClockOutNumber;
  }

  // Save phone numbers to localStorage
  function savePhoneNumbers() {
    localStorage.setItem('clockInNumber', clockInInput.value);
    localStorage.setItem('clockOutNumber', clockOutInput.value);
    
    // Show feedback
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 1rem 2rem;
      border-radius: 4px;
      z-index: 1002;
      animation: fadeInOut 3s forwards;
    `;
    feedback.textContent = 'Phone numbers saved successfully!';
    document.body.appendChild(feedback);

    // Add CSS animation if not already present
    if (!document.querySelector('style[data-animation="fadeInOut"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-animation', 'fadeInOut');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Remove feedback after animation
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 3000);
  }

  // Add save button to phone numbers section
  phoneNumbersContent.appendChild(savePhoneNumbersButton);

  // Event listener for save phone numbers button
  savePhoneNumbersButton.addEventListener('click', savePhoneNumbers);

  // Load saved phone numbers when page loads
  loadSavedPhoneNumbers();

  menuButton.addEventListener('click', () => {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.style.display = 'block';
    }
  });

  // Add back to calendar functionality
  const backToCalendarButton = document.getElementById('backToCalendar');
  backToCalendarButton.addEventListener('click', () => {
    closeModal('settingsModal');
  });

  document.querySelectorAll('.close-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-modal');
      if (modalId) {
        closeModal(modalId);
      } else {
        closeAllModals();
      }
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });

  function calculatePayPeriodHours(year, month) {
    const firstPayPeriodEnd = new Date(year, month, 15);
    const secondPayPeriodStart = new Date(year, month, 16);
    const lastDay = new Date(year, month + 1, 0);
    
    let firstPayPeriodMinutes = 0;
    let secondPayPeriodMinutes = 0;
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDay = new Date(year, month, day);
      const timeData = getTimeData(currentDay);
      
      if (timeData.clockIn && timeData.clockOut) {
        const diff = new Date(timeData.clockOut) - new Date(timeData.clockIn);
        const minutes = diff / (1000 * 60);
        
        if (currentDay <= firstPayPeriodEnd) {
          firstPayPeriodMinutes += minutes;
        } else {
          secondPayPeriodMinutes += minutes;
        }
      }
    }
    
    return {
      firstPayPeriod: {
        hours: Math.floor(firstPayPeriodMinutes / 60),
        minutes: Math.floor(firstPayPeriodMinutes % 60)
      },
      secondPayPeriod: {
        hours: Math.floor(secondPayPeriodMinutes / 60),
        minutes: Math.floor(secondPayPeriodMinutes % 60)
      }
    };
  }

  function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Update monthly hours
    const monthlyHours = calculateMonthlyHours(year, month);
    updateProgressBar(monthlyHours);
    
    // Update pay period hours
    const payPeriodHours = calculatePayPeriodHours(year, month);
    updatePayPeriodDisplay(payPeriodHours);
    
    currentMonthElement.textContent = new Date(year, month, 1)
      .toLocaleDateString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    calendarDays.innerHTML = '';
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day other-month';
      dayDiv.innerHTML = `<span class="day-number">${prevMonthLastDay - i}</span>`;
      calendarDays.appendChild(dayDiv);
    }

    // Current month
    for (let day = 1; day <= totalDays; day++) {
      const currentDay = new Date(year, month, day);
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
      
      if (currentDay <= new Date()) {
        const timeData = getTimeData(currentDay);
        const clockButton = createClockButton(currentDay, timeData);
        const timeDisplay = createTimeDisplay(currentDay, timeData);
        dayDiv.appendChild(timeDisplay);
        dayDiv.appendChild(clockButton);
      }
      
      calendarDays.appendChild(dayDiv);
    }

    // Next month padding
    const endPadding = 42 - (startPadding + totalDays);
    for (let i = 1; i <= endPadding; i++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day other-month';
      dayDiv.innerHTML = `<span class="day-number">${i}</span>`;
      calendarDays.appendChild(dayDiv);
    }
  }

  function updatePayPeriodDisplay(payPeriodHours) {
    const firstPayPeriodElement = document.getElementById('firstPayPeriodHours');
    const secondPayPeriodElement = document.getElementById('secondPayPeriodHours');
    
    firstPayPeriodElement.textContent = `${payPeriodHours.firstPayPeriod.hours}h ${payPeriodHours.firstPayPeriod.minutes}m`;
    secondPayPeriodElement.textContent = `${payPeriodHours.secondPayPeriod.hours}h ${payPeriodHours.secondPayPeriod.minutes}m`;
  }

  prevMonthButton.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    renderCalendar(currentDate);
  });

  nextMonthButton.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    renderCalendar(currentDate);
  });

  // Initial render
  renderCalendar(currentDate);

  // Update phone numbers when input changes and validate input
  [clockInInput, clockOutInput].forEach(input => {
    input.addEventListener('input', () => {
      if (input.value === '') return;
      const num = parseInt(input.value);
      if (isNaN(num)) {
        input.value = '';
      }
      renderCalendar(currentDate);
    });
  });
});