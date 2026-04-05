const API_BASE = 'http://localhost:3000/api/student';
const GRADES_API = 'http://localhost:3000/api/grades';

const detailPageByCourseCode = {
  ENGR233: 'detailsENGR233.html',
  SOEN287: 'detailsSOEN287.html',
  SOEN228: 'detailsSOEN228.html',
  COMP249: 'detailscomp249.html'
};

let courses = [];
let archivedIds = new Set();
let selectedAssignment = null;
let assignmentsData = [];

const container = document.getElementById('courseContainer');
const archivedContainer = document.getElementById('archivedContainer');
const enrollInput = document.getElementById('enrollCourseCode');
const enrollButton = document.getElementById('enrollButton');
const enrollmentMessage = document.getElementById('enrollmentMessage');
const calendarContainer = document.getElementById('calendarContainer');
const agendaTaskInput = document.getElementById('agendaTaskInput');
const agendaColorInput = document.getElementById('agendaColorInput');
const agendaAddButton = document.getElementById('agendaAddButton');
const agendaMessage = document.getElementById('agendaMessage');
const agendaList = document.getElementById('agendaList');
const AGENDA_STORAGE_KEY = 'mycourses.agendaTasks';

function loadAgendaTasks() {
  try {
    const storedValue = localStorage.getItem(AGENDA_STORAGE_KEY);
    const parsed = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAgendaTasks(tasks) {
  localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(tasks));
}

function showAgendaMessage(message = '', type = '') {
  if (!agendaMessage) return;
  agendaMessage.textContent = message;
  agendaMessage.className = `agenda-message${type ? ` ${type}` : ''}`;
}

function removeAgendaTask(taskId) {
  const remainingTasks = loadAgendaTasks().filter((task) => task.id !== taskId);
  saveAgendaTasks(remainingTasks);
  renderAgenda();
}

function renderAgenda() {
  if (!agendaList) return;
  const tasks = loadAgendaTasks();
  agendaList.innerHTML = '';

  if (tasks.length === 0) {
    const emptyState = document.createElement('li');
    emptyState.className = 'agenda-empty';
    emptyState.textContent = 'No agenda items yet.';
    agendaList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = 'agenda-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'agenda-item-checkbox';
    checkbox.setAttribute('aria-label', `Complete ${task.text}`);
    checkbox.addEventListener('change', () => {
      checkbox.disabled = true;
      item.classList.add('agenda-item-completing');
      setTimeout(() => {
        removeAgendaTask(task.id);
      }, 220);
    });

    const swatch = document.createElement('span');
    swatch.className = 'agenda-item-swatch';
    swatch.style.backgroundColor = task.color;

    const text = document.createElement('span');
    text.className = 'agenda-item-text';
    text.textContent = task.text;

    item.appendChild(swatch);
    item.appendChild(text);
    item.appendChild(checkbox);
    agendaList.appendChild(item);
  });
}

