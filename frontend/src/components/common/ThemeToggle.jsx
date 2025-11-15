import { useEffect, useState } from "react";
import { HiSun, HiMoon } from "react-icons/hi";

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored) return stored;
    } catch (e) {
      // ignore
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    try {
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore storage errors
    }
  }, [theme]);

  const toggle = (e) => {
    e?.preventDefault();
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return (
    <button
      aria-pressed={theme === "dark"}
      aria-label="Toggle color theme"
      onClick={toggle}
      className='theme-toggle'
      data-state={theme === "dark" ? "dark" : "light"}
    >
      <HiMoon className='icon moon' />
      <HiSun className='icon sun' />
      <span className='knob' />
    </button>
  );
};

export default ThemeToggle;
