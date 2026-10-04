/* Shared UI helpers: toasts, button loading state, form validation, links.
   Anyone can reuse these in other screens. */
(function () {
  var Findr = (window.Findr = window.Findr || {});
  var ui = (Findr.ui = {});

  /* ---------- Toast ---------- */
  var toastRegion = null;

  ui.toast = function (message, type, durationMs) {
    if (!toastRegion) {
      toastRegion = document.createElement("div");
      toastRegion.className = "toast-region";
      toastRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRegion);
    }
    var toast = document.createElement("div");
    toast.className = "toast" + (type ? " toast--" + type : "");
    toast.textContent = message;
    toastRegion.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("is-leaving");
      setTimeout(function () { toast.remove(); }, 250);
    }, durationMs || 4000);
  };

  /* ---------- Button loading state ----------
     Button markup must contain <span class="btn__label">Text</span> */
  ui.setLoading = function (button, isLoading, loadingText) {
    var label = button.querySelector(".btn__label");
    if (isLoading) {
      button.dataset.originalLabel = label.textContent;
      label.textContent = loadingText || "Please wait…";
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      if (button.dataset.originalLabel) label.textContent = button.dataset.originalLabel;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };

  /* ---------- Form-level alert (<div class="form-alert" data-form-alert hidden>) ---------- */
  ui.showFormAlert = function (form, message) {
    var box = form.querySelector("[data-form-alert]");
    box.textContent = message;
    box.hidden = false;
  };
  ui.hideFormAlert = function (form) {
    var box = form.querySelector("[data-form-alert]");
    if (box) { box.hidden = true; box.textContent = ""; }
  };

  /* ---------- Form validation ----------
     const validator = Findr.ui.createFormValidator(form, {
       email: [Findr.validators.campusEmail],
       ...
     });
     validator.validateAll()  -> true/false (focuses the first invalid field)
     validator.setError(name, message) / validator.validateField(name)

     HTML contract for each field "email":
       <input name="email" aria-describedby="email-error">
       <p class="field__hint" data-hint-for="email">…</p>      (optional)
       <p class="field__error" id="email-error" data-error-for="email" hidden></p> */
  ui.createFormValidator = function (form, schema) {
    var touched = {};

    function getValue(name) {
      var el = form.elements[name];
      if (!el) return "";
      if (el.type === "checkbox") return el.checked;
      return typeof el.value === "string" ? el.value.trim() : el.value;
    }

    function getValues() {
      var values = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) values[el.name] = getValue(el.name);
      });
      return values;
    }

    function setError(name, message) {
      var el = form.elements[name];
      var errorEl = form.querySelector('[data-error-for="' + name + '"]');
      var hintEl = form.querySelector('[data-hint-for="' + name + '"]');
      if (message) {
        el.setAttribute("aria-invalid", "true");
        errorEl.textContent = message;
        errorEl.hidden = false;
        if (hintEl) hintEl.hidden = true;
      } else {
        el.removeAttribute("aria-invalid");
        errorEl.textContent = "";
        errorEl.hidden = true;
        if (hintEl) hintEl.hidden = false;
      }
    }

    function validateField(name) {
      var rules = schema[name] || [];
      var values = getValues();
      for (var i = 0; i < rules.length; i++) {
        var message = rules[i](getValue(name), values);
        if (message) { setError(name, message); return false; }
      }
      setError(name, "");
      return true;
    }

    function validateAll() {
      var firstInvalid = null;
      Object.keys(schema).forEach(function (name) {
        touched[name] = true;
        if (!validateField(name) && !firstInvalid) firstInvalid = name;
      });
      if (firstInvalid) form.elements[firstInvalid].focus();
      return !firstInvalid;
    }

    /* Validate a field when the user leaves it, then keep it live while they fix it. */
    form.addEventListener("focusout", function (e) {
      var name = e.target.name;
      if (schema[name]) { touched[name] = true; validateField(name); }
    });
    form.addEventListener("input", function (e) {
      var name = e.target.name;
      if (schema[name] && touched[name]) validateField(name);
    });

    return { validateField: validateField, validateAll: validateAll, setError: setError, getValues: getValues };
  };

  /* ---------- Links: data-route and data-back ---------- */
  function initLinks() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-route]"), function (link) {
      var path = Findr.routes[link.dataset.route];
      if (path) link.setAttribute("href", path);
    });

    // Back button: go back in history if we came from another page, otherwise use the fallback route.
    Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (link) {
      link.addEventListener("click", function (e) {
        if (document.referrer && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initLinks);
})();
