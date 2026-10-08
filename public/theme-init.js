var saved = localStorage.getItem('waritoTheme');
var light = saved === 'light' ||
  ((!saved || saved === 'system') &&
    window.matchMedia('(prefers-color-scheme: light)').matches);
if (light) document.documentElement.classList.add('theme-light');
document.documentElement.style.colorScheme = light ? 'light' : 'dark';
