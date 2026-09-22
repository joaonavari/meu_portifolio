(() => {
  "use strict";

  const section = document.getElementById("projetos");
  if (!section || !("IntersectionObserver" in window) || !("inert" in HTMLElement.prototype)) return;

  const SETTINGS = Object.freeze({
    minWidth: 768,
    tabletWidth: 1000,
    transition: .28,
    scrollScreensPerProject: 1.25,
    stickyGap: 16,
    scenePadding: 44,
    stagger: .07,
    screenZoomIn: .04,
    screenZoomOut: .025,
    textEntryDelay: .25,
    textExitDuration: .5,
    mouseX: 1.8,
    mouseY: 2.4,
    mouseSmoothing: 110,
    mouseThreshold: .01,
    mobileDuration: 220
  });
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => value * value * (3 - 2 * value);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const sticky = section.querySelector(".projects-sticky");
  const deck = section.querySelector(".projects-deck");
  const visual = section.querySelector(".projects-visual");
  const laptop = section.querySelector(".project-laptop");
  const laptopBody = section.querySelector(".laptop-body");
  const screen = section.querySelector(".laptop-screen");
  const laptopCaption = section.querySelector("[data-laptop-caption]");
  const toolbar = section.querySelector(".projects-toolbar");
  const counter = section.querySelector(".projects-counter");
  const current = section.querySelector("[data-project-current]");
  const counterName = section.querySelector(".projects-counter-name");
  const navigation = section.querySelector(".projects-navigation");
  const previous = section.querySelector("[data-project-previous]");
  const next = section.querySelector("[data-project-next]");
  const viewToggle = section.querySelector(".projects-view-toggle");
  const header = document.getElementById("siteHeader");
  const projects = [...deck.querySelectorAll(".project-scene")].map(createProject);
  const lifetime = new AbortController();
  let stopInteraction = () => {};
  let layoutFrame = 0;
  let story = false;
  let mobileStory = false;
  let listRequested = false;
  let activeIndex = 0;
  let metrics = null;

  section.querySelector("[data-project-total]").textContent = String(projects.length).padStart(2, "0");

  function createProject(element, index) {
    return {
      element,
      index,
      direction: index % 2 === 0 ? 1 : -1,
      stage: element.querySelector(".project-stage"),
      copy: element.querySelector(".project-copy"),
      capture: element.querySelector(".project-capture"),
      image: element.querySelector("img"),
      title: element.querySelector("h3"),
      reveals: [...element.querySelectorAll("[data-project-reveal]")],
      lastFrame: ""
    };
  }

  function projectPhase(time, index) {
    const entry = index === 0 ? 1 : clamp((time - index + SETTINGS.transition) / SETTINGS.transition);
    const exit = index === projects.length - 1 ? 0 : clamp((time - index - 1 + SETTINGS.transition) / SETTINGS.transition);
    return { entry, exit, reading: entry === 1 && exit === 0 };
  }

  function renderProject(project, phase, intensity) {
    const key = `${phase.entry}:${phase.exit}`;
    if (key === project.lastFrame) return;
    project.lastFrame = key;
    const entry = ease(phase.entry);
    const exit = ease(phase.exit);
    const visible = entry > 0 && exit < 1;
    project.element.classList.toggle("is-present", visible);
    project.capture.classList.toggle("is-present", visible);
    project.element.dataset.phase = !visible ? "hidden" : phase.reading ? "reading" : phase.entry < 1 ? "entering" : "leaving";
    if (!visible) return;

    const incoming = 1 - entry;
    const direction = project.direction * intensity;
    const style = project.element.style;
    // Later captures paint over earlier ones. Keep the lower layer opaque so
    // their crossfade never exposes the dark screen between projects.
    project.capture.style.setProperty("--screen-opacity", String(entry));
    project.capture.style.setProperty("--screen-scale", String(1 + incoming * SETTINGS.screenZoomIn - exit * SETTINGS.screenZoomOut));
    const textEntry = ease(clamp((phase.entry - SETTINGS.textEntryDelay) / (1 - SETTINGS.textEntryDelay)));
    const textExit = ease(clamp(phase.exit / SETTINGS.textExitDuration));
    style.setProperty("--copy-opacity", String(textEntry * (1 - textExit)));
    style.setProperty("--copy-x", `${(incoming * 28 + exit * 42) * direction}px`);
    style.setProperty("--light-opacity", String(entry * (1 - exit)));
    project.reveals.forEach((element, index) => {
      const delay = index * SETTINGS.stagger;
      const progress = ease(clamp((phase.entry - delay) / (1 - delay)));
      element.style.opacity = String(progress);
      element.style.transform = `translateY(${(1 - progress) * 12 * intensity}px)`;
    });
  }

  function setActive(index) {
    const changed = index !== activeIndex || !projects[index].element.classList.contains("is-active");
    if (!changed) return;
    const focused = document.activeElement;
    if (!mobileStory && projects.some((project) => project.index !== index && project.element.contains(focused))) {
      counter.focus({ preventScroll: true });
    }
    activeIndex = index;
    projects.forEach((project) => {
      const active = project.index === index;
      project.element.classList.toggle("is-active", active);
      project.element.inert = !mobileStory && !active;
      if (!mobileStory) project.element.setAttribute("aria-hidden", String(!active));
      project.capture.setAttribute("aria-hidden", String(!active));
    });
    laptopCaption.textContent = projects[index].title.textContent;
    laptop.setAttribute("aria-describedby", projects[index].title.id);
    current.textContent = String(index + 1).padStart(2, "0");
    counterName.textContent = ` — ${projects[index].title.textContent}`;
    previous.disabled = index === 0;
    next.disabled = index === projects.length - 1;
    if ((focused === previous && previous.disabled) || (focused === next && next.disabled)) {
      counter.focus({ preventScroll: true });
    }
  }

  function restoreFlow() {
    stopInteraction();
    stopInteraction = () => {};
    section.classList.remove("is-story", "is-mobile-story");
    ["--story-height", "--story-top", "--deck-height", "--story-progress", "--mobile-visual-height"].forEach((property) => section.style.removeProperty(property));
    if (toolbar.parentElement !== sticky) sticky.insertBefore(toolbar, deck);
    projects.forEach((project) => {
      project.element.inert = false;
      project.element.removeAttribute("aria-hidden");
      project.element.removeAttribute("data-phase");
      project.element.classList.remove("is-present", "is-active");
      project.element.removeAttribute("style");
      project.capture.removeAttribute("style");
      project.capture.removeAttribute("aria-hidden");
      project.capture.classList.remove("is-present");
      if (project.capture.parentElement !== project.stage) project.stage.prepend(project.capture);
      project.reveals.forEach((element) => {
        element.style.removeProperty("opacity");
        element.style.removeProperty("transform");
      });
      project.lastFrame = "";
    });
    toolbar.hidden = true;
    visual.hidden = true;
    laptopBody.removeAttribute("style");
    laptop.removeAttribute("aria-describedby");
    story = false;
    mobileStory = false;
  }

  function measureMobileStory() {
    const top = header.getBoundingClientRect().height;
    section.style.setProperty("--story-top", `${top}px`);
    section.classList.add("is-mobile-story");
    projects.forEach((project) => {
      screen.append(project.capture);
      project.image.loading = "eager";
    });
    visual.prepend(toolbar);
    visual.hidden = false;
    toolbar.hidden = counter.hidden = navigation.hidden = false;
    viewToggle.textContent = "Ver em lista";
    const visualHeight = visual.offsetHeight;
    section.style.setProperty("--mobile-visual-height", `${visualHeight}px`);
    const readingHeight = window.innerHeight - top - visualHeight;
    // A short landscape window or enlarged text should remain an ordinary list.
    if (readingHeight < 220 || !imagesReady() || toolbar.scrollWidth > toolbar.clientWidth + 1) return false;
    const targets = projects.map((project) => project.element.getBoundingClientRect().top + window.scrollY - top - visualHeight);
    metrics = {
      start: targets[0],
      distance: Math.max(1, targets.at(-1) - targets[0] + projects.at(-1).element.offsetHeight - readingHeight),
      targets,
      transition: Math.min(96, readingHeight * .25),
      top: top + visualHeight
    };
    return true;
  }

  function startMobileStory() {
    const controller = new AbortController();
    const { signal } = controller;
    let frame = 0;
    let focusFrame = 0;
    let listening = false;

    function update() {
      frame = 0;
      try {
        const scroll = window.scrollY;
        let index = 0;
        projects.forEach((project, i) => {
          const entry = i === 0 ? 1 : ease(clamp((scroll - metrics.targets[i] + metrics.transition) / metrics.transition));
          const exit = i === projects.length - 1 ? 0 : ease(clamp((scroll - metrics.targets[i + 1] + metrics.transition) / metrics.transition));
          if (entry >= .5) index = i;
          project.capture.classList.toggle("is-present", entry > 0 && exit < 1);
          project.capture.style.setProperty("--screen-opacity", String(entry));
          project.capture.style.setProperty("--screen-scale", String(1 + (1 - entry) * .02 - exit * .01));
        });
        setActive(index);
        section.style.setProperty("--story-progress", String(clamp((scroll - metrics.start) / metrics.distance)));
      } catch (error) {
        restoreFlow();
        throw error;
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !listening) {
        window.addEventListener("scroll", schedule, { passive: true, signal });
        listening = true;
        schedule();
      } else if (!entry.isIntersecting && listening) {
        window.removeEventListener("scroll", schedule);
        listening = false;
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { rootMargin: "100% 0px" });
    observer.observe(section);
    // Keep keyboard focus below the pinned laptop, including links reached by Tab.
    deck.addEventListener("focusin", (event) => {
      if (!event.target.closest(".project-copy")) return;
      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = 0;
        if (document.activeElement !== event.target) return;
        const bounds = event.target.getBoundingClientRect();
        const offset = bounds.top < metrics.top + 12
          ? bounds.top - metrics.top - 12
          : Math.max(0, bounds.bottom - window.innerHeight + 12);
        if (offset) window.scrollBy({ top: offset, behavior: "instant" });
      });
    }, { signal });
    stopInteraction = () => {
      controller.abort();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(focusFrame);
    };
    update();
  }

  function measureStory() {
    const top = header.getBoundingClientRect().height + SETTINGS.stickyGap;
    section.style.setProperty("--story-top", `${top}px`);
    section.classList.add("is-story");
    projects.forEach((project) => screen.append(project.capture));
    visual.hidden = false;
    toolbar.hidden = false;
    counter.hidden = false;
    navigation.hidden = false;
    viewToggle.textContent = "Ver em lista";
    const deckHeight = deck.clientHeight;
    section.style.setProperty("--deck-height", `${deckHeight}px`);
    const available = deckHeight - SETTINGS.scenePadding;
    const fits = available > 0 && laptop.offsetHeight <= available && projects.every((project) =>
      project.copy.scrollHeight <= available && project.copy.scrollWidth <= project.copy.clientWidth + 1
    );
    if (!fits) return false;
    // Keep the usable list until every screen is ready, including on a cold
    // direct visit to #projetos followed immediately by fast scrolling.
    projects.forEach((project) => { project.image.loading = "eager"; });
    if (!imagesReady()) return false;
    const units = projects.length - SETTINGS.transition;
    const distance = sticky.offsetHeight * SETTINGS.scrollScreensPerProject * units;
    section.style.setProperty("--story-height", `${sticky.offsetHeight + distance}px`);
    metrics = {
      start: section.getBoundingClientRect().top + window.scrollY - top,
      distance,
      units,
      intensity: window.innerWidth <= SETTINGS.tabletWidth ? .5 : 1
    };
    return true;
  }

  function startStory() {
    const controller = new AbortController();
    const { signal } = controller;
    let frame = 0;
    let dirty = true;
    let listening = false;
    let reading = true;
    let lastTime = 0;
    let pointerBounds = null;
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    function resetPointer() {
      mouse.targetX = 0;
      mouse.targetY = 0;
      schedule();
    }

    function update(timestamp) {
      frame = 0;
      try {
        if (dirty) {
          const progress = clamp((window.scrollY - metrics.start) / metrics.distance);
          const time = progress * metrics.units;
          const index = Math.min(projects.length - 1, Math.floor(time + SETTINGS.transition / 2));
          setActive(index);
          projects.forEach((project) => renderProject(project, projectPhase(time, project.index), metrics.intensity));
          section.style.setProperty("--story-progress", String(progress));
          reading = projectPhase(time, index).reading;
          if (!reading) mouse.targetX = mouse.targetY = 0;
          dirty = false;
        }
        const delta = lastTime ? Math.min(timestamp - lastTime, 64) : 16;
        lastTime = timestamp;
        const blend = 1 - Math.exp(-delta / SETTINGS.mouseSmoothing);
        mouse.x += (mouse.targetX - mouse.x) * blend;
        mouse.y += (mouse.targetY - mouse.y) * blend;
        const moving = Math.abs(mouse.targetX - mouse.x) + Math.abs(mouse.targetY - mouse.y) > SETTINGS.mouseThreshold;
        if (!moving) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        }
        laptopBody.style.setProperty("--pointer-rx", `${mouse.x}deg`);
        laptopBody.style.setProperty("--pointer-ry", `${mouse.y}deg`);
        if (moving) schedule();
      } catch (error) {
        restoreFlow();
        throw error;
      }
    }

    function onScroll() {
      dirty = true;
      pointerBounds = null;
      schedule();
    }

    if (finePointer.matches && window.innerWidth > SETTINGS.tabletWidth) {
      laptop.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" || !reading) return;
        pointerBounds ??= laptop.getBoundingClientRect();
        mouse.targetX = (.5 - clamp((event.clientY - pointerBounds.top) / pointerBounds.height)) * SETTINGS.mouseX * 2;
        mouse.targetY = (clamp((event.clientX - pointerBounds.left) / pointerBounds.width) - .5) * SETTINGS.mouseY * 2;
        schedule();
      }, { signal, passive: true });
      laptop.addEventListener("pointerleave", () => {
        pointerBounds = null;
        resetPointer();
      }, { signal });
      laptop.addEventListener("pointercancel", resetPointer, { signal });
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !listening) {
        window.addEventListener("scroll", onScroll, { passive: true, signal });
        projects.forEach((project) => { project.image.loading = "eager"; });
        listening = true;
        onScroll();
      } else if (!entry.isIntersecting && listening) {
        window.removeEventListener("scroll", onScroll);
        listening = false;
        window.cancelAnimationFrame(frame);
        frame = 0;
        mouse.x = mouse.y = mouse.targetX = mouse.targetY = 0;
      }
    }, { rootMargin: "100% 0px" });
    observer.observe(section);
    stopInteraction = () => {
      controller.abort();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
    update(performance.now());
  }

  function startSimpleEntrances() {
    if (reducedMotion.matches) return;
    const animations = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (typeof entry.target.animate === "function") {
          const animation = entry.target.animate(
            [{ opacity: .8, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
            { duration: SETTINGS.mobileDuration, easing: "ease-out" }
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: .1 });
    projects.forEach((project) => {
      observer.observe(project.stage);
      project.reveals.forEach((element) => observer.observe(element));
    });
    stopInteraction = () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }

  function configure() {
    layoutFrame = 0;
    const wasStory = story;
    const wasMobileStory = mobileStory;
    const previousIndex = activeIndex;
    const withinStory = wasStory && window.scrollY >= metrics.start && window.scrollY <= metrics.start + metrics.distance;
    const oldProgress = withinStory ? clamp((window.scrollY - metrics.start) / metrics.distance) : 0;
    const oldProjectOffset = wasMobileStory ? window.scrollY - metrics.targets[previousIndex] : 0;
    restoreFlow();
    try {
      const canPresent = !reducedMotion.matches && !listRequested;
      if (canPresent && window.innerWidth < SETTINGS.minWidth && measureMobileStory()) {
        story = mobileStory = true;
        if (withinStory) {
          // Mobile browser bars resize the viewport during scrolling. Preserve
          // the place in the text instead of rescaling its overall progress.
          const top = metrics.targets[previousIndex] + (wasMobileStory ? oldProjectOffset : 0);
          window.scrollTo({ top, behavior: "instant" });
        }
        startMobileStory();
      } else if (canPresent && window.innerWidth >= SETTINGS.minWidth && measureStory()) {
        story = true;
        if (withinStory) {
          const progress = wasMobileStory ? (previousIndex + (1 - SETTINGS.transition) / 2) / metrics.units : oldProgress;
          window.scrollTo({ top: metrics.start + progress * metrics.distance, behavior: "instant" });
        }
        startStory();
      } else {
        restoreFlow();
        if (listRequested && !reducedMotion.matches) {
          toolbar.hidden = false;
          navigation.hidden = true;
          counter.hidden = true;
          viewToggle.textContent = "Ver apresentação";
        }
        if (withinStory) {
          const project = projects[activeIndex];
          project.title.focus({ preventScroll: true });
          project.title.scrollIntoView({ block: "center", behavior: "instant" });
        }
        startSimpleEntrances();
      }
    } catch (error) {
      restoreFlow();
      throw error;
    }
  }

  function scheduleLayout() {
    if (!layoutFrame) layoutFrame = window.requestAnimationFrame(configure);
  }

  function imagesReady() {
    return projects.every((project) => project.image.complete && project.image.naturalWidth > 0);
  }

  function goToProject(index) {
    if (!story) return;
    const targetIndex = Math.max(0, Math.min(projects.length - 1, index));
    if (mobileStory) {
      window.scrollTo({ top: metrics.targets[targetIndex], behavior: "instant" });
      return;
    }
    const readingTime = targetIndex + (1 - SETTINGS.transition) / 2;
    window.scrollTo({ top: metrics.start + readingTime / metrics.units * metrics.distance, behavior: "instant" });
  }

  previous.addEventListener("click", () => goToProject(activeIndex - 1), { signal: lifetime.signal });
  next.addEventListener("click", () => goToProject(activeIndex + 1), { signal: lifetime.signal });
  projects.forEach((project) => project.image.addEventListener("load", () => {
    if (!story && imagesReady()) scheduleLayout();
  }, { signal: lifetime.signal }));
  viewToggle.addEventListener("click", () => {
    const selectedIndex = activeIndex;
    listRequested = !listRequested;
    configure();
    if (story) {
      goToProject(selectedIndex);
      counter.focus({ preventScroll: true });
    }
  }, { signal: lifetime.signal });
  window.addEventListener("resize", scheduleLayout, { signal: lifetime.signal });
  [reducedMotion, finePointer].forEach((query) => query.addEventListener("change", scheduleLayout, { signal: lifetime.signal }));
  window.addEventListener("pagehide", (event) => {
    window.cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    stopInteraction();
    if (!event.persisted) lifetime.abort();
  }, { signal: lifetime.signal });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) configure();
  }, { signal: lifetime.signal });
  configure();
  document.fonts?.ready.then(() => {
    if (!lifetime.signal.aborted) scheduleLayout();
  });
})();
