/* ==========================================================================
   Image upload component with preview (shared: Verify ID, Report Item).
   Markup: see pages/verify-id.html  (a block with class "upload").
   Usage:
     var upload = Findr.ImageUpload(document.querySelector("[data-upload='id-front']"),
                                    { requiredMessage: "Add a photo." });
     upload.getFile();            -> File or null
     upload.validateRequired();   -> true/false (shows the error message)
     upload.lock(true);           -> disable changes (after submitting)
     upload.clear();
   ========================================================================== */
(function () {
  var Findr = (window.Findr = window.Findr || {});

  Findr.ImageUpload = function (root, options) {
    var opts = Object.assign({
      maxMB: Findr.config.maxUploadMB,
      allowedTypes: Findr.config.allowedImageTypes,
      requiredMessage: "Add a photo.",
      onChange: function () {},
    }, options || {});

    var input = root.querySelector('input[type="file"]');
    var zone = root.querySelector(".upload__zone");
    var preview = root.querySelector(".upload__preview");
    var emptyState = root.querySelector(".upload__empty");
    var changeTag = root.querySelector(".upload__change");
    var removeButton = root.querySelector(".upload__remove");
    var errorEl = root.querySelector(".upload__error");

    var file = null;
    var previewUrl = null;

    function setError(message) {
      root.classList.toggle("has-error", Boolean(message));
      errorEl.textContent = message || "";
      errorEl.hidden = !message;
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }

    function checkFile(candidate) {
      if (opts.allowedTypes.indexOf(candidate.type) === -1) return "Use a JPG, PNG or WebP photo.";
      if (candidate.size > opts.maxMB * 1024 * 1024) return "That photo is over " + opts.maxMB + " MB. Choose a smaller one.";
      return "";
    }

    function releasePreview() {
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    }

    function setFile(candidate) {
      var problem = checkFile(candidate);
      if (problem) { input.value = ""; setError(problem); return; }

      releasePreview();
      file = candidate;
      previewUrl = URL.createObjectURL(candidate);
      preview.src = previewUrl;
      preview.hidden = false;
      emptyState.hidden = true;
      changeTag.hidden = false;
      removeButton.hidden = false;
      root.classList.add("has-file");
      setError("");
      opts.onChange(file);
    }

    function clear() {
      releasePreview();
      file = null;
      input.value = "";
      preview.removeAttribute("src");
      preview.hidden = true;
      emptyState.hidden = false;
      changeTag.hidden = true;
      removeButton.hidden = true;
      root.classList.remove("has-file");
      opts.onChange(null);
    }

    input.addEventListener("change", function () {
      if (input.files && input.files[0]) setFile(input.files[0]);
    });

    removeButton.addEventListener("click", function () {
      clear();
      input.focus();
    });

    // Drag and drop (desktop)
    ["dragenter", "dragover"].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); root.classList.add("is-dragover"); });
    });
    ["dragleave", "drop"].forEach(function (type) {
      zone.addEventListener(type, function () { root.classList.remove("is-dragover"); });
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });

    return {
      getFile: function () { return file; },
      clear: clear,
      validateRequired: function () {
        if (file) return true;
        setError(opts.requiredMessage);
        return false;
      },
      lock: function (isLocked) {
        root.classList.toggle("is-locked", isLocked);
        input.disabled = isLocked;
      },
      focus: function () { input.focus(); },
    };
  };
})();
