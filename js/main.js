(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeToggle = document.getElementById("themeToggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function updateThemeControl() {
    const light = root.dataset.theme === "light";
    const nextTheme = light ? "escuro" : "claro";
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", `Modo ${light ? "claro" : "escuro"} ativo. Ativar modo ${nextTheme}`);
      themeToggle.title = `Ativar modo ${nextTheme}`;
    }
    if (themeColor) themeColor.content = light ? "#F5F6F8" : "#090A0C";
  }

  updateThemeControl();
  if (themeToggle) themeToggle.disabled = false;
  themeToggle?.addEventListener("click", () => {
    if (!reducedMotion) {
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 220);
    }

    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    updateThemeControl();
    try { localStorage.setItem("portfolio-theme", next); } catch (_) { /* A troca continua funcional nesta visita. */ }
  });

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const menu = document.getElementById("mobileMenu");
  const menuButton = menu?.querySelector("summary");
  const menuText = menu?.querySelector(".menu-text");

  if (menu && menuButton && menuText) {
    menu.addEventListener("toggle", () => {
      menuButton.setAttribute("aria-label", menu.open ? "Fechar menu de navegação" : "Abrir menu de navegação");
      menuText.textContent = menu.open ? "Fechar" : "Menu";
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => { menu.open = false; });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        menuButton.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")].filter((section) => section.id !== "hero");
  const navLinks = [...document.querySelectorAll("[data-nav-link]")];
  let scrollScheduled = false;

  function updateActiveLink() {
    const marker = window.scrollY + window.innerHeight * 0.38;
    let activeId = "";

    for (const section of sections) {
      if (section.offsetTop <= marker) activeId = section.id;
    }

    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === "#" + activeId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    scrollScheduled = false;
  }

  window.addEventListener("scroll", () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      window.requestAnimationFrame(updateActiveLink);
    }
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (menu && window.innerWidth > 820) menu.open = false;
    updateActiveLink();
  });
  updateActiveLink();

  if (!reducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -24px 0px", threshold: 0.05 });

    document.querySelectorAll("[data-reveal]").forEach((element) => {
      if (element.getBoundingClientRect().top > window.innerHeight - 24) {
        element.classList.add("will-reveal");
        observer.observe(element);
      }
    });
  }
})();
