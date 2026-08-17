Build a single-file signup form in `index.html` (all CSS and JS inline, no external libraries, no network requests).

Required element IDs (exact):
- `#name` — text input
- `#email` — email input
- `#password` — password input
- `#submit` — submit button (type submit, inside a form)
- The form element must have the `novalidate` attribute — your JS is the validator, not the browser
- `#err-name`, `#err-email`, `#err-password` — error spans, empty and hidden by default
- `#success` — success message element, hidden by default

Validation rules (validate on submit; clear a field's own error when the user fixes that field):
- name: required → error text "Name is required"
- email: required and must look like an email address (contains "@" with text before and after) → error text "Enter a valid email address"
- password: at least 8 characters → error text "Password must be at least 8 characters"

Behaviors:
- On submit, prevent the default page reload; show each field's error if invalid
- If everything is valid: hide all errors and show #success with the text "Account created"

Keep it clean, self-contained, and working. Do not add anything not asked for.
