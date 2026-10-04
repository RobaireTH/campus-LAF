/* Reusable validation rules.
   Each rule takes (value, allValues) and returns "" when valid, or an error message. */
(function () {
  var Findr = (window.Findr = window.Findr || {});

  var EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MATRIC_FORMAT = /^[A-Z]{2,4}\/\d{4}\/\d{3,4}$/i;

  Findr.validators = {
    fullName: function (value) {
      if (!value) return "Enter your full name.";
      if (value.split(/\s+/).length < 2) return "Enter your first and last name.";
      return "";
    },

    /* Login + Register both use the campus email rule. */
    campusEmail: function (value) {
      if (!value) return "Enter your school email.";
      if (!EMAIL_FORMAT.test(value)) return "Enter a valid email address.";
      var domain = Findr.config.campusEmailDomain;
      if (value.toLowerCase().slice(-(domain.length + 1)) !== "@" + domain) {
        return "Use your campus email ending in @" + domain + ".";
      }
      return "";
    },

    matric: function (value) {
      if (!value) return "Enter your matric number.";
      if (!MATRIC_FORMAT.test(value)) return "Use the format CSC/2021/045.";
      return "";
    },

    newPassword: function (value) {
      if (!value) return "Create a password.";
      if (value.length < 8) return "Use at least 8 characters.";
      return "";
    },

    password: function (value) {
      return value ? "" : "Enter your password.";
    },

    mustBeChecked: function (message) {
      return function (value) { return value ? "" : message; };
    },
  };
})();
