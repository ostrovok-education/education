const revealItems = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16, rootMargin: '0px 0px -40px 0px' }
);

revealItems.forEach((item) => revealObserver.observe(item));

const trialForm = document.querySelector('#trial-form');
const formStatus = document.querySelector('#form-status');
const year = document.querySelector('#current-year');
const programSummaryText = document.querySelector('#program-summary-text');
const TRIAL_FORM_STORAGE_KEY = 'ostrovok-trial-form-v1';

if (year) {
  year.textContent = new Date().getFullYear();
}

const getSelectedPrograms = () =>
  Array.from(trialForm?.querySelectorAll('input[name="program"]:checked') || []).map((checkbox) => checkbox.value);

const updateProgramSummary = (selectedPrograms = getSelectedPrograms()) => {
  if (!programSummaryText) {
    return;
  }

  if (selectedPrograms.length === 0) {
    programSummaryText.textContent = 'Выберите предметы';
    return;
  }

  if (selectedPrograms.length <= 2) {
    programSummaryText.textContent = selectedPrograms.join(', ');
    return;
  }

  programSummaryText.textContent = `Выбрано предметов: ${selectedPrograms.length}`;
};

const saveTrialFormState = () => {
  if (!trialForm) {
    return;
  }

  const selectedPrograms = getSelectedPrograms();
  updateProgramSummary(selectedPrograms);

  const trialFormState = {
    parentName: (trialForm.querySelector('[name="parentName"]')?.value || '').toString(),
    childName: (trialForm.querySelector('[name="childName"]')?.value || '').toString(),
    phone: (trialForm.querySelector('[name="phone"]')?.value || '').toString(),
    level: (trialForm.querySelector('[name="level"]')?.value || '').toString(),
    lessonFormat: (trialForm.querySelector('[name="lessonFormat"]')?.value || '').toString(),
    preferredDays: (trialForm.querySelector('[name="preferredDays"]')?.value || '').toString(),
    program: selectedPrograms,
  };

  try {
    localStorage.setItem(TRIAL_FORM_STORAGE_KEY, JSON.stringify(trialFormState));
  } catch {
    // Игнорируем ошибку доступа к localStorage, чтобы форма продолжала работать.
  }
};

const restoreTrialFormState = () => {
  if (!trialForm) {
    return;
  }

  try {
    const storedState = localStorage.getItem(TRIAL_FORM_STORAGE_KEY);
    if (!storedState) {
      return;
    }

    const parsedState = JSON.parse(storedState);

    const setFieldValue = (fieldName) => {
      const field = trialForm.querySelector(`[name="${fieldName}"]`);
      const savedValue = parsedState[fieldName];

      if (!field || typeof savedValue !== 'string') {
        return;
      }

      field.value = savedValue;
    };

    setFieldValue('parentName');
    setFieldValue('childName');
    setFieldValue('phone');
    setFieldValue('level');
    setFieldValue('lessonFormat');
    setFieldValue('preferredDays');

    const programCheckboxes = trialForm.querySelectorAll('input[name="program"]');

    if (programCheckboxes.length > 0 && Array.isArray(parsedState.program)) {
      programCheckboxes.forEach((checkbox) => {
        checkbox.checked = parsedState.program.includes(checkbox.value);
      });
    }

    updateProgramSummary();
  } catch {
    // Игнорируем поврежденные данные localStorage.
    updateProgramSummary();
  }
};

if (trialForm && formStatus) {
  restoreTrialFormState();
  updateProgramSummary();
  trialForm.addEventListener('input', saveTrialFormState);
  trialForm.addEventListener('change', saveTrialFormState);

  trialForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!trialForm.checkValidity()) {
      formStatus.textContent = 'Проверьте, пожалуйста, заполнение обязательных полей.';
      formStatus.style.color = '#8a1f44';
      trialForm.reportValidity();
      return;
    }

    const formData = new FormData(trialForm);

    const parentName = (formData.get('parentName') || '').toString().trim();
    const childName = (formData.get('childName') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim();
    const level = (formData.get('level') || '').toString().trim();
    const programs = formData
      .getAll('program')
      .map((item) => item.toString().trim())
      .filter((item) => item.length > 0);

    if (programs.length === 0) {
      formStatus.textContent = 'Выберите хотя бы один предмет.';
      formStatus.style.color = '#8a1f44';
      return;
    }

    const lessonFormat = (formData.get('lessonFormat') || '').toString().trim();
    const preferredDays = (formData.get('preferredDays') || '').toString().trim();

    const messageLines = [
      'Здравствуйте! Хочу записаться на пробный урок в центре «Островок».',
      '',
      `Имя родителя: ${parentName}`,
      `Имя ученика: ${childName}`,
      `Телефон: ${phone}`,
      `Возраст/класс: ${level}`,
      `Предметы: ${programs.join(', ')}`,
      `Формат занятий: ${lessonFormat}`,
      `Удобные дни/время: ${preferredDays}`,
    ];

    const messageText = messageLines.join('\n');
    const telegramUsername = 'nogavnka';
    const telegramUrl = `https://t.me/${telegramUsername}?text=${encodeURIComponent(messageText)}`;

    saveTrialFormState();
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(messageText)
        .then(() => {
          formStatus.textContent = 'Рады видеть вас в школе «Островок»! Telegram уже открыт, заявка готова к отправке.';
          formStatus.style.color = '#2f2552';
        })
        .catch(() => {
          formStatus.textContent = 'Рады видеть вас в школе «Островок»! Telegram открыт, текст заявки можно вставить из буфера.';
          formStatus.style.color = '#2f2552';
        });
      return;
    }

    formStatus.textContent = 'Рады видеть вас в школе «Островок»! Telegram открыт, заявка подготовлена.';
    formStatus.style.color = '#2f2552';
  });
}
