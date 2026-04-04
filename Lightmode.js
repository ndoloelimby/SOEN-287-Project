// lightmode.js — works regardless of when script is loaded
(function () {

    function applyMode(light) {
        document.documentElement.classList.toggle('light-mode', light);
        const img = document.querySelector('.lightmode img');
        if (img) {
            img.src = light
                ? 'https://cdn-icons-png.flaticon.com/512/169/169367.png'  // moon
                : 'https://static.thenounproject.com/png/4808961-200.png'; // sun
            img.title = light ? 'Switch to dark mode' : 'Switch to light mode';
        }
    }

    function init() {
        // Apply saved preference
        const isLight = localStorage.getItem('scc_light_mode') === '1';
        applyMode(isLight);

        // Use event delegation on document so it catches any .lightmode click
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.lightmode');
            if (!btn) return;
            e.preventDefault();
            const nowLight = !document.documentElement.classList.contains('light-mode');
            localStorage.setItem('scc_light_mode', nowLight ? '1' : '0');
            applyMode(nowLight);
        });
    }

    // Run immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();