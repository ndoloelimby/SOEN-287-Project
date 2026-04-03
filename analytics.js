const API = 'http://localhost:3000/api/grades';

const COURSE_IDS = {
    'comp249': 2,
    'soen287': 1,
    'engr233': 3,
    'soen228': 4
};

// Convert percentage to GPA
function toGPA(avg) {
    if (avg >= 90) return 4.3;
    if (avg >= 85) return 4.0;
    if (avg >= 80) return 3.7;
    if (avg >= 75) return 3.3;
    if (avg >= 70) return 3.0;
    if (avg >= 65) return 2.7;
    if (avg >= 60) return 2.3;
    if (avg >= 55) return 2.0;
    if (avg >= 50) return 1.0;
    return 0.0;
}

// Get course from URL
function getCourseId() {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('comp249')) return COURSE_IDS.comp249;
    if (page.includes('soen287')) return COURSE_IDS.soen287;
    if (page.includes('engr233')) return COURSE_IDS.engr233;
    if (page.includes('soen228')) return COURSE_IDS.soen228;
    return null;
}

// Load individual course analytics page
async function loadCourseAnalytics() {
    const courseId = getCourseId();
    if (!courseId) return;

    const res = await fetch(`${API}/${courseId}/analytics`);
    const data = await res.json();

    // Update average ring
    const avgEl = document.getElementById('averageValue');
    if (avgEl) avgEl.textContent = data.average + '%';

    const avgRing = document.getElementById('averageRing');
    if (avgRing) avgRing.style.setProperty('--p', data.average);

    // Update GPA
    const gpa = toGPA(parseFloat(data.average));
    const gpaEl = document.getElementById('gpaValue');
    if (gpaEl) gpaEl.textContent = gpa + ' / 4.3';

    const gpaRing = document.getElementById('gpaRing');
    if (gpaRing) gpaRing.style.setProperty('--p', 
        ((gpa / 4.3) * 100).toFixed(0));

    // Update completion
    const compEl = document.getElementById('completionValue');
    if (compEl) compEl.textContent = 
        `${data.completed} / ${data.total}`;

    // Update performance trend bars
    const trendContainer = document.getElementById('trendBars');
    if (trendContainer && data.assessments.length > 0) {
        trendContainer.innerHTML = '';
        data.assessments.forEach(a => {
            trendContainer.innerHTML += `
                <div class="trend-row">
                    <span>${a.assessment_name}</span>
                    <div class="trend-bar-wrap">
                        <div class="trend-bar" 
                            style="width:${a.percentage}%;">
                        </div>
                    </div>
                    <span>${a.percentage}%</span>
                </div>`;
        });
    }
}

// Load summary analytics page (analytics.html)
async function loadSummaryAnalytics() {
    const courses = [
        { id: 1, name: 'SOEN 287', key: 'soen287' },
        { id: 2, name: 'COMP 249', key: 'comp249' },
        { id: 3, name: 'ENGR 233', key: 'engr233' },
        { id: 4, name: 'SOEN 228', key: 'soen228' }
    ];

    for (const course of courses) {
        const res = await fetch(`${API}/${course.id}/analytics`);
        const data = await res.json();
        const gpa = toGPA(parseFloat(data.average));

        // Update average ring
        const avgRing = document.getElementById(
            `avg-ring-${course.key}`);
        if (avgRing) {
            avgRing.style.setProperty('--p', data.average);
            const span = avgRing.querySelector('.ring-center');
            if (span) span.textContent = data.average + '%';
        }

        // Update GPA ring
        const gpaRing = document.getElementById(
            `gpa-ring-${course.key}`);
        if (gpaRing) {
            gpaRing.style.setProperty('--p', 
                ((gpa / 4.3) * 100).toFixed(0));
            const span = gpaRing.querySelector('.ring-center');
            if (span) span.textContent = gpa;
        }

        // Update completion text
        const compEl = document.getElementById(
            `comp-${course.key}`);
        if (compEl) compEl.textContent = 
            `Completed ${data.completed} / ${data.total}`;
    }
}

// Decide which function to run based on page
window.onload = () => {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('analytics-')) {
        loadCourseAnalytics();
    } else {
        loadSummaryAnalytics();
    }
};