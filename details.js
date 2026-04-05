const API = 'http://localhost:3000/api/grades';

const COURSE_IDS = {
    soen287: 1,
    comp249: 2,
    engr233: 3,
    soen228: 4
};

function getCourseId() {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('soen287')) return COURSE_IDS.soen287;
    if (page.includes('comp249')) return COURSE_IDS.comp249;
    if (page.includes('engr233')) return COURSE_IDS.engr233;
    if (page.includes('soen228')) return COURSE_IDS.soen228;
    return null;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || payload.message || 'Request failed');
    }

    return payload;
}

function calculatePercentage(earnedMarks, totalMarks) {
    if (earnedMarks === null || earnedMarks === undefined || earnedMarks === '') return null;
    if (totalMarks === null || totalMarks === undefined || totalMarks === '' || Number(totalMarks) === 0) {
        return null;
    }

    return ((Number(earnedMarks) / Number(totalMarks)) * 100).toFixed(2);
}

function createRow(grade) {
    const gradeId = grade.grade_id ?? grade.id;
    const dueDate = grade.due_date ? String(grade.due_date).split('T')[0] : '';
    const percentage = calculatePercentage(grade.earned_marks, grade.total_marks);

    return `
    <tr id="row-${gradeId}">
        <td><input type="text" class="assessments-input js-name"
            value="${escapeHtml(grade.assessment_name)}" disabled></td>
        <td><input type="text" class="assessments-input js-category"
            value="${escapeHtml(grade.category || '')}" disabled></td>
        <td><input type="date" class="assessments-input js-due"
            value="${dueDate}" disabled></td>
        <td><input type="number" class="assessments-input js-weight"
            min="0" step="0.01" value="${grade.weight ?? ''}" disabled></td>
        <td><input type="number" class="assessments-input js-earned"
            min="0" step="0.01" value="${grade.earned_marks ?? ''}" disabled></td>
        <td><input type="number" class="assessments-input js-total"
            min="0" step="0.01" value="${grade.total_marks ?? ''}" disabled></td>
        <td>
            <select class="js-status" disabled>
                <option value="pending" ${grade.status === 'pending' ? 'selected' : ''}>pending</option>
                <option value="completed" ${grade.status === 'completed' ? 'selected' : ''}>completed</option>
            </select>
        </td>
        <td class="js-result">${percentage ? `${percentage}%` : '-'}</td>
        <td class="actions">
            <button onclick="editRow(${gradeId})">Edit</button>
            <button onclick="deleteRow(${gradeId})">Delete</button>
        </td>
    </tr>`;
}

async function loadAssessments() {
    const courseId = getCourseId();
    if (!courseId) return;

    try {
        const grades = await fetchJson(`${API}/${courseId}/details`);
        const tbody = document.getElementById('gradesBody');
        tbody.innerHTML = '';

        grades.forEach((grade) => {
            tbody.innerHTML += createRow(grade);
        });

        if (!grades.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; opacity:0.7;">
                        No assessments yet. Add your first one above.
                    </td>
                </tr>
            `;
        }

        await loadAverage(courseId);
    } catch (error) {
        const tbody = document.getElementById('gradesBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:#a22;">
                    Could not load assessments: ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}

async function loadAverage(courseId) {
    const data = await fetchJson(`${API}/${courseId}/average`);
    const avgEl = document.getElementById('courseAverage');
    if (!avgEl) return;

    avgEl.textContent = data.average
        ? `Current Weighted Average: ${data.average}%`
        : 'Current Weighted Average: N/A';
}

function editRow(id) {
    const row = document.getElementById(`row-${id}`);
    const controls = row.querySelectorAll('input, select');
    controls.forEach((control) => {
        control.disabled = false;
    });

    row.querySelector('.actions').innerHTML = `
        <button onclick="saveRow(${id})">Save</button>
        <button onclick="deleteRow(${id})">Delete</button>
    `;
}

function buildPayloadFromRow(row, courseId) {
    const name = row.querySelector('.js-name').value.trim();
    const category = row.querySelector('.js-category').value.trim();
    const dueDate = row.querySelector('.js-due').value || null;
    const weightValue = row.querySelector('.js-weight').value;
    const earnedValue = row.querySelector('.js-earned').value;
    const totalValue = row.querySelector('.js-total').value;
    const status = row.querySelector('.js-status').value;

    const payload = {
        course_id: courseId,
        assessment_name: name,
        category,
        due_date: dueDate,
        weight: weightValue === '' ? null : Number(weightValue),
        earned_marks: earnedValue === '' ? null : Number(earnedValue),
        total_marks: totalValue === '' ? null : Number(totalValue),
        status
    };

    if (!payload.assessment_name) {
        throw new Error('Assessment name is required.');
    }

    if ((payload.earned_marks === null) !== (payload.total_marks === null)) {
        throw new Error('Earned and total marks must both be filled or both be empty.');
    }

    if (payload.total_marks !== null && payload.total_marks === 0) {
        throw new Error('Total marks must be greater than 0.');
    }

    if (payload.weight !== null && payload.weight < 0) {
        throw new Error('Weight cannot be negative.');
    }

    return payload;
}

async function saveRow(id) {
    const row = document.getElementById(`row-${id}`);
    const courseId = getCourseId();

    try {
        const payload = buildPayloadFromRow(row, courseId);

        await fetchJson(`${API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        await loadAssessments();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteRow(id) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
        await fetchJson(`${API}/${id}`, { method: 'DELETE' });
        await loadAssessments();
    } catch (error) {
        alert(error.message);
    }
}

async function addAssessment() {
    const courseId = getCourseId();

    try {
        const payload = {
            course_id: courseId,
            assessment_name: document.getElementById('newName').value.trim(),
            category: document.getElementById('newCategory').value.trim(),
            due_date: document.getElementById('newDueDate').value || null,
            weight: document.getElementById('newWeight').value === ''
                ? null
                : Number(document.getElementById('newWeight').value),
            earned_marks: document.getElementById('newEarned').value === ''
                ? null
                : Number(document.getElementById('newEarned').value),
            total_marks: document.getElementById('newTotal').value === ''
                ? null
                : Number(document.getElementById('newTotal').value),
            status: document.getElementById('newStatus').value
        };

        if (!payload.assessment_name) {
            throw new Error('Please enter an assessment name.');
        }

        if ((payload.earned_marks === null) !== (payload.total_marks === null)) {
            throw new Error('Earned and total marks must both be filled or both be empty.');
        }

        if (payload.total_marks !== null && payload.total_marks === 0) {
            throw new Error('Total marks must be greater than 0.');
        }

        await fetchJson(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        closeModal();
        await loadAssessments();
    } catch (error) {
        alert(error.message);
    }
}

function openModal() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
    ['newName', 'newCategory', 'newDueDate', 'newWeight', 'newEarned', 'newTotal', 'newStatus']
        .forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            if (element.tagName === 'SELECT') {
                element.selectedIndex = 0;
            } else {
                element.value = '';
            }
        });
}

window.onload = loadAssessments;

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem(
        'theme',
        document.body.classList.contains('light-mode') ? 'light' : 'dark'
    );
}

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
});
