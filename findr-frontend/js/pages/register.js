/* Register screen behaviour. */
(function () {
  var Findr = window.Findr;
  var form = document.getElementById("register-form");
  var submitButton = form.querySelector('button[type="submit"]');
  var v = Findr.validators;

  var validator = Findr.ui.createFormValidator(form, {
    fullName: [v.fullName],
    email: [v.campusEmail],
    matric: [v.matric],
    password: [v.newPassword],
    terms: [v.mustBeChecked("Agree to the Terms and community rules to continue.")],
  });

  // Matric numbers are always written in capitals, e.g. CSC/2021/045
  form.elements.matric.addEventListener("blur", function (e) {
    e.target.value = e.target.value.trim().toUpperCase();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    Findr.ui.hideFormAlert(form);
    if (!validator.validateAll()) return;

    var values = validator.getValues();
    Findr.ui.setLoading(submitButton, true, "Creating account…");

    Findr.api
      .register({
        fullName: values.fullName,
        email: values.email.toLowerCase(),
        matric: values.matric.toUpperCase(),
        faculty: values.faculty,
        password: values.password,
      })
      .then(function () {
        Findr.ui.toast("Account created. Next, verify your student ID.", "success");
        setTimeout(function () { Findr.navigate("verifyId"); }, 1200);
      })
      .catch(function (error) {
        Findr.ui.setLoading(submitButton, false);
        if (error.code === "EMAIL_TAKEN") {
          validator.setError("email", "An account with this email already exists. Try logging in.");
          form.elements.email.focus();
        } else {
          Findr.ui.showFormAlert(form, "We couldn't create your account. Check your connection and try again.");
        }
      });
  });
})();
