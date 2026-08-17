Build a single-file todo app in `index.html` (all CSS and JS inline, no external libraries, no network requests).

Required element IDs (exact):
- `#new-todo` — text input for the new todo
- `#add-todo` — button that adds the todo
- `#remaining` — span showing exactly "N remaining" (e.g. "3 remaining")
- `#todo-list` — ul containing all todos

Each todo item must be an `<li class="todo">` containing:
- a checkbox `input.toggle`
- a span with the todo text
- a button `.delete` (text "×" or "Delete")

Behaviors:
- On first load, seed exactly three todos: "Buy milk", "Walk dog", "Write report"
- Adding: append item, clear the input, update #remaining
- Toggling a checkbox adds/removes the class `done` on the li (with strikethrough styling)
- Deleting removes the li
- `#remaining` = number of unchecked todos
- Persist items and checked state in localStorage under key `todos`; restore on load

Keep it clean, self-contained, and working. Do not add anything not asked for.
