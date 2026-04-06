const navSectionByPage = {
    'dashboardtrial.html': 'dashboard',
    'mycourses.html': 'courses',
    'detailssoen287.html': 'courses',
    'detailssoen228.html': 'courses',
    'detailsengr233.html': 'courses',
    'detailscomp249.html': 'courses',
    'analytics.html': 'analytics',
    'analytics-soen287.html': 'analytics',
    'analytics-soen228.html': 'analytics',
    'analytics-engr233.html': 'analytics',
    'analytics-comp249.html': 'analytics'
};

const sectionByHref = {
    'dashboardtrial.html': 'dashboard',
    'mycourses.html': 'courses',
    'analytics.html': 'analytics'
};

function getCurrentSection() {
    const fileName = window.location.pathname.split('/').pop().toLowerCase();
    return navSectionByPage[fileName] || null;
}

function applyActiveNavState() {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    document.querySelectorAll('.navbar ul li').forEach((item) => {
        item.classList.remove('active');

        const link = item.querySelector('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        const fileName = href.split('/').pop().toLowerCase();
        if (sectionByHref[fileName] === currentSection) {
            item.classList.add('active');
        }
    });
}

window.addEventListener('DOMContentLoaded', applyActiveNavState);
