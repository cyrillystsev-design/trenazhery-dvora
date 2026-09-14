/* Раздел «Карта»: схема площадки, режим настройки, режим проверки во дворе. */
(function () {
  function pointColor(point) {
    var trainer = point.trainerId ? window.APP_DATA.getTrainer(point.trainerId) : null;
    var cat = window.APP_DATA.getCategory(trainer ? trainer.category : "universal");
    return cat.color;
  }

  function pointsGrid(points, state) {
    var highlightSet = state.highlightTrainerIds || [];
    return points
      .map(function (p) {
        var trainer = p.trainerId ? window.APP_DATA.getTrainer(p.trainerId) : null;
        var dim = state.filterCategory && state.filterCategory !== "all" && trainer && trainer.category !== state.filterCategory;
        var isHighlight = trainer && highlightSet.indexOf(trainer.id) !== -1;
        var routeIndex = state.routeActive && isHighlight ? highlightSet.indexOf(trainer.id) + 1 : null;
        return (
          '<button class="map-point" style="left:' +
          p.x +
          "%;top:" +
          p.y +
          "%;background:" +
          pointColor(p) +
          ";opacity:" +
          (dim ? 0.25 : 1) +
          '" data-action="open-point" data-point="' +
          p.pointNumber +
          '" data-highlight="' +
          !!isHighlight +
          '" data-unverified="' +
          (p.status !== "Подтверждено") +
          '" aria-label="Место ' +
          p.pointNumber +
          '">' +
          p.pointNumber +
          (routeIndex ? '<span style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--color-text);color:#fff;font-size:10px;display:grid;place-items:center;border:2px solid #fff;">' + routeIndex + "</span>" : "") +
          "</button>"
        );
      })
      .join("");
  }

  function routeLinesSvg(points, state) {
    if (!state.routeActive || !state.highlightTrainerIds || state.highlightTrainerIds.length < 2) return "";
    var coords = state.highlightTrainerIds
      .map(function (tid) {
        var p = points.find(function (pt) {
          return pt.trainerId === tid;
        });
        return p ? p : null;
      })
      .filter(Boolean);
    var pathD = coords
      .map(function (p, i) {
        return (i === 0 ? "M" : "L") + p.x + "," + p.y;
      })
      .join(" ");
    return (
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">' +
      '<path d="' +
      pathD +
      '" fill="none" stroke="var(--color-primary)" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.7"/>' +
      "</svg>"
    );
  }

  function legendHtml(state) {
    var cats = window.APP_DATA.categories;
    return (
      '<div class="chip-scroll">' +
      '<button class="chip" aria-pressed="' +
      (!state.filterCategory || state.filterCategory === "all") +
      '" data-action="map-filter" data-value="all">Все группы</button>' +
      cats
        .map(function (c) {
          return (
            '<button class="chip" aria-pressed="' +
            (state.filterCategory === c.id) +
            '" data-action="map-filter" data-value="' +
            c.id +
            '"><span class="tag__dot" style="background:' +
            c.color +
            ';margin-right:6px;display:inline-block"></span>' +
            UI.escapeHtml(c.name) +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function render(state) {
    var points = state.points;
    var verifiedCount = points.filter(function (p) {
      return p.status === "Подтверждено";
    }).length;
    var lastUpdate = points.reduce(function (max, p) {
      return p.updatedAt > max ? p.updatedAt : max;
    }, "2000-01-01");

    var editBar = state.editMode
      ? '<div class="card" style="margin-bottom:var(--space-4)"><div class="section-title">Режим «Настроить карту»</div>' +
        '<p class="text-sm muted" style="margin-bottom:var(--space-3)">Нажмите на точку, чтобы изменить тренажёр, номер или подпись. Перетаскивайте точки пальцем, чтобы изменить положение.</p>' +
        '<div class="btn-row">' +
        '<button class="btn btn-secondary btn-sm" data-action="map-undo">' + window.ICONS.undo + " Отменить</button>" +
        '<button class="btn btn-secondary btn-sm" data-action="map-reset">' + window.ICONS.reset + " Сбросить</button>" +
        '<button class="btn btn-secondary btn-sm" data-action="map-add-point">' + window.ICONS.plus + " Добавить точку</button>" +
        "</div>" +
        '<div class="btn-row" style="margin-top:var(--space-2)">' +
        '<button class="btn btn-secondary btn-sm" data-action="map-export">' + window.ICONS.download + " Экспорт схемы</button>" +
        '<button class="btn btn-secondary btn-sm" data-action="map-import">' + window.ICONS.upload + " Импорт схемы</button>" +
        "</div>" +
        '<button class="btn btn-primary" style="margin-top:var(--space-3)" data-action="map-edit-done">Готово</button>' +
        "</div>"
      : "";

    var checkBar = state.checkMode ? checkCardHtml(state) : "";

    return (
      '<h1 class="page-title">Карта площадки</h1>' +
      '<div class="banner banner-warning" style="margin-bottom:var(--space-4)">' +
      window.ICONS.warn +
      "<div>Исходная схема предварительная и может содержать ошибки. Уточняйте номера и положение тренажёров в режиме «Проверка во дворе».</div></div>" +
      editBar +
      checkBar +
      legendHtml(state) +
      '<div class="map-wrap" id="map-wrap" style="margin-top:var(--space-3)">' +
      routeLinesSvg(points, state) +
      pointsGrid(points, state) +
      "</div>" +
      '<div class="map-status-line">' +
      "<span>Обновлено: " +
      UI.formatDateShort(lastUpdate) +
      "</span>" +
      "<span>Проверено: " +
      verifiedCount +
      " из " +
      points.length +
      "</span>" +
      "</div>" +
      '<div class="btn-row" style="margin-top:var(--space-4)">' +
      (state.routeActive
        ? '<button class="btn btn-secondary" data-action="toggle-route">Скрыть маршрут</button>'
        : '<button class="btn btn-secondary" data-action="toggle-route">' + window.ICONS.route + " Показать маршрут</button>") +
      (state.checkMode
        ? '<button class="btn btn-secondary" data-action="check-stop">Завершить проверку</button>'
        : '<button class="btn btn-secondary" data-action="check-start">Проверка во дворе</button>') +
      (state.editMode ? "" : '<button class="btn btn-secondary" data-action="map-edit-start">' + window.ICONS.settings + " Настроить карту</button>") +
      "</div>"
    );
  }

  function checkCardHtml(state) {
    var point = state.checkPoints[state.checkIndex];
    if (!point) {
      return (
        '<div class="card" style="margin-bottom:var(--space-4);text-align:center;">' +
        "<p>Проверка завершена. Спасибо!</p>" +
        '<button class="btn btn-primary" style="margin-top:var(--space-3)" data-action="check-stop">Готово</button>' +
        "</div>"
      );
    }
    var trainer = point.trainerId ? window.APP_DATA.getTrainer(point.trainerId) : null;
    return (
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div class="faint text-xs">Проверка во дворе · точка ' +
      (state.checkIndex + 1) +
      " из " +
      state.checkPoints.length +
      "</div>" +
      '<h3 style="margin:var(--space-2) 0">Место № ' +
      point.pointNumber +
      "</h3>" +
      (trainer
        ? '<p class="text-sm">Предполагаемый тренажёр: <strong>' + UI.escapeHtml(trainer.name) + "</strong> (" + UI.escapeHtml(trainer.code) + ")</p>"
        : '<p class="text-sm muted">Тренажёр для этой точки не назначен.</p>') +
      '<div class="btn-row" style="margin-top:var(--space-3)">' +
      '<button class="btn btn-primary" data-action="check-correct">Верно</button>' +
      '<button class="btn btn-secondary" data-action="check-fix" data-point="' +
      point.pointNumber +
      '">Исправить</button>' +
      "</div></div>"
    );
  }

  function pointEditorModal(point, opts) {
    var trainer = point.trainerId ? window.APP_DATA.getTrainer(point.trainerId) : null;
    var html =
      '<div class="modal-head"><h3>Точка № ' +
      point.pointNumber +
      '</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      (trainer
        ? '<p class="text-sm muted" style="margin-bottom:var(--space-3)">Сейчас: ' + UI.escapeHtml(trainer.name) + " (" + UI.escapeHtml(trainer.code) + ")</p>"
        : '<p class="text-sm muted" style="margin-bottom:var(--space-3)">Тренажёр не назначен</p>') +
      '<label class="field-label">Подпись точки</label>' +
      '<input class="field-input" id="editor-label" value="' +
      UI.escapeHtml(point.label || "") +
      '" style="margin-bottom:var(--space-4)">' +
      '<label class="field-label">Номер места</label>' +
      '<input class="field-input" id="editor-number" type="number" value="' +
      point.pointNumber +
      '" style="margin-bottom:var(--space-4)">' +
      '<div class="section-title">Назначить тренажёр</div>' +
      '<div class="stack-sm" style="max-height:220px;overflow-y:auto;margin-bottom:var(--space-4)">' +
      window.APP_DATA.trainers
        .map(function (t) {
          return (
            '<button class="btn btn-secondary btn-sm" style="justify-content:flex-start" data-assign="' +
            t.id +
            '">' +
            UI.escapeHtml(t.name) +
            " · " +
            UI.escapeHtml(t.code) +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="btn-row">' +
      '<button class="btn btn-secondary" id="editor-swap">Поменять местами</button>' +
      '<button class="btn btn-danger" id="editor-delete">Удалить точку</button>' +
      "</div>" +
      '<button class="btn btn-primary" id="editor-save" style="margin-top:var(--space-3)">Сохранить</button>';
    UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", UI.closeModal);
    var assignedId = point.trainerId;
    Array.prototype.forEach.call(document.querySelectorAll("[data-assign]"), function (btn) {
      btn.addEventListener("click", function () {
        assignedId = btn.getAttribute("data-assign");
        UI.toast("Выбран тренажёр: " + window.APP_DATA.getTrainer(assignedId).name);
      });
    });
    document.getElementById("editor-save").addEventListener("click", function () {
      var label = document.getElementById("editor-label").value.trim();
      var number = parseInt(document.getElementById("editor-number").value, 10) || point.pointNumber;
      UI.closeModal();
      opts.onSave({ trainerId: assignedId, label: label, pointNumber: number });
    });
    document.getElementById("editor-delete").addEventListener("click", function () {
      UI.closeModal();
      opts.onDelete();
    });
    document.getElementById("editor-swap").addEventListener("click", function () {
      opts.onSwapRequest();
    });
  }

  function swapPickerModal(points, excludeId, onPick) {
    var html =
      '<div class="modal-head"><h3>Поменять с точкой</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<div class="stack-sm" style="max-height:320px;overflow-y:auto">' +
      points
        .filter(function (p) {
          return p.id !== excludeId;
        })
        .map(function (p) {
          var t = p.trainerId ? window.APP_DATA.getTrainer(p.trainerId) : null;
          return (
            '<button class="btn btn-secondary btn-sm" style="justify-content:flex-start" data-point="' +
            p.id +
            '">№' +
            p.pointNumber +
            " — " +
            (t ? UI.escapeHtml(t.name) : "пусто") +
            "</button>"
          );
        })
        .join("") +
      "</div>";
    UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", UI.closeModal);
    Array.prototype.forEach.call(document.querySelectorAll("[data-point]"), function (btn) {
      btn.addEventListener("click", function () {
        UI.closeModal();
        onPick(btn.getAttribute("data-point"));
      });
    });
  }

  function addPointModal(onAdd) {
    var html =
      '<div class="modal-head"><h3>Новая точка</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<label class="field-label">Номер места</label>' +
      '<input class="field-input" id="new-number" type="number" style="margin-bottom:var(--space-4)">' +
      '<div class="section-title">Тренажёр</div>' +
      '<div class="stack-sm" style="max-height:220px;overflow-y:auto;margin-bottom:var(--space-4)">' +
      window.APP_DATA.trainers
        .map(function (t) {
          return '<button class="btn btn-secondary btn-sm" style="justify-content:flex-start" data-assign="' + t.id + '">' + UI.escapeHtml(t.name) + "</button>";
        })
        .join("") +
      "</div>" +
      '<button class="btn btn-primary" id="add-confirm" disabled>Добавить</button>';
    UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", UI.closeModal);
    var chosen = null;
    var confirmBtn = document.getElementById("add-confirm");
    Array.prototype.forEach.call(document.querySelectorAll("[data-assign]"), function (btn) {
      btn.addEventListener("click", function () {
        chosen = btn.getAttribute("data-assign");
        confirmBtn.disabled = false;
        UI.toast("Выбран: " + window.APP_DATA.getTrainer(chosen).name);
      });
    });
    confirmBtn.addEventListener("click", function () {
      var num = parseInt(document.getElementById("new-number").value, 10);
      if (!num || !chosen) return;
      UI.closeModal();
      onAdd({ pointNumber: num, trainerId: chosen });
    });
  }

  window.ViewMap = {
    render: render,
    pointEditorModal: pointEditorModal,
    swapPickerModal: swapPickerModal,
    addPointModal: addPointModal
  };
})();
