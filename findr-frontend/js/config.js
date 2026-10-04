/* ==========================================================================
   Findr shared config + navigation.
   Every page loads this file first. Plain scripts (no modules) are used so
   the pages also work when opened straight from the file system.
   ========================================================================== */
(function () {
  var Findr = (window.Findr = window.Findr || {});

  Findr.config = {
    campusEmailDomain: "student.oauife.edu.ng", // only emails ending with this are accepted
    mockDelayMs: 900,                           // fake network delay (remove with the mock API)
    maxUploadMB: 5,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  };

  /* Routes are paths relative to the /pages folder.
     Add a line here when a new screen is created, then use data-route="name"
     on a link, or Findr.navigate("name") in JavaScript. */
  Findr.routes = {
    register: "register.html",
    login: "login.html",
    verifyId: "verify-id.html",
    reportItem: "report-item.html", // Report Item screen (coming next)
    home: "../index.html",          // TODO: point to the Dashboard / Browse page once it exists
  };

  Findr.navigate = function (routeName) {
    window.location.href = Findr.routes[routeName] || routeName;
  };
})();
