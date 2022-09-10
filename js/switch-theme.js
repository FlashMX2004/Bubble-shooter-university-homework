var href;

if (localStorage.getItem('theme') == 'styles/bubble-shooter.css') {
    setTheme('styles/bubble-shooter.css');
}
else if (localStorage.getItem('theme') == 'styles/bubble-shooter2.css') {
    setTheme('styles/bubble-shooter2.css');
}

switchTheme = () => setTheme(href == 'styles/bubble-shooter.css' ? 'styles/bubble-shooter2.css' : 'styles/bubble-shooter.css');

function setTheme(theme) {
    href = theme;

    let head = document.getElementsByTagName('head')[0]
    head.getElementsByTagName('link')[0].remove();

    let link = document.createElement('link');
    link.id = 'css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = theme;
    head.appendChild(link);

    localStorage.setItem('theme', theme);
}