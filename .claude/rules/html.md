# HTML — Semantic Structure

## Document Structure

- Use semantic landmarks: <header>, <main>, <footer>, <nav>, <aside>
- Single <main> per page
- Use <article> for self-contained, syndicatable content
- Use <section> with headings for thematic grouping

## Headings

- Single <h1> per page (matches <title>)
- Strict hierarchy: h1 → h2 → h3 — never skip levels
- Headings describe content, not style

## Images

- All <img> must have an alt attribute
- Decorative images: alt="" (empty, not missing)
- Always provide width and height attributes (prevents CLS)
- Use <picture> with srcset for responsive images

## Forms

- Every <input> linked to a <label> (via for/id or nesting)
- Use appropriate type attributes: email, tel, url, number, search
- Add autocomplete attributes for common fields
- Group related fields with <fieldset> + <legend>

## Links & Buttons

- <a> for navigation, <button> for actions — never swap
- External links: rel="noopener noreferrer"
- Descriptive text — never "click here"

## Tables

- Use <thead>, <tbody>, <th scope="col|row">
- <caption> for table description
- Never use tables for layout
