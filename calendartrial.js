const assignmentsData = [
  { title: "Assignment 1 - COMP249", date: new Date(2026, 2, 5), done: false },
  { title: "Design Diagram", date: new Date(2026, 2, 5), done: false },
  { title: "Assignment 2 - ENGR233", date: new Date(2026, 2, 6), done: false }
];


const calendar = document.getElementById("calendar");
const weekBtn = document.getElementById("weekBtn");
const monthBtn = document.getElementById("monthBtn");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const monthControls = document.getElementById("monthControls");

const today = new Date();
let selectedAssignment = null;


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
        empty.className = "day-card"; // empty box
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

    const today = new Date();
    if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    ) {
        card.classList.add("today");
    }

    
    const dayLabel = document.createElement("div");
    const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    dayLabel.textContent = `${weekdays[date.getDay()]} ${date.getDate()}`;
    dayLabel.style.fontSize = "12px";
    dayLabel.style.fontWeight = "bold";
    dayLabel.style.position = "absolute";
    dayLabel.style.top = "4px";
    dayLabel.style.left = "4px";
    dayLabel.style.color = "#2d1b6e";

    card.style.position = "relative";
    card.appendChild(dayLabel);

    
    assignmentsData.forEach(a => {
        if (
            a.date.getDate() === date.getDate() &&
            a.date.getMonth() === date.getMonth() &&
            a.date.getFullYear() === date.getFullYear()
        ) {
            const assignment = document.createElement("div");
            assignment.className = "assignment";
            if(a.done) assignment.classList.add("done");

            assignment.style.background = "linear-gradient(135deg, #c4b0e8, #a8c4f5)";
            assignment.style.color = "#2d1b6e";
            assignment.style.borderRadius = "8px";
            assignment.style.padding = "6px 8px";
            assignment.style.fontSize = "12px";
            assignment.style.display = "flex";
            assignment.style.justifyContent = "space-between";
            assignment.style.alignItems = "center";
            assignment.style.marginTop = "18px"; 

            assignment.innerHTML = `
                <span class="assignment-title">${a.title}</span>
                <button class="done-btn">Done</button>
            `;

            assignment.querySelector(".done-btn").onclick = (e) => {
                e.stopPropagation();
                a.done = true;
                assignment.classList.add("done");
            };

            card.appendChild(assignment);
        }
    });

    return card;
}


const months = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
months.forEach((m, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = m;
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
    renderMonth(parseInt(monthSelect.value), parseInt(yearSelect.value));
});

monthSelect.addEventListener("change", () => {
    renderMonth(parseInt(monthSelect.value), parseInt(yearSelect.value));
});

yearSelect.addEventListener("change", () => {
    renderMonth(parseInt(monthSelect.value), parseInt(yearSelect.value));
});


renderWeek();
monthControls.style.display = "none";
weekBtn.classList.add("active");





