(() => {
  "use strict";

  const section = document.getElementById("projetos");
  if (!section || !("IntersectionObserver" in window)) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 600px)");
  const pointer = window.matchMedia("(min-width: 1001px) and (hover: hover) and (pointer: fine)");
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let dispose = () => {};

  function createScene(element, signal) {
    const stage = element.querySelector(".project-stage");
    const depth = element.querySelector(".project-depth");
    const browser = element.querySelector(".project-browser");
    const reveals = [...element.querySelectorAll("[data-project-reveal]")];

    function resetPointer() {
      browser.style.removeProperty("--pointer-rx");
      browser.style.removeProperty("--pointer-ry");
    }

    if (pointer.matches) {
      stage.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse") return;
        const rect = stage.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width) - .5;
        const y = clamp((event.clientY - rect.top) / rect.height) - .5;
        browser.style.setProperty("--pointer-rx", `${-y * 5}deg`);
        browser.style.setProperty("--pointer-ry", `${x * 6}deg`);
      }, { signal, passive: true });
      stage.addEventListener("pointerleave", resetPointer, { signal });
      stage.addEventListener("pointercancel", resetPointer, { signal });
    }

    return {
      element,
      measure() {
        return element.getBoundingClientRect();
      },
      update(rect, viewport) {
        const progress = clamp((viewport * .92 - rect.top) / Math.min(380, viewport * .55));
        const travel = clamp((viewport - rect.top) / (viewport + rect.height));
        const intensity = window.innerWidth <= 1000 ? .4 : 1;
        depth.style.setProperty("--scene-y", `${(26 - travel * 44) * intensity}px`);
        depth.style.setProperty("--scene-rx", `${(1 - progress) * 5 * intensity}deg`);
        depth.style.setProperty("--scene-ry", `${(1 - progress) * -7 * intensity}deg`);
        reveals.forEach((item, index) => {
          const step = clamp((progress - index * .09) / .55);
          item.style.opacity = String(step);
          item.style.transform = `translateY(${(1 - step) * 16}px)`;
        });
      },
      reset() {
        resetPointer();
        ["--scene-y", "--scene-rx", "--scene-ry"].forEach((property) => depth.style.removeProperty(property));
        reveals.forEach((item) => {
          item.style.removeProperty("opacity");
          item.style.removeProperty("transform");
        });
      }
    };
  }

  function setup() {
    dispose();
    if (motion.matches) return;

    const controller = new AbortController();
    const { signal } = controller;
    const scenes = [...section.querySelectorAll(".project-scene")].map((element) => createScene(element, signal));
    const animations = new Set();
    let frame = 0;
    let listening = false;

    function update() {
      frame = 0;
      const viewport = window.innerHeight;
      const measured = scenes.map((scene) => ({ scene, rect: scene.measure() }));
      measured.forEach(({ scene, rect }) => {
        if (rect.bottom >= 0 && rect.top <= viewport) scene.update(rect, viewport);
      });
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver((entries) => {
      if (mobile.matches) {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (typeof entry.target.animate === "function") {
            const animation = entry.target.animate(
              [{ opacity: .65, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
              { duration: 220, easing: "ease-out" }
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
          observer.unobserve(entry.target);
        });
        return;
      }

      const visible = entries[0].isIntersecting;
      if (visible && !listening) {
        window.addEventListener("scroll", schedule, { passive: true, signal });
        window.addEventListener("resize", schedule, { signal });
        listening = true;
        schedule();
      } else if (!visible && listening) {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        window.cancelAnimationFrame(frame);
        frame = 0;
        listening = false;
      }
    }, { rootMargin: "80px 0px", threshold: 0 });

    if (mobile.matches) {
      section.querySelectorAll(".project-stage, [data-project-reveal]").forEach((element) => observer.observe(element));
    } else {
      observer.observe(section);
      update();
    }

    dispose = () => {
      controller.abort();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      scenes.forEach((scene) => scene.reset());
    };
  }

  const lifecycle = new AbortController();
  [motion, mobile, pointer].forEach((query) => query.addEventListener("change", setup, { signal: lifecycle.signal }));
  window.addEventListener("pagehide", (event) => {
    dispose();
    if (!event.persisted) lifecycle.abort();
  }, { signal: lifecycle.signal });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) setup();
  }, { signal: lifecycle.signal });
  setup();
})();
