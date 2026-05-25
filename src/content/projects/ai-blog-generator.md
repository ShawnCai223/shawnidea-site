---
title: 'AI Blog Generator'
description: 'A simplified AI-powered content generator built with Flask and OpenAI.'
pubDate: '2025-07-02'
heroImage: '/projects/ai-blog.jpg'
languages: ['JavaScript', 'Python', 'HTML', 'Shell']
stack: ['OpenAI API', 'Flask', 'JavaScript']
github: 'https://github.com/ShawnCai223/ai-blog-generator'
demo: ''
---

## Overview

AI Blog Generator is a web app that uses OpenAI's API to generate blog posts from a topic prompt. You type in a subject, pick a tone, and the app returns a structured article complete with headings and body copy.

The project started as an experiment to understand how to wire a language model into a real product UI. The goal was simplicity: a single-page interface, a Flask backend, and a clean hand-off to the OpenAI completion endpoint.

## Features

- Prompt-to-post generation in seconds
- Adjustable tone: professional, casual, technical
- Markdown output with copy-to-clipboard
- Lightweight Flask API with no database dependency

## Tech Stack

- **Python / Flask** — REST API layer handling prompt construction and OpenAI calls
- **OpenAI API** — GPT-4o for text generation
- **JavaScript** — Vanilla JS frontend, no build step required
- **Shell** — Setup and environment scripts

## Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/ShawnCai223/ai-blog-generator.git
cd ai-blog-generator
pip install -r requirements.txt
```

Add your OpenAI key to a `.env` file:

```bash
OPENAI_API_KEY=sk-...
```

Run the server:

```bash
flask run
```

Open `http://localhost:5000` in your browser.
