/* Verify ID screen behaviour. */
(function () {
  var Findr = window.Findr;
  var form = document.getElementById("verify-form");
  var submitButton = form.querySelector('button[type="submit"]');
  var statusChip = document.getElementById("verify-status");

  var idUpload = Findr.ImageUpload(document.querySelector("[data-upload='id-front']"), {
    requiredMessage: "Add a photo of the front of your student ID.",
  });
  var selfieUpload = Findr.ImageUpload(document.querySelector("[data-upload='selfie']"), {
    requiredMessage: "Add a selfie holding your ID.",
  });

  /* Status labels. The backend will return one of these keys. */
  var STATUSES = {
    not_submitted: { label: "Not submitted", chipClass: "" },
    pending: { label: "Under review", chipClass: "chip--pending" },
    approved: { label: "Verified", chipClass: "chip--success" },
    rejected: { label: "Needs another try", chipClass: "chip--error" },
  };

  function setStatus(key) {
    var status = STATUSES[key];
    statusChip.textContent = status.label;
    statusChip.className = "chip " + status.chipClass;
  }

  var CHECK_ICON =
    '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5l2.3 2.3L9.5 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* After submitting, steps 1 and 2 are done and "Review" becomes the current step. */
  function advanceStepper() {
    var steps = document.querySelectorAll(".step");
    [0, 1].forEach(function (i) {
      steps[i].classList.add("is-done");
      steps[i].removeAttribute("aria-current");
      steps[i].querySelector(".step__dot").innerHTML = CHECK_ICON;
    });
    steps[2].setAttribute("aria-current", "step");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    Findr.ui.hideFormAlert(form);

    var idOk = idUpload.validateRequired();
    var selfieOk = selfieUpload.validateRequired();
    if (!idOk || !selfieOk) {
      (idOk ? selfieUpload : idUpload).focus();
      return;
    }

    Findr.ui.setLoading(submitButton, true, "Submitting…");

    Findr.api
      .submitVerification({ idFront: idUpload.getFile(), selfie: selfieUpload.getFile() })
      .then(function (result) {
        idUpload.lock(true);
        selfieUpload.lock(true);
        setStatus(result.status);
        advanceStepper();
        Findr.ui.setLoading(submitButton, false);
        submitButton.querySelector(".btn__label").textContent = "Submitted for review";
        submitButton.disabled = true;
        Findr.ui.toast("Submitted. An admin will review it within 24 hours.", "success", 5000);
      })
      .catch(function () {
        Findr.ui.setLoading(submitButton, false);
        Findr.ui.showFormAlert(form, "We couldn't submit your photos. Check your connection and try again.");
      });
  });
})();
