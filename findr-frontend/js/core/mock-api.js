/* ==========================================================================
   MOCK API  —  FRONTEND ONLY
   This file pretends to be the backend so the screens can be tested.
   When the real API exists, replace the body of each function with a fetch()
   call and keep the same inputs/outputs, so the screens need no changes.

   Mock data lives in localStorage under "findr.mock.*".
   Passwords are NOT stored and NOT checked here. The real backend must hash and verify them.
   Reset everything while testing:  Findr.api.reset()  in the browser console.
   ========================================================================== */
(function () {
  var Findr = (window.Findr = window.Findr || {});

  var USERS_KEY = "findr.mock.users";
  var SESSION_KEY = "findr.mock.session";

  // Demo account taken from the Figma login screen, so you can log in right away.
  var DEMO_USERS = [
    { fullName: "Tobi Adeyemi", email: "tobi.a@student.oauife.edu.ng", matric: "CSC/2021/045", faculty: "Technology" },
  ];

  function wait() {
    return new Promise(function (resolve) { setTimeout(resolve, Findr.config.mockDelayMs); });
  }

  function fail(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function readUsers() {
    try {
      var saved = JSON.parse(localStorage.getItem(USERS_KEY));
      return saved || DEMO_USERS.slice();
    } catch (e) {
      return DEMO_USERS.slice();
    }
  }

  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  function findUser(email) {
    var wanted = email.toLowerCase();
    return readUsers().filter(function (u) { return u.email.toLowerCase() === wanted; })[0];
  }

  function startSession(email, remember) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    // "Remember me" keeps the session after the browser closes.
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ email: email }));
  }

  Findr.api = {
    /* POST /auth/register   body: { fullName, email, matric, faculty, password }
       Rejects with code "EMAIL_TAKEN" when the account already exists. */
    register: function (data) {
      return wait().then(function () {
        if (findUser(data.email)) throw fail("EMAIL_TAKEN", "An account with this email already exists.");
        var users = readUsers();
        users.push({ fullName: data.fullName, email: data.email, matric: data.matric, faculty: data.faculty });
        saveUsers(users);
        startSession(data.email, true);
        return { email: data.email };
      });
    },

    /* POST /auth/login   body: { email, password, remember }
       Rejects with "NO_ACCOUNT" or "INVALID_CREDENTIALS". */
    login: function (data) {
      return wait().then(function () {
        if (!findUser(data.email)) throw fail("NO_ACCOUNT", "No account found for that email.");
        startSession(data.email, data.remember);
        return { email: data.email };
      });
    },

    /* POST /auth/magic-link   body: { email }
       A real backend should reply the same way whether or not the account exists. */
    requestMagicLink: function (email) {
      return wait().then(function () { return { sent: true, email: email }; });
    },

    /* POST /verification   multipart form-data: idFront (file), selfie (file)
       Resolves with the review status. Possible statuses: pending, approved, rejected. */
    submitVerification: function (files) {
      return wait().then(function () {
        if (!files.idFront || !files.selfie) throw fail("MISSING_FILES", "Both photos are required.");
        return { status: "pending" };
      });
    },

    reset: function () {
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    },
  };
})();
