"""Render the static project section: python3 scripts/render_projects.py [--check]."""

import argparse
import json
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
START = "        <!-- projects:start -->"
END = "        <!-- projects:end -->"


def shared_laptop():
    return '''        <div class="projects-visual" hidden>
          <figure class="project-laptop">
            <div class="laptop-body">
              <div class="laptop-lid">
                <span class="laptop-camera" aria-hidden="true"></span>
                <div class="laptop-screen"></div>
              </div>
              <div class="laptop-hinge" aria-hidden="true"></div>
              <div class="laptop-base" aria-hidden="true"><span class="laptop-notch"></span></div>
            </div>
            <figcaption><span data-laptop-caption></span><span>Captura do projeto</span></figcaption>
          </figure>
        </div>'''


def project_capture(project):
    image = project["image"]
    attrs = " ".join(f'{key}="{escape(value, quote=True)}"' for key, value in image.items())
    name = escape(project["name"])
    project_id = escape(project["id"], quote=True)
    return f'''          <figure class="project-stage">
            <div class="project-capture project-capture-{project_id}">
              <img {attrs} sizes="(max-width: 1000px) 90vw, 55vw" loading="lazy" decoding="async">
            </div>
            <figcaption><span>{name}</span><span>Captura do projeto</span></figcaption>
          </figure>'''


def project_actions(project):
    name = escape(project["name"], quote=True)
    project_id = escape(project["id"], quote=True)
    if project["demo"]:
        demo = f'<a class="button button-primary" href="{escape(project["demo"], quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="Ver projeto: {name}">Ver projeto <span aria-hidden="true">↗</span></a>'
        note = ""
    else:
        demo = f'<button class="button project-demo-unavailable" type="button" disabled aria-describedby="{project_id}-demo-note">Ver projeto <span aria-hidden="true">↗</span></button>'
        note = f'<p class="project-demo-note" id="{project_id}-demo-note">Demonstração ainda não publicada.</p>'
    return f'''            <div class="project-action-group" data-project-reveal>
              <div class="project-actions">
                {demo}
                <a class="button button-secondary" href="{escape(project["code"], quote=True)}" target="_blank" rel="noopener noreferrer" aria-label="Ver código: {name}">Ver código <span aria-hidden="true">↗</span></a>
              </div>
              {note}
            </div>'''


def project_scene(project, index, total):
    project_id = escape(project["id"], quote=True)
    featured = ' project-scene-featured' if project["featured"] else ""
    label = "Projeto em destaque" if project["featured"] else "Projeto selecionado"
    status = f'<p class="project-status"><span class="availability-dot" aria-hidden="true"></span>{escape(project["status"])}</p>' if project["status"] else ""
    description = f'<p class="project-description">{escape(project["description"])}</p>' if project["description"] else ""
    technologies = "".join(f'<li>{escape(tech)}</li>' for tech in project["technologies"])
    return f'''        <article class="project-scene project-scene-{project_id}{featured}" aria-labelledby="{project_id}-title">
          <div class="project-light" aria-hidden="true"></div>
{project_capture(project)}
          <div class="project-copy">
            <div class="project-scene-heading"><span>{index:02d} / {total:02d}</span><span>{label}</span></div>
            <p class="overline" data-project-reveal>{escape(project["category"])}</p>
            <div data-project-reveal>
              <h3 id="{project_id}-title" tabindex="-1">{escape(project["name"])}</h3>
              {status}
            </div>
            <div data-project-reveal>
              <p class="project-summary">{escape(project["summary"])}</p>
              {description}
            </div>
            <ul class="technology-list" aria-label="Tecnologias: {escape(project["name"], quote=True)}" data-project-reveal>{technologies}</ul>
{project_actions(project)}
          </div>
        </article>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the HTML differs from the project data")
    args = parser.parse_args()
    projects = json.loads((ROOT / "data/projects.json").read_text())
    path = ROOT / "index.html"
    html = path.read_text()
    before, remainder = html.split(START, 1)
    _, after = remainder.split(END, 1)
    rendered = "\n\n".join([shared_laptop(), *(project_scene(project, index, len(projects)) for index, project in enumerate(projects, 1))])
    rendered = "\n".join(line.rstrip() for line in rendered.splitlines())
    updated = f"{before}{START}\n{rendered}\n{END}{after}"
    if args.check:
        if updated != html:
            raise SystemExit("Projects are out of date. Run python3 scripts/render_projects.py")
        print(f"OK: {len(projects)} projects match their source data.")
    else:
        path.write_text(updated)


if __name__ == "__main__":
    main()
