/* Раздел «Сегодня»: план на день, действия с планом, отметка самочувствия. */
(function () {
  var RESOURCE_OPTIONS = [
    { id: "low", name: "Низкий ресурс" },
    { id: "normal", name: "Нормальный ресурс" },
    { id: "high", name: "Высокий ресурс" }
  ];
  var MODE_OPTIONS = [
    { id: "one", name: "Один блок" },
    { id: "two", name: "Два блока" },
    { id: "three", name: "Три блока" },
    { id: "light_mode", name: "Лёгкий день" }
  ];

  function exerciseCardHtml(ex) {
    var isActivity = ex.type === "activity";
    var pointBtn = "";
    if (!isActivity && ex.pointNumber) {
      pointBtn =
        '<button class="btn btn-secondary btn-sm" data-action="show-map" data-order="' +
        ex.order +
        '">' +
        window.ICONS.map +
        " Показать на карте</button>";
    }
    var techBtn = !isActivity
      ? '<button class="btn btn-secondary btn-sm" data-action="show-technique" data-trainer="' +
        ex.trainerId +
        '">' +
        window.ICONS.book +
        " Открыть технику</button>"
      : "";
    var swapBtn = !isActivity
      ? '<button class="btn btn-secondary btn-sm" data-action="swap-exercise" data-order="' +
        ex.order +
        '">' +
        window.ICONS.swap +
        " Заменить</button>"
      : "";

    var metaBits = [];
    if (!isActivity) {
      metaBits.push(UI.categoryTag(ex.category));
      metaBits.push('<span>' + (ex.plannedSets || 0) + " × " + ex.plannedReps + "</span>");
      metaBits.push('<span>' + window.ICONS.clock + " " + ex.rest + "</span>");
      if (ex.block) metaBits.push("<span>" + UI.escapeHtml(ex.block) + "</span>");
      if (ex.pointNumber) metaBits.push("<span>Место № " + ex.pointNumber + "</span>");
    } else {
      metaBits.push('<span class="tag" style="background:var(--color-surface-offset)">' + UI.escapeHtml(ex.note || "") + "</span>");
      if (ex.block) metaBits.push("<span>" + UI.escapeHtml(ex.block) + "</span>");
    }

    return (
      '<div class="exercise-card" data-order="' +
      ex.order +
      '">' +
      '<div class="exercise-card__head">' +
      '<div style="display:flex;gap:var(--space-3);align-items:flex-start;min-width:0;">' +
      '<div class="exercise-card__order">' +
      ex.order +
      "</div>" +
      '<div style="min-width:0;">' +
      '<div class="exercise-card__title">' +
      UI.escapeHtml(ex.name) +
      "</div>" +
      (ex.code ? '<div class="exercise-card__code">' + UI.escapeHtml(ex.code) + "</div>" : "") +
      "</div></div>" +
      "</div>" +
      '<div class="exercise-card__meta">' +
      metaBits.join("") +
      "</div>" +
      (isActivity
        ? ""
        : '<div class="exercise-card__fields">' +
          '<div><span class="field-label">Сопротивление</span><input class="field-input" data-field="resistance" data-order="' +
          ex.order +
          '" placeholder="напр. 3" value="' +
          UI.escapeHtml(ex.resistance || "") +
          '" inputmode="decimal"></div>' +
          '<div><span class="field-label">Заметка</span><input class="field-input" data-field="note" data-order="' +
          ex.order +
          '" placeholder="коротко" value="' +
          UI.escapeHtml(ex.note || "") +
          '"></div>' +
          "</div>") +
      '<div class="done-toggle">' +
      '<button class="switch" role="switch" aria-checked="' +
      !!ex.done +
      '" data-action="toggle-done" data-order="' +
      ex.order +
      '" aria-label="Выполнено"></button>' +
      "<span>" +
      (ex.done ? "Выполнено" : "Отметить как выполненное") +
      "</span>" +
      "</div>" +
      '<div class="exercise-card__actions">' +
      pointBtn +
      techBtn +
      swapBtn +
      "</div>" +
      "</div>"
    );
  }

  function groupByBlock(exercises) {
    var order = [];
    var groups = {};
    exercises.forEach(function (ex) {
      var key = ex.block || "Тренировка";
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(ex);
    });
    return { order: order, groups: groups };
  }

  function render(plan, settings) {
    var statusLabel = window.Planner.planStatusLabel(plan.status);
    var resourceChips = RESOURCE_OPTIONS.map(function (o) {
      return (
        '<button class="chip" aria-pressed="' +
        (settings.resource === o.id) +
        '" data-action="set-resource" data-value="' +
        o.id +
        '">' +
        o.name +
        "</button>"
      );
    }).join("");
    var modeChips = MODE_OPTIONS.map(function (o) {
      return (
        '<button class="chip" aria-pressed="' +
        (settings.mode === o.id) +
        '" data-action="set-mode" data-value="' +
        o.id +
        '">' +
        o.name +
        "</button>"
      );
    }).join("");

    var grouped = groupByBlock(plan.exercises);
    var blocksHtml = grouped.order
      .map(function (key) {
        var list = grouped.groups[key];
        var showLabel = plan.mode === "two" || plan.mode === "three";
        return (
          (showLabel ? '<div class="section-title" style="margin-top:var(--space-6)">' + UI.escapeHtml(key) + "</div>" : "") +
          list.map(exerciseCardHtml).join("")
        );
      })
      .join("");

    return (
      '<div class="banner banner-warning" style="margin-bottom:var(--space-4)">' +
      window.ICONS.warn +
      '<div>Информация носит справочный характер. Начинайте с умеренной нагрузки, контролируйте технику и не выполняйте движения через боль. При травмах, хронических заболеваниях, необычной одышке, головокружении, сильной или сохраняющейся боли обратитесь к врачу или квалифицированному специалисту.</div>' +
      "</div>" +
      '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3)">' +
      "<div>" +
      '<div class="faint text-xs">' +
      UI.formatDateLong(plan.date) +
      "</div>" +
      '<h1 class="page-title" style="margin:0.2rem 0 0.4rem;">' +
      UI.escapeHtml(plan.focusName) +
      "</h1>" +
      "</div>" +
      '<span class="status-pill" data-status="' +
      plan.status +
      '">' +
      statusLabel +
      "</span>" +
      "</div>" +
      '<div class="metrics-row" style="margin-top:var(--space-4)">' +
      '<div class="metric"><strong>' +
      plan.exerciseCount +
      "</strong><span>упражнений</span></div>" +
      '<div class="metric"><strong>' +
      plan.totalSets +
      "</strong><span>подходов</span></div>" +
      '<div class="metric"><strong>' +
      (MODE_OPTIONS.find(function (m) {
        return m.id === plan.mode;
      }) || {}).name +
      "</strong><span>режим дня</span></div>" +
      "</div>" +
      "</div>" +
      '<div class="card">' +
      '<div class="section-title">Самочувствие сегодня</div>' +
      '<div class="chip-group">' +
      resourceChips +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="section-title">Режим дня</div>' +
      '<div class="chip-group">' +
      modeChips +
      "</div>" +
      "</div>" +
      '<div class="btn-row" style="margin:var(--space-4) 0">' +
      '<button class="btn btn-primary" data-action="start-plan">Начать план</button>' +
      '<button class="btn btn-secondary" data-action="show-route">' +
      window.ICONS.route +
      " Маршрут на карте</button>" +
      "</div>" +
      '<div class="chip-scroll" style="margin-bottom:var(--space-5)">' +
      '<button class="chip" data-action="shorter">Сделать короче</button>' +
      '<button class="chip" data-action="lighter">Сделать легче</button>' +
      '<button class="chip" data-action="intense">Сделать интенсивнее</button>' +
      '<button class="chip" data-action="other-focus">Сформировать другой фокус</button>' +
      '<button class="chip" data-action="save-plan">Сохранить план на сегодня</button>' +
      "</div>" +
      blocksHtml +
      '<div style="height:var(--space-8)"></div>'
    );
  }

  function otherFocusModal() {
    var focuses = window.APP_DATA.focuses;
    var html =
      '<div class="modal-head"><h3>Выбрать фокус дня</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<div class="stack-sm">' +
      focuses
        .map(function (f) {
          return (
            '<button class="btn btn-secondary" style="justify-content:flex-start" data-action="pick-focus" data-focus="' +
            f.id +
            '">' +
            UI.escapeHtml(f.name) +
            "</button>"
          );
        })
        .join("") +
      "</div>";
    UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", UI.closeModal);
  }

  function swapModal(exercise) {
    var alts = window.Planner.alternativesFor(exercise);
    var html =
      '<div class="modal-head"><h3>Заменить упражнение</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<p class="muted text-sm" style="margin-bottom:var(--space-3)">Похожие тренажёры из той же категории «' +
      UI.escapeHtml(window.APP_DATA.getCategory(exercise.category).name) +
      '»:</p>' +
      '<div class="stack-sm">' +
      (alts.length
        ? alts
            .map(function (t) {
              return (
                '<button class="btn btn-secondary" style="justify-content:flex-start" data-action="confirm-swap" data-order="' +
                exercise.order +
                '" data-trainer="' +
                t.id +
                '">' +
                UI.escapeHtml(t.name) +
                " · " +
                UI.escapeHtml(t.code) +
                "</button>"
              );
            })
            .join("")
        : '<p class="muted text-sm">Подходящих замен в справочнике не найдено.</p>') +
      "</div>";
    UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", UI.closeModal);
  }

  function feelingModal(blockName, onPick) {
    var options = ["Легко", "Нормально", "Тяжело", "Боль или дискомфорт"];
    var html =
      '<div class="modal-head"><h3>Как самочувствие?</h3></div>' +
      '<p class="muted text-sm" style="margin-bottom:var(--space-4)">Блок «' +
      UI.escapeHtml(blockName) +
      '» завершён. Отметьте, как вы себя чувствуете.</p>' +
      '<div class="stack-sm">' +
      options
        .map(function (o) {
          return '<button class="btn btn-secondary" style="justify-content:flex-start" data-feeling="' + o + '">' + o + "</button>";
        })
        .join("") +
      "</div>";
    UI.openModal(html);
    Array.prototype.forEach.call(document.querySelectorAll("[data-feeling]"), function (btn) {
      btn.addEventListener("click", function () {
        UI.closeModal();
        onPick(btn.getAttribute("data-feeling"));
      });
    });
  }

  function painModal(blockExercises, onMark) {
    var html =
      '<div class="modal-head"><h3>Остановитесь</h3></div>' +
      '<div class="banner banner-error" style="margin-bottom:var(--space-4)">' +
      window.ICONS.warn +
      "<div>Остановитесь и не продолжайте болезненное движение. Мы не ставим диагнозов — при сохраняющейся, сильной или необычной боли обратитесь к врачу или квалифицированному специалисту.</div>" +
      "</div>" +
      '<p class="muted text-sm" style="margin-bottom:var(--space-3)">Если знаете, какое упражнение вызвало дискомфорт, отметьте его — мы не будем предлагать его автоматически, пока вы не снимете ограничение вручную.</p>' +
      '<div class="stack-sm">' +
      blockExercises
        .filter(function (e) {
          return e.type === "trainer";
        })
        .map(function (e) {
          return (
            '<button class="btn btn-secondary" style="justify-content:flex-start" data-trainer="' +
            e.trainerId +
            '">' +
            UI.escapeHtml(e.name) +
            "</button>"
          );
        })
        .join("") +
      '<button class="btn btn-ghost" id="skip-mark">Пропустить</button>' +
      "</div>";
    UI.openModal(html);
    document.getElementById("skip-mark").addEventListener("click", UI.closeModal);
    Array.prototype.forEach.call(document.querySelectorAll("[data-trainer]"), function (btn) {
      btn.addEventListener("click", function () {
        UI.closeModal();
        onMark(btn.getAttribute("data-trainer"));
      });
    });
  }

  window.ViewToday = {
    render: render,
    otherFocusModal: otherFocusModal,
    swapModal: swapModal,
    feelingModal: feelingModal,
    painModal: painModal
  };
})();
