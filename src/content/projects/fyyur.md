---
title: "Fyyur"
description: "A musical venue and artist booking site that facilitates the discovery and bookings of shows between local performing artists and venues."
pubDate: '2026-05-25'
heroImage: ''
languages: ["Python"]
stack: ["Flask", "PostgreSQL", "SQLAlchemy"]
github: "https://github.com/ShawnCai223/fyyur"
role: "Full-stack"
glyph: "Fy"
---

## Overview
Fyyur is a fullstack booking platform connecting local performing artists with venues. Venue managers can list their spaces, artists can create profiles, and shows can be booked between them.
This was a Udacity Full Stack Web Developer project, built to practice database modeling, migrations, and server-rendered HTML with Flask and SQLAlchemy.
## Features
- Artist and venue profile pages
- Show scheduling and listing
- Search by artist name or venue
- Form-based CRUD for venues, artists, and shows
## Tech Stack
- **Python / Flask** — Backend routing and template rendering
- **PostgreSQL** — Relational database for artists, venues, and shows
- **SQLAlchemy** — ORM with Alembic migrations
- **Jinja2** — Server-side HTML templating
## Setup
Clone and install:
```bash
git clone https://github.com/ShawnCai223/fyyur.git
cd fyyur
pip install -r requirements.txt
```
Set up the database:
```bash
createdb fyyur
flask db upgrade
```
Run the app:
```bash
flask run
```
Open `http://localhost:5000`.