function addAgendaTask() {
  if (!agendaTaskInput || !agendaColorInput) return;

  const text = agendaTaskInput.value.trim();
  if (!text) {
    showAgendaMessage('Please enter a task first.', 'error');
    return;
  }

  const tasks = loadAgendaTasks();
  tasks.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    color: agendaColorInput.value || '#9a89d6'
  });

  saveAgendaTasks(tasks);
  agendaTaskInput.value = '';
  showAgendaMessage('Task added.');
  renderAgenda();
  agendaTaskInput.focus();
}
function normalizeCourseCode(value) {
  return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function getCourseTitle(course) {
  return course.course_code || course.course_name || 'Untitled Course';
}

function getCourseSubtitle(course) {
  if (course.course_code && course.course_name) {
    return course.course_name;
  }

  return course.term || '';
}

function getCourseHref(course) {
  const normalized = normalizeCourseCode(course.course_code);
  return detailPageByCourseCode[normalized] || '#';
}

function showEnrollmentMessage(message, type = '') {
  enrollmentMessage.textContent = message;
  enrollmentMessage.className = `enrollment-message${type ? ` ${type}` : ''}`;
}

function getVisibleCourses() {
  return courses.filter((course) => !archivedIds.has(course.enrollment_id));
}

function getArchivedCourses() {
  return courses.filter((course) => archivedIds.has(course.enrollment_id));
}

function parseDueDate(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameCalendarDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatAssignmentLabel(item) {
  const courseCode = item.courseCode ? `${item.courseCode}: ` : '';
  return `${courseCode}${item.title}`;
}

async function loadCalendarAssignments() {
  const detailResponses = await Promise.all(
    courses.map(async (course) => {
      try {
        const response = await fetch(`${GRADES_API}/${course.course_id}/details`);
        const payload = await response.json().catch(() => ([]));
        if (!response.ok) {
          throw new Error(payload.error || 'Could not load assessments');
        }

        return payload.map((assessment) => ({
          id: assessment.grade_id ?? assessment.id,
          title: assessment.assessment_name || 'Untitled assessment',
          dueDate: parseDueDate(assessment.due_date),
          courseCode: course.course_code || '',
          courseName: course.course_name || '',
          status: assessment.status || 'pending'
        }));
      } catch {
        return [];
      }
    })
  );

  assignmentsData = detailResponses
    .flat()
    .filter((assessment) => assessment.dueDate)
    .sort((a, b) => a.dueDate - b.dueDate);
}

function createCard(course, isArchived = false) {
  const card = document.createElement('div');
  const courseHref = getCourseHref(course);
  const subtitle = getCourseSubtitle(course);
  const linkMarkup = courseHref === '#'
    ? `<div class="card-header"><span>${getCourseTitle(course)}</span></div>`
    : `<a href="${courseHref}" class="card-header"><span>${getCourseTitle(course)}</span></a>`;

  card.className = 'card';
  card.innerHTML = `
    ${linkMarkup}
    ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}
    <div class="card-header">
      <div class="card-buttons">
        ${isArchived
          ? '<button class="unarchive">Unhide</button>'
          : '<button class="remove">Remove</button><button class="archive">Hide</button>'}
      </div>
    </div>
  `;

  if (isArchived) {
    card.querySelector('.unarchive').onclick = () => {
      archivedIds.delete(course.enrollment_id);
      renderAll();
    };
    return card;
  }

  card.querySelector('.archive').onclick = () => {
    archivedIds.add(course.enrollment_id);
    renderAll();
  };

  card.querySelector('.remove').onclick = async () => {
    try {
      const response = await fetch(`${API_BASE}/enroll/${course.enrollment_id}`, {
        method: 'DELETE'
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not remove enrollment');
      }

      archivedIds.delete(course.enrollment_id);
      showEnrollmentMessage('Course removed from My Courses.', 'success');
      await loadEnrollments();
    } catch (error) {
      showEnrollmentMessage(error.message, 'error');
    }
  };

  return card;
}

function renderCourseNameList(items) {
  container.innerHTML = '';

  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';
  ul.style.display = 'flex';
  ul.style.flexDirection = 'column';
  ul.style.gap = '10px';

  items.forEach((course) => {
    const li = document.createElement('li');
    li.style.background = 'rgba(255,255,255,0.55)';
    li.style.padding = '12px 16px';
    li.style.borderRadius = '12px';
    li.style.border = '1px solid rgba(150,120,220,0.3)';

    const link = document.createElement(getCourseHref(course) === '#' ? 'span' : 'a');
    if (link.tagName.toLowerCase() === 'a') {
      link.href = getCourseHref(course);
    }
    link.textContent = getCourseTitle(course);
    link.style.textDecoration = 'none';
    link.style.color = '#2d1b6e';
    link.style.fontWeight = 'bold';

    li.appendChild(link);

    if (course.course_name) {
      const name = document.createElement('div');
      name.textContent = course.course_name;
      name.style.marginTop = '4px';
      name.style.fontSize = '13px';
      name.style.color = 'rgba(45, 27, 110, 0.75)';
      li.appendChild(name);
    }

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

function renderAll() {
  const selectedView = document.getElementById('sort').value;
  const searchValue = document.getElementById('search').value.toLowerCase();
  const visibleCourses = getVisibleCourses().filter((course) => {
    const haystack = `${course.course_code || ''} ${course.course_name || ''}`.toLowerCase();
    return haystack.includes(searchValue);
  });

  container.innerHTML = '';
  archivedContainer.innerHTML = '';

  if (selectedView === 'name') {
    renderCourseNameList(visibleCourses);
  } else {
    visibleCourses.forEach((course) => container.appendChild(createCard(course, false)));
  }

  getArchivedCourses().forEach((course) => archivedContainer.appendChild(createCard(course, true)));
}

async function loadEnrollments() {
  try {
    const response = await fetch(`${API_BASE}/enrollments`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Could not load enrollments');
    }

    courses = payload;
    renderAll();
    await loadCalendarAssignments();
    renderCalendar('today');
  } catch (error) {
    courses = [];
    assignmentsData = [];
    renderAll();
    renderCalendar('today');
    showEnrollmentMessage(error.message, 'error');
  }
}

async function enrollCourse() {
  const courseCode = enrollInput.value.trim();

  try {
    const response = await fetch(`${API_BASE}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_code: courseCode })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Could not enroll in course');
    }

    enrollInput.value = '';
    showEnrollmentMessage(`Enrolled in ${payload.course?.course_code || courseCode}.`, 'success');
    await loadEnrollments();
  } catch (error) {
    showEnrollmentMessage(error.message, 'error');
  }
}

document.getElementById('search').addEventListener('input', renderAll);
document.getElementById('sort').addEventListener('change', renderAll);
document.getElementById('toggleArchived').onclick = () => {
  archivedContainer.classList.toggle('hidden');
};

enrollButton.addEventListener('click', enrollCourse);
enrollInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    enrollCourse();
  }
});

function formatLongDate(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const dayNumber = date.getDate();
  const year = date.getFullYear();

  const suffix = (value) => {
    if (value >= 11 && value <= 13) return 'th';
    const lastDigit = value % 10;
    if (lastDigit === 1) return 'st';
    if (lastDigit === 2) return 'nd';
    if (lastDigit === 3) return 'rd';
    return 'th';
  };

  return `${dayName}, ${monthName} ${dayNumber}${suffix(dayNumber)}, ${year}`;
}

function renderCalendar(view) {
  calendarContainer.innerHTML = '';
  const now = new Date();

  if (view === 'today') {
    const todayTitle = document.getElementById('todayTitle');
    if (todayTitle) {
      todayTitle.textContent = '';
    }

    const div = createDay(now, {
      showHeader: true,
      headerText: formatLongDate(now),
      emptyMessage: 'nothing due today',
      variant: 'today-card'
    });
    calendarContainer.appendChild(div);
  }

  if (view === 'week') {
    const week = document.createElement('div');
    week.className = 'calendar week';

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - now.getDay() + i);
      week.appendChild(createDay(date));
    }

    calendarContainer.appendChild(week);
  }

  if (view === 'month') {
    const month = document.createElement('div');
    month.className = 'calendar month';

    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 1; i <= days; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), i);
      month.appendChild(createDay(date));
    }

    calendarContainer.appendChild(month);
  }
}

function createDay(date, options = {}) {
  const day = document.createElement('div');
  day.className = 'day';
  const {
    showHeader = true,
    emptyMessage = '',
    headerText = date.toDateString(),
    variant = ''
  } = options;

  if (variant) {
    day.classList.add(variant);
  }

  if (sameCalendarDay(date, new Date())) {
    day.classList.add('today');
  }

  if (showHeader) {
    const header = document.createElement('div');
    header.className = 'day-header';
    const title = document.createElement('h4');
    title.textContent = headerText;
    header.appendChild(title);
    day.appendChild(header);
  }

  const dayAssignments = assignmentsData.filter((assignmentItem) =>
    sameCalendarDay(date, assignmentItem.dueDate)
  );

  if (dayAssignments.length > 0) {
    dayAssignments.forEach((assignmentItem) => {
      const assignment = document.createElement('div');
      assignment.className = 'assignment';
      assignment.textContent = formatAssignmentLabel(assignmentItem);
      assignment.dataset.assignmentId = assignmentItem.id;
      assignment.dataset.courseCode = assignmentItem.courseCode;
      day.appendChild(assignment);
    });
  } else if (emptyMessage) {
    const message = document.createElement('p');
    message.className = 'day-empty';
    message.textContent = emptyMessage;
    day.appendChild(message);
  }

  return day;
}

renderCalendar('today');
renderAgenda();

if (agendaAddButton) {
  agendaAddButton.addEventListener('click', addAgendaTask);
}

if (agendaTaskInput) {
  agendaTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addAgendaTask();
    }
  });
}

loadEnrollments();

const calendarView = document.getElementById('calendarView');
if (calendarView) {
  calendarView.onchange = (event) => {
    renderCalendar(event.target.value);
  };
}

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('assignment')) {
    selectedAssignment = event.target;
    modal.style.display = 'flex';
    modalTitle.textContent = event.target.textContent;
  }
});

function closeModal() {
  modal.style.display = 'none';
}

function markDone() {
  if (selectedAssignment) {
    selectedAssignment.classList.add('done');
  }
  closeModal();
}

window.closeModal = closeModal;
window.markDone = markDone;








