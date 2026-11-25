(function () {
  "use strict";

  const form = document.querySelector("#lead-form");
  const status = document.querySelector("#form-status");
  const year = document.querySelector("#year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  if (!form || !status) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const endpoint = window.LANDING_CONFIG && window.LANDING_CONFIG.leadEndpoint;

    if (!endpoint || !endpoint.trim()) {
      status.textContent = "This form is not connected yet. Please configure a lead endpoint before accepting requests.";
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    status.textContent = "Sending your request…";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams(new FormData(form)).toString()
      });

      if (!response.ok) {
        throw new Error("The configured endpoint returned an error.");
      }

      form.reset();
      status.textContent = "Thank you. Your request was sent.";
    } catch (error) {
      status.textContent = "We couldn't send your request. Please try again later or use the published contact details.";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
