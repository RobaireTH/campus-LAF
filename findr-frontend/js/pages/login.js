/* Login screen behaviour. */
(function () {
  var Findr = window.Findr;
  var form = document.getElementById("login-form");
  var loginButton = form.querySelector('button[type="submit"]');
  var magicButton = document.getElementById("magic-link-button");
  var v = Findr.validators;

  var validator = Findr.ui.createFormValidator(form, {
    email: [v.campusEmail],
    password: [v.password],
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    Findr.ui.hideFormAlert(form);
    if (!validator.validateAll()) return;

    var values = validator.getValues();
    Findr.ui.setLoading(loginButton, true, "Logging in…");

    Findr.api
      .login({ email: values.email.toLowerCase(), password: values.password, remember: values.remember })
      .then(function () {
        Findr.ui.toast("Welcome back!", "success");
        setTimeout(function () { Findr.navigate("home"); }, 900);
      })
      .catch(function (error) {
        Findr.ui.setLoading(loginButton, false);
        if (error.code === "NO_ACCOUNT") {
          Findr.ui.showFormAlert(form, "We couldn't find an account with that email. Check it, or create an account.");
        } else if (error.code === "INVALID_CREDENTIALS") {
          Findr.ui.showFormAlert(form, "That email and password don't match. Try again.");
        } else {
          Findr.ui.showFormAlert(form, "We couldn't log you in. Check your connection and try again.");
        }
      });
  });

  // "Email me a magic link" only needs a valid email.
  magicButton.addEventListener("click", function () {
    Findr.ui.hideFormAlert(form);
    if (!validator.validateField("email")) {
      form.elements.email.focus();
      return;
    }
    var email = validator.getValues().email.toLowerCase();
    Findr.ui.setLoading(magicButton, true, "Sending link…");

    Findr.api
      .requestMagicLink(email)
      .then(function () {
        Findr.ui.setLoading(magicButton, false);
        Findr.ui.toast("Magic link sent to " + email + ". Check your inbox.", "success", 5000);
      })
      .catch(function () {
        Findr.ui.setLoading(magicButton, false);
        Findr.ui.showFormAlert(form, "We couldn't send the link. Check your connection and try again.");
      });
  });

  // Password reset screen is not part of this task yet.
  document.querySelector("[data-action='forgot-password']").addEventListener("click", function (e) {
    e.preventDefault();
    Findr.ui.toast("Password reset isn't available yet.", "info");
  });
})();
