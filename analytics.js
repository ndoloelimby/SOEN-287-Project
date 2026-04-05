const API = 'http://localhost:3000/api/grades';

const COURSE_IDS = {
    comp249: 2,
    soen287: 1,
    engr233: 3,
    soen228: 4
};

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

function getCourseId() {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('comp249')) return COURSE_IDS.comp249;
    if (page.includes('soen287')) return COURSE_IDS.soen287;
    if (page.includes('engr233')) return COURSE_IDS.engr233;
    if (page.includes('soen228')) return COURSE_IDS.soen228;
    return null;
}

function getProgressPercentage(data) {
    if (!data.total_weight) {
        return data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
    }

    return Math.round((data.completed_weight / data.total_weight) * 100);
}

function updateRing(ring, value, label) {
    if (!ring) return;
    ring.style.setProperty('--p', String(value));
    const center = ring.querySelector('.ring-center');
    if (center) center.textContent = label;
}

function setAnalyticsError(message) {
    const content = document.querySelector('.content');
    if (!content) return;

    const existing = content.querySelector('.analytics-error');
    if (existing) existing.remove();

    const error = document.createElement('p');
    error.className = 'analytics-error';
    error.textContent = message;
    error.style.color = '#a22';
    error.style.fontWeight = '600';
    content.prepend(error);
}

async function fetchAnalytics(courseId) {
    const response = await fetch(`${API}/${courseId}/analytics`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Could not load analytics.');
    }

    return data;
}

async function loadCourseAnalytics() {
    const courseId = getCourseId();
    if (!courseId) return;

    try {
        const data = await fetchAnalytics(courseId);
        const average = Number(data.average || 0);
        const gpa = toGPA(average);
        const completionPercent = getProgressPercentage(data);

        const averageRing = document.getElementById('averageRing');
        const gpaRing = document.getElementById('gpaRing');
        const completionRing = document.querySelector('.stat-card:nth-of-type(2) .ring');
        const completionValue = document.getElementById('completionValue');
        const trendContainer = document.getElementById('trendBars');

        updateRing(averageRing, average, `${average.toFixed(2)}%`);
        updateRing(gpaRing, ((gpa / 4.3) * 100).toFixed(0), gpa.toFixed(1));
        updateRing(completionRing, completionPercent, `${completionPercent}%`);

        if (completionValue) {
            completionValue.textContent = `${data.completed} / ${data.total}`;
        }

        if (trendContainer) {
            const completedAssessments = data.assessments.filter(
                (assessment) => assessment.percentage !== null
            );

            if (!completedAssessments.length) {
                trendContainer.innerHTML = `
                    <p style="opacity:0.5;">No graded assessments yet.</p>
                `;
                return;
            }

            trendContainer.innerHTML = completedAssessments.map((assessment) => {
                const weightLabel = assessment.weight !== null ? `${assessment.weight}%` : 'No weight';
                return `
                    <div class="trend-row">
                        <span>${assessment.assessment_name} (${weightLabel})</span>
                        <div class="trend-bar-wrap">
                            <div class="trend-bar" style="width:${assessment.percentage}%;"></div>
                        </div>
                        <span>${assessment.percentage}%</span>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        setAnalyticsError(error.message);
    }
}

async function loadSummaryAnalytics() {
    const courses = [
        { id: 1, name: 'SOEN 287', key: 'soen287' },
        { id: 2, name: 'COMP 249', key: 'comp249' },
        { id: 3, name: 'ENGR 233', key: 'engr233' },
        { id: 4, name: 'SOEN 228', key: 'soen228' }
    ];

    for (const course of courses) {
        try {
            const data = await fetchAnalytics(course.id);
            const average = Number(data.average || 0);
            const gpa = toGPA(average);

            updateRing(
                document.getElementById(`avg-ring-${course.key}`),
                average,
                `${average.toFixed(2)}%`
            );

            updateRing(
                document.getElementById(`gpa-ring-${course.key}`),
                ((gpa / 4.3) * 100).toFixed(0),
                gpa.toFixed(1)
            );

            const completion = document.getElementById(`comp-${course.key}`);
            if (completion) {
                completion.textContent = `Completed ${data.completed} / ${data.total}`;
            }
        } catch (error) {
            setAnalyticsError(`Could not load ${course.name}: ${error.message}`);
        }
    }
}

window.onload = () => {
    const page = window.location.pathname.toLowerCase();
    if (page.includes('analytics-')) {
        loadCourseAnalytics();
    } else {
        loadSummaryAnalytics();
    }
};

function exportCSV() {
    const courseId = getCourseId();
    window.location.href = `${API}/${courseId}/export/csv`;
}

function exportPDF() {
    const courseId = getCourseId();
    window.location.href = `${API}/${courseId}/export/pdf`;
}
