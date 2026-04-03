const API = 'http://localhost:3000/api/grades';

// Each course has an ID - we'll use these for now
// until auth is ready
const COURSE_IDS = {
    'soen287': 1,
    'comp249': 2,
    'engr233': 3,
    'soen228': 4
};

// Get course name from the page URL
function getCourseId() {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('soen287')) return COURSE_IDS.soen287;
    if (page.includes('comp249')) return COURSE_IDS.comp249;
    if (page.includes('engr233')) return COURSE_IDS.engr233;
    if (page.includes('soen228')) return COURSE_IDS.soen228;
}

// Load assessments from database when page opens
async function loadAssessments() {
    const courseId = getCourseId();
    const res = await fetch(`${API}/${courseId}`);
    const grades = await res.json();

    const tbody = document.getElementById('gradesBody');
    tbody.innerHTML = '';

    grades.forEach(g => {
        tbody.innerHTML += createRow(g);
    });

    loadAverage(courseId);
}

// Get average from server
async function loadAverage(courseId) {
    const res = await fetch(`${API}/${courseId}/average`);
    const data = await res.json();
    const avgEl = document.getElementById('courseAverage');
    if (avgEl) {
        avgEl.textContent = data.average 
            ? `Current Average: ${data.average}%` 
            : 'Current Average: N/A';
    }
}

// Create a table row
function createRow(g) {
    return `
    <tr id="row-${g.id}">
        <td><input type="text" class="assessments-input" 
            value="${g.assessment_name}" disabled></td>
        <td>
            <select disabled>
                <option ${g.category === 'Lab' ? 'selected' : ''}>Lab</option>
                <option ${g.category === 'Exam' ? 'selected' : ''}>Exam</option>
                <option ${g.category === 'Assignment' ? 'selected' : ''}>Assignment</option>
                <option ${g.category === 'Quiz' ? 'selected' : ''}>Quiz</option>
                <option ${g.category === 'Project' ? 'selected' : ''}>Project</option>
            </select>
        </td>
        <td><input type="date" class="assessments-input" 
            value="${g.due_date ? g.due_date.split('T')[0] : ''}" disabled></td>
        <td><input type="number" class="assessments-input" 
            value="${g.earned_marks || ''}" disabled></td>
        <td><input type="number" class="assessments-input" 
            value="${g.total_marks}" disabled></td>
        <td>
            <select disabled>
                <option ${g.status === 'pending' ? 'selected' : ''}>pending</option>
                <option ${g.status === 'completed' ? 'selected' : ''}>completed</option>
            </select>
        </td>
        <td class="actions">
            <button onclick="editRow(${g.id})">Edit</button>
            <button onclick="deleteRow(${g.id})">Delete</button>
        </td>
    </tr>`;
}

// Enable editing a row
function editRow(id) {
    const row = document.getElementById(`row-${id}`);
    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(i => i.disabled = false);

    // Change Edit button to Save
    const actions = row.querySelector('.actions');
    actions.innerHTML = `
        <button onclick="saveRow(${id})">Save</button>
        <button onclick="deleteRow(${id})">Delete</button>
    `;
}

// Save edited row to database
async function saveRow(id) {
    const row = document.getElementById(`row-${id}`);
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');

    const data = {
        assessment_name: inputs[0].value,
        category:        selects[0].value,
        due_date:        inputs[1].value,
        earned_marks:    inputs[2].value,
        total_marks:     inputs[3].value,
        status:          selects[1].value
    };

    await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    loadAssessments();
}

// Delete a row from database
async function deleteRow(id) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    await fetch(`${API}/${id}`, { method: 'DELETE' });
    loadAssessments();
}

// Add new assessment
async function addAssessment() {
    const courseId = getCourseId();

    const data = {
        course_id:       courseId,
        assessment_name: document.getElementById('newName').value,
        category:        document.getElementById('newCategory').value,
        due_date:        document.getElementById('newDueDate').value,
        earned_marks:    document.getElementById('newEarned').value || null,
        total_marks:     document.getElementById('newTotal').value,
        status:          document.getElementById('newStatus').value
    };

    if (!data.assessment_name || !data.total_marks) {
        alert('Please fill in at least the name and total marks!');
        return;
    }

    await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    closeModal();
    loadAssessments();
}

// Modal controls
function openModal() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('addModal').style.display = 'none';
}

// Load assessments when page opens
window.onload = loadAssessments;

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', 
        document.body.classList.contains('light-mode') 
        ? 'light' : 'dark');
}

// Apply saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
});