/* Общие вспомогательные функции интерфейса: модальные окна, тосты, форматирование. */
(function () {
  var overlay, sheet, toastEl;

  function init() {
    overlay = document.getElementById("modal-overlay");
    sheet = document.getElementById("modal-sheet");
    toastEl = document.getElementById("toast");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
  }

  var closeTimer = null;

  function openModal(html) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    sheet.innerHTML = '<div class="modal-handle"></div>' + html;
    overlay.setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.setAttribute("data-open", "false");
    document.body.style.overflow = "";
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (overlay.getAttribute("data-open") === "false") {
        sheet.innerHTML = "";
      }
      closeTimer = null;
    }, 200);
  }

  var toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.setAttribute("data-show", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.setAttribute("data-show", "false");
    }, 2400);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "субботу"];
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function formatDateLong(dateStr) {
    var d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
    return d.getDate() + " " + MONTHS[d.getMonth()] + ", " + WEEKDAYS[d.getDay()];
  }

  function formatDateShort(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3) + ".";
  }

  function categoryTag(categoryId, opts) {
    opts = opts || {};
    var cat = window.APP_DATA.getCategory(categoryId);
    var size = opts.small ? "0.72rem 0.6rem" : undefined;
    return (
      '<span class="tag" style="background:' +
      cat.colorSoft +
      ";color:" +
      darken(cat.color) +
      '"><span class="tag__dot" style="background:' +
      cat.color +
      '"></span>' +
      escapeHtml(cat.name) +
      "</span>"
    );
  }

  function darken(hex) {
    // грубое затемнение hex-цвета для читаемого текста на мягком фоне
    var c = hex.replace("#", "");
    var r = Math.max(0, parseInt(c.substr(0, 2), 16) - 60);
    var g = Math.max(0, parseInt(c.substr(2, 2), 16) - 60);
    var b = Math.max(0, parseInt(c.substr(4, 2), 16) - 60);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function mediaPlaceholder(label, videoLike) {
    return (
      '<div class="placeholder-media' +
      (videoLike ? " placeholder-video" : "") +
      '">' +
      (videoLike ? window.ICONS.play : window.ICONS.camera) +
      "<span>" +
      escapeHtml(label) +
      "</span></div>"
    );
  }

  function statusTag(status) {
    var map = {
      "Не проверено": { bg: "var(--color-surface-offset)", color: "var(--color-text-muted)" },
      Подтверждено: { bg: "var(--color-success-highlight)", color: "var(--color-success)" },
      "Требует уточнения": { bg: "var(--color-warning-highlight)", color: "var(--color-warning)" }
    };
    var s = map[status] || map["Не проверено"];
    return (
      '<span class="tag" style="background:' + s.bg + ";color:" + s.color + '">' + escapeHtml(status) + "</span>"
    );
  }

  function confirmModal(message, confirmLabel, onConfirm, opts) {
    opts = opts || {};
    openModal(
      '<div class="stack">' +
        '<p class="text-base" style="font-size:var(--text-base);font-weight:600;">' +
        escapeHtml(message) +
        "</p>" +
        '<div class="btn-row">' +
        '<button class="btn btn-secondary" id="confirm-cancel">Отмена</button>' +
        '<button class="btn ' +
        (opts.danger ? "btn-danger" : "btn-primary") +
        '" id="confirm-ok">' +
        escapeHtml(confirmLabel) +
        "</button>" +
        "</div></div>"
    );
    document.getElementById("confirm-cancel").addEventListener("click", closeModal);
    document.getElementById("confirm-ok").addEventListener("click", function () {
      closeModal();
      onConfirm();
    });
  }

  function downloadJSON(obj, filename) {
    try {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      return true;
    } catch (e) {
      toast("Не удалось сохранить файл: " + e.message);
      return false;
    }
  }

  function pickJSONFile(callback) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          callback(null, data);
        } catch (e) {
          callback(e, null);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  window.UI = {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    toast: toast,
    escapeHtml: escapeHtml,
    formatDateLong: formatDateLong,
    formatDateShort: formatDateShort,
    categoryTag: categoryTag,
    mediaPlaceholder: mediaPlaceholder,
    statusTag: statusTag,
    confirmModal: confirmModal,
    downloadJSON: downloadJSON,
    pickJSONFile: pickJSONFile
  };
})();
