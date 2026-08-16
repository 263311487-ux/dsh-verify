// app.js — DSH Team Demo interactivity
// Wire up the two buttons defined in index.html.

(function () {
  'use strict';

  var countBtn = document.getElementById('count-btn');
  var colorBtn = document.getElementById('color-btn');
  var page = document.getElementById('page');

  var count = 0;

  // Increment the counter and update the button label to 'Clicked: N'.
  countBtn.addEventListener('click', function () {
    count += 1;
    countBtn.textContent = 'Clicked: ' + count;
  });

  // Toggle the 'dark' class on the page body.
  colorBtn.addEventListener('click', function () {
    page.classList.toggle('dark');
  });
})();
