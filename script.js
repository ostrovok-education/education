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
const GOOGLE_FORM_PREFILL_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSewtfM2uvrWYd-rxx-J2nKlHTttN5DC9uMjbv17KMYbEVWm-Q/viewform?usp=pp_url&entry.484089332=%D0%BA%D0%B8%D1%80%D0%B0&entry.870336451=%D0%BA%D0%B8%D1%80%D0%B0&entry.440836252=%D0%BD%D0%BE%D0%BC%D0%B5%D1%80&entry.1007580749=%D0%B2%D0%BE%D0%B7%D1%80%D0%B0%D1%81%D1%82&entry.823266679=%D0%BA%D0%BB%D0%B0%D1%81%D1%81&entry.390683232=%D0%BF%D1%80&entry.1766977890=%D0%B0&entry.623789516=%D0%B0';
const GOOGLE_FORM_PAYLOAD_ORDER = [
  'parentName',
  'childName',
  'phone',
  'age',
  'studentClass',
  'programs',
  'lessonFormat',
  'preferredDays',
  'lessonType',
];

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

const getGoogleFormConfig = () => {
  if (!GOOGLE_FORM_PREFILL_URL || GOOGLE_FORM_PREFILL_URL.includes('PASTE_GOOGLE_FORM_PREFILL_URL_HERE')) {
    return null;
  }

  try {
    const prefillUrl = new URL(GOOGLE_FORM_PREFILL_URL);
    const entryIds = [];

    prefillUrl.searchParams.forEach((_, key) => {
      if (key.startsWith('entry.') && !entryIds.includes(key)) {
        entryIds.push(key);
      }
    });

    if (entryIds.length === 0) {
      return null;
    }

    const actionPath = prefillUrl.pathname.replace('/viewform', '/formResponse');
    if (!actionPath.includes('/formResponse')) {
      return null;
    }

    const entryMap = {};
    const mappedFieldNames = GOOGLE_FORM_PAYLOAD_ORDER.slice(0, entryIds.length);
    mappedFieldNames.forEach((fieldName, index) => {
      entryMap[fieldName] = entryIds[index];
    });

    return {
      actionUrl: `${prefillUrl.origin}${actionPath}`,
      entryMap,
    };
  } catch {
    return null;
  }
};

const submitTrialFormToGoogleForm = async (payload) => {
  const googleFormConfig = getGoogleFormConfig();
  if (!googleFormConfig) {
    return;
  }

  const encodedPayload = new URLSearchParams();
  Object.entries(googleFormConfig.entryMap).forEach(([fieldName, entryId]) => {
    encodedPayload.append(entryId, (payload[fieldName] || '').toString());
  });

  try {
    await fetch(googleFormConfig.actionUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: encodedPayload.toString(),
    });
  } catch {}
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
    age: (trialForm.querySelector('[name="age"]')?.value || '').toString(),
    studentClass: (trialForm.querySelector('[name="studentClass"]')?.value || '').toString(),
    lessonFormat: (trialForm.querySelector('[name="lessonFormat"]')?.value || '').toString(),
    lessonType: (trialForm.querySelector('[name="lessonType"]')?.value || '').toString(),
    preferredDays: (trialForm.querySelector('[name="preferredDays"]')?.value || '').toString(),
    program: selectedPrograms,
  };

  try {
    localStorage.setItem(TRIAL_FORM_STORAGE_KEY, JSON.stringify(trialFormState));
  } catch {}
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
    setFieldValue('age');
    setFieldValue('studentClass');
    setFieldValue('lessonFormat');
    setFieldValue('lessonType');
    setFieldValue('preferredDays');

    const programCheckboxes = trialForm.querySelectorAll('input[name="program"]');

    if (programCheckboxes.length > 0 && Array.isArray(parsedState.program)) {
      programCheckboxes.forEach((checkbox) => {
        checkbox.checked = parsedState.program.includes(checkbox.value);
      });
    }

    updateProgramSummary();
  } catch {
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
    const age = (formData.get('age') || '').toString().trim();
    const studentClass = (formData.get('studentClass') || '').toString().trim();
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
    const lessonType = (formData.get('lessonType') || '').toString().trim();
    const preferredDays = (formData.get('preferredDays') || '').toString().trim();

    const messageLines = [
      'Здравствуйте! Хочу записаться на пробный урок в центре «Островок».',
      '',
      `Имя родителя: ${parentName}`,
      `Имя ученика: ${childName}`,
      `Телефон: ${phone}`,
      `Возраст: ${age}`,
      `Класс: ${studentClass}`,
      `Предметы: ${programs.join(', ')}`,
      `Формат проведения: ${lessonFormat}`,
      `Формат занятий: ${lessonType}`,
      `Удобные дни/время: ${preferredDays}`,
    ];

    const messageText = messageLines.join('\n');
    const telegramUsername = 'nogavnka';
    const telegramUrl = `https://t.me/${telegramUsername}?text=${encodeURIComponent(messageText)}`;
    const googleFormPayload = {
      parentName,
      childName,
      phone,
      age,
      studentClass,
      programs: programs.join(', '),
      lessonFormat,
      lessonType,
      preferredDays,
    };

    saveTrialFormState();
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    void submitTrialFormToGoogleForm(googleFormPayload);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(messageText)
        .catch(() => {});
    }

    formStatus.textContent = '';
    formStatus.style.color = '';
  });
}
