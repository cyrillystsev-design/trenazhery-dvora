/* Раздел «Тренажёры»: каталог, карточки, полная карточка тренажёра. */
(function () {
  var CATEGORY_FILTERS = [{ id: "all", name: "Все тренажёры" }].concat(
    window.APP_DATA.categories
      .filter(function (c) {
        return c.id !== "universal" || true;
      })
      .map(function (c) {
        return { id: c.id, name: c.name };
      })
  );

  function matchesSearch(trainer, term) {
    if (!term) return true;
    term = term.toLowerCase();
    return trainer.name.toLowerCase().indexOf(term) !== -1 || trainer.code.toLowerCase().indexOf(term) !== -1;
  }

  function pointFor(trainerId) {
    return window.Planner.getMapPointForTrainer(trainerId);
  }

  function difficultyDot(level) {
    var map = { Начальный: 1, Средний: 2, Продвинутый: 3 };
    var n = map[level] || 1;
    var dots = "";
    for (var i = 0; i < 3; i++) {
      dots += '<span style="width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:3px;background:' + (i < n ? "var(--color-text-muted)" : "var(--color-border)") + '"></span>';
    }
    return dots;
  }

  function cardHtml(trainer, favorites) {
    var cat = window.APP_DATA.getCategory(trainer.category);
    var point = pointFor(trainer.id);
    var isFav = favorites.indexOf(trainer.id) !== -1;
    return (
      '<div class="trainer-card" data-trainer="' +
      trainer.id +
      '">' +
      '<div class="trainer-card__thumb" style="background:' +
      cat.colorSoft +
      ';color:' +
      cat.color +
      '">' +
      window.ICONS.camera +
      "</div>" +
      '<div class="trainer-card__body">' +
      '<div style="display:flex;justify-content:space-between;gap:var(--space-2)">' +
      "<div>" +
      '<div class="trainer-card__number">Место № ' +
      (point ? point.pointNumber : "—") +
      "</div>" +
      '<div class="trainer-card__name">' +
      UI.escapeHtml(trainer.name) +
      "</div>" +
      '<div class="trainer-card__code">' +
      UI.escapeHtml(trainer.code) +
      "</div>" +
      "</div>" +
      '<button class="fav-btn" data-action="toggle-fav" data-trainer="' +
      trainer.id +
      '" aria-pressed="' +
      isFav +
      '" aria-label="В избранное">' +
      (isFav ? window.ICONS.starFilled : window.ICONS.star) +
      "</button>" +
      "</div>" +
      '<div style="margin:var(--space-2) 0;display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;">' +
      UI.categoryTag(trainer.category) +
      UI.statusTag(point ? point.status : "Не проверено") +
      "</div>" +
      '<div class="text-xs muted" style="margin-bottom:var(--space-1)">' +
      UI.escapeHtml(trainer.description) +
      "</div>" +
      '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)">' +
      '<span class="text-xs muted">Сложность:</span>' +
      difficultyDot(trainer.difficulty) +
      "</div>" +
      '<div class="btn-row">' +
      '<button class="btn btn-secondary btn-sm" data-action="open-detail" data-trainer="' +
      trainer.id +
      '">Как выполнять</button>' +
      '<button class="btn btn-secondary btn-sm" data-action="show-on-map" data-trainer="' +
      trainer.id +
      '">На карте</button>' +
      '<button class="btn btn-primary btn-sm" data-action="add-to-plan" data-trainer="' +
      trainer.id +
      '">В тренировку</button>' +
      "</div>" +
      "</div></div>"
    );
  }

  function render(state) {
    var favorites = window.Storage.getFavorites();
    var list = window.APP_DATA.trainers.filter(function (t) {
      var catOk = state.category === "all" || t.category === state.category;
      return catOk && matchesSearch(t, state.search);
    });

    var filtersHtml = CATEGORY_FILTERS.map(function (f) {
      return (
        '<button class="chip" aria-pressed="' +
        (state.category === f.id) +
        '" data-action="set-category" data-value="' +
        f.id +
        '">' +
        UI.escapeHtml(f.name) +
        "</button>"
      );
    }).join("");

    return (
      '<h1 class="page-title">Тренажёры</h1>' +
      '<input class="search-input" id="trainer-search" placeholder="Поиск по названию или коду" value="' +
      UI.escapeHtml(state.search) +
      '">' +
      '<div class="chip-scroll" style="margin-top:var(--space-3)">' +
      filtersHtml +
      "</div>" +
      '<div class="result-count">Найдено: ' +
      list.length +
      "</div>" +
      '<div class="trainer-grid">' +
      (list.length
        ? list.map(function (t) {
            return cardHtml(t, favorites);
          }).join("")
        : '<div class="empty-state">' + window.ICONS.empty + "<div>Ничего не найдено. Попробуйте изменить запрос или фильтр.</div></div>") +
      "</div>"
    );
  }

  function detailHtml(trainer) {
    var point = pointFor(trainer.id);
    var cat = window.APP_DATA.getCategory(trainer.category);
    return (
      '<div class="modal-head"><h3 style="max-width:80%">' +
      UI.escapeHtml(trainer.name) +
      '</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">' +
      UI.categoryTag(trainer.category) +
      '<span class="tag" style="background:var(--color-surface-offset)">' +
      UI.escapeHtml(trainer.code) +
      "</span>" +
      '<span class="tag" style="background:var(--color-surface-offset)">Место № ' +
      (point ? point.pointNumber : "—") +
      "</span>" +
      UI.statusTag(point ? point.status : "Не проверено") +
      "</div>" +
      UI.mediaPlaceholder("Фото тренажёра скоро появится") +
      (trainer.needsReview
        ? '<div class="banner banner-warning" style="margin-top:var(--space-3)">' + window.ICONS.warn + "<div>" + UI.escapeHtml(trainer.verifyNote) + "</div></div>"
        : "") +
      '<div class="section-title" style="margin-top:var(--space-5)">Работают мышцы</div>' +
      '<p class="text-sm">Основная: ' +
      UI.escapeHtml(trainer.mainMuscle) +
      "<br>Дополнительно: " +
      UI.escapeHtml(trainer.secondaryMuscles.join(", ")) +
      "</p>" +
      '<div class="section-title" style="margin-top:var(--space-5)">Для чего нужен</div>' +
      '<p class="text-sm">' +
      UI.escapeHtml(trainer.description) +
      "</p>" +
      '<div class="section-title" style="margin-top:var(--space-5)">Как выполнять</div>' +
      '<ol class="stack-sm" style="padding-left:1.1rem;">' +
      trainer.steps.map(function (s) { return "<li class=\"text-sm\">" + UI.escapeHtml(s) + "</li>"; }).join("") +
      "</ol>" +
      '<div class="grid-2" style="margin-top:var(--space-4)">' +
      UI.mediaPlaceholder("Стартовое положение") +
      UI.mediaPlaceholder("Финальное положение") +
      "</div>" +
      '<div class="section-title" style="margin-top:var(--space-5)">Короткое видео</div>' +
      UI.mediaPlaceholder("Видео скоро появится", true) +
      '<div class="section-title" style="margin-top:var(--space-5)">Частые ошибки</div>' +
      '<ul class="stack-sm" style="padding-left:1.1rem;">' +
      trainer.mistakes.map(function (s) { return "<li class=\"text-sm\">" + UI.escapeHtml(s) + "</li>"; }).join("") +
      "</ul>" +
      '<div class="section-title" style="margin-top:var(--space-5)">Совет для старта</div>' +
      '<p class="text-sm">' + UI.escapeHtml(trainer.tips) + "</p>" +
      '<div class="section-title" style="margin-top:var(--space-5)">Безопасность</div>' +
      '<p class="text-sm">' + UI.escapeHtml(trainer.safety) + "</p>" +
      '<p class="text-xs faint" style="margin-top:var(--space-3)">' + UI.escapeHtml(trainer.verifyNote) + "</p>" +
      '<div class="btn-row" style="margin-top:var(--space-5)">' +
      '<button class="btn btn-secondary" data-action="show-on-map" data-trainer="' + trainer.id + '">' + window.ICONS.map + " Показать на карте</button>" +
      '<button class="btn btn-primary" data-action="add-to-plan" data-trainer="' + trainer.id + '">Добавить в свою тренировку</button>' +
      "</div>"
    );
  }

  window.ViewTrainers = {
    render: render,
    categoryFilters: CATEGORY_FILTERS,
    openDetail: function (trainerId) {
      var trainer = window.APP_DATA.getTrainer(trainerId);
      if (!trainer) return;
      UI.openModal(detailHtml(trainer));
      document.getElementById("modal-close").addEventListener("click", UI.closeModal);
    }
  };
})();
