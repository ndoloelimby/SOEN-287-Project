const API_BASE = 'http://localhost:3000/api/student';

const detailPageByCourseCode = {
  ENGR233: 'detailsENGR233.html',
  SOEN287: 'detailsSOEN287.html',
  SOEN228: 'detailsSOEN228.html',
  COMP249: 'detailscomp249.html'
};

let courses = [];
let archivedIds = new Set();
let selectedAssignment = null;

const container = document.getElementById('courseContainer');
const archivedContainer = document.getElementById('archivedContainer');
const enrollInput = document.getElementById('enrollCourseCode');
const enrollButton = document.getElementById('enrollButton');
const enrollmentMessage = document.getElementById('enrollmentMessage');

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
  } catch (error) {
    courses = [];
    renderAll();
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

const calendarContainer = document.getElementById('calendarContainer');

const assignmentsData = [
  { title: 'Assignment 1 - COMP249', dayOffset: 2 },
  { title: 'Design Diagram', dayOffset: 4 }
];

function renderCalendar(view) {
  calendarContainer.innerHTML = '';
  const today = new Date();

  if (view === 'today') {
    const div = createDay(today);
    calendarContainer.appendChild(div);
  }

  if (view === 'week') {
    const week = document.createElement('div');
    week.className = 'calendar week';

    for (let i = 0; i < 7; i += 1) {
      const date = new Date();
      date.setDate(today.getDate() - today.getDay() + i);
      week.appendChild(createDay(date));
    }

    calendarContainer.appendChild(week);
  }

  if (view === 'month') {
    const month = document.createElement('div');
    month.className = 'calendar month';

    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    for (let i = 1; i <= days; i += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      month.appendChild(createDay(date));
    }

    calendarContainer.appendChild(month);
  }
}

function createDay(date) {
  const day = document.createElement('div');
  day.className = 'day';

  if (date.toDateString() === new Date().toDateString()) {
    day.classList.add('today');
  }

  day.innerHTML = `<h4>${date.toDateString()}</h4>`;

  assignmentsData.forEach((assignmentItem) => {
    const assignmentDate = new Date();
    assignmentDate.setDate(assignmentDate.getDate() - assignmentDate.getDay() + assignmentItem.dayOffset);

    if (date.toDateString() === assignmentDate.toDateString()) {
      const assignment = document.createElement('div');
      assignment.className = 'assignment';
      assignment.textContent = assignmentItem.title;
      day.appendChild(assignment);
    }
  });

  return day;
}

document.getElementById('todayTitle').textContent = 'Today';
renderCalendar('today');
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
