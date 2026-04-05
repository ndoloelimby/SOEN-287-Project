const DASHBOARD_API = "http://localhost:3000/api/student/dashboard";
let assignmentsData = [];

const calendar = document.getElementById("calendar");
const weekBtn = document.getElementById("weekBtn");
const monthBtn = document.getElementById("monthBtn");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const monthControls = document.getElementById("monthControls");
const upcomingDeadlinesList = document.getElementById("upcomingDeadlinesList");

const today = new Date();

function parseDueDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    const normalizedValue = typeof value === "string"
        ? value.replace(" ", "T")
        : value;
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatWeight(weight) {
    if (weight === null || weight === undefined || weight === "") {
        return "Ponderation N/A";
    }

    const numericWeight = Number(weight);
    const displayWeight = Number.isNaN(numericWeight)
        ? weight
        : numericWeight;

    return `Ponderation ${displayWeight}%`;
}

function formatDeadlineDate(date) {
    return date.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric"
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function loadAssignments() {
    try {
        const response = await fetch(DASHBOARD_API);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const dashboardData = await response.json();
        assignmentsData = dashboardData
            .map((item) => {
                const dueDate = parseDueDate(item.due_date);
                if (!dueDate) return null;

                return {
                    title: item.assessment_name || "Untitled assessment",
                    courseName: item.course_name || "Unknown course",
                    weightLabel: formatWeight(item.weight),
                    date: dueDate,
                    done: item.status === "completed"
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.date - b.date);
    } catch (error) {
        console.error("Failed to load dashboard assignments:", error);
        assignmentsData = [];
    }
}

function renderUpcomingDeadlines() {
    if (!upcomingDeadlinesList) return;

    const upcomingItems = assignmentsData.slice(0, 3);

    if (upcomingItems.length === 0) {
        upcomingDeadlinesList.innerHTML = `
            <li class="deadline-empty">No assessments to show.</li>
        `;
        return;
    }

    upcomingDeadlinesList.innerHTML = upcomingItems.map((item) => `
        <li class="deadline-item">
            <div class="deadline-top-row">
                <span class="deadline-course">${escapeHtml(item.courseName)}</span>
                <span class="deadline-date">${escapeHtml(formatDeadlineDate(item.date))}</span>
            </div>
            <div class="deadline-title">${escapeHtml(item.title)}</div>
            <div class="deadline-bottom-row">
                <span class="deadline-pill">${escapeHtml(item.weightLabel)}</span>
            </div>
        </li>
    `).join("");
}

function renderWeek() {
    calendar.innerHTML = "";
    calendar.className = "calendar-container week-view";
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        calendar.appendChild(createDayCard(day));
    }
}

function renderMonth(month, year) {
    calendar.innerHTML = "";
    calendar.className = "calendar month";

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let i = 0; i < firstDay.getDay(); i++) {
        const empty = document.createElement("div");
        empty.className = "day-card";
        calendar.appendChild(empty);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const card = createDayCard(date);
        calendar.appendChild(card);
    }
}

function createDayCard(date) {
    const card = document.createElement("div");
    card.classList.add("day-card");

    const currentDay = new Date();
    if (
        date.getDate() === currentDay.getDate() &&
        date.getMonth() === currentDay.getMonth() &&
        date.getFullYear() === currentDay.getFullYear()
    ) {
        card.classList.add("today");
    }

    const dayLabel = document.createElement("div");
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayLabel.textContent = `${weekdays[date.getDay()]} ${date.getDate()}`;
    dayLabel.style.fontSize = "12px";
    dayLabel.style.fontWeight = "bold";
    dayLabel.style.position = "absolute";
    dayLabel.style.top = "4px";
    dayLabel.style.left = "4px";
    dayLabel.style.color = "#2d1b6e";

    card.style.position = "relative";
    card.appendChild(dayLabel);

    assignmentsData.forEach((assignmentData) => {
        if (
            assignmentData.date.getDate() === date.getDate() &&
            assignmentData.date.getMonth() === date.getMonth() &&
            assignmentData.date.getFullYear() === date.getFullYear()
        ) {
            const assignment = document.createElement("div");
            assignment.className = "assignment";
            if (assignmentData.done) assignment.classList.add("done");
            assignment.innerHTML = `
                <div class="assignment-content">
                    <span class="assignment-title">${escapeHtml(assignmentData.title)}</span>
                    <span class="assignment-course">${escapeHtml(assignmentData.courseName)}</span>
                    <span class="assignment-weight">${escapeHtml(assignmentData.weightLabel)}</span>
                </div>
                <button class="done-btn" type="button">Done</button>
            `;

            assignment.querySelector(".done-btn").onclick = (event) => {
                event.stopPropagation();
                assignmentData.done = true;
                assignment.classList.add("done");
            };

            card.appendChild(assignment);
        }
    });

    return card;
}

const months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
months.forEach((monthName, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = monthName;
    monthSelect.appendChild(option);
});

for (let y = 2020; y <= 2035; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
}

monthSelect.value = today.getMonth();
yearSelect.value = today.getFullYear();

weekBtn.addEventListener("click", () => {
    weekBtn.classList.add("active");
    monthBtn.classList.remove("active");
    monthControls.style.display = "none";
    renderWeek();
});

monthBtn.addEventListener("click", () => {
    monthBtn.classList.add("active");
    weekBtn.classList.remove("active");
    monthControls.style.display = "block";
    renderMonth(parseInt(monthSelect.value, 10), parseInt(yearSelect.value, 10));
});

monthSelect.addEventListener("change", () => {
    renderMonth(parseInt(monthSelect.value, 10), parseInt(yearSelect.value, 10));
});

yearSelect.addEventListener("change", () => {
    renderMonth(parseInt(monthSelect.value, 10), parseInt(yearSelect.value, 10));
});

async function initializeCalendar() {
    await loadAssignments();
    renderUpcomingDeadlines();
    renderWeek();
    monthControls.style.display = "none";
    weekBtn.classList.add("active");
}

initializeCalendar();
