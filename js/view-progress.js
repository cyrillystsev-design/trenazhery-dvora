/* Раздел «Прогресс»: история тренировок, статистика, избранное, экспорт/импорт. */
(function () {
  function startOfWeek(d) {
    var date = new Date(d);
    var day = date.getDay() || 7;
    if (day !== 1) date.setDate(date.getDate() - (day - 1));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function weeklyStats(history) {
    var weekStart = startOfWeek(new Date());
    var days = {};
    var exercisesDone = 0;
    history.forEach(function (entry) {
      var d = new Date(entry.date + "T00:00:00");
      if (d >= weekStart) {
        days[entry.date] = true;
        exercisesDone += (entry.exercises || []).filter(function (e) {
          return e.done;
        }).length;
      }
    });
    return { dayCount: Object.keys(days).length, exercisesDone: exercisesDone };
  }

  function mostUsedTrainers(history, limit) {
    var counts = {};
    history.forEach(function (entry) {
      (entry.exercises || []).forEach(function (e) {
        if (e.trainerId && e.done) counts[e.trainerId] = (counts[e.trainerId] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(function (id) {
        return { id: id, count: counts[id], trainer: window.APP_DATA.getTrainer(id) };
      })
      .filter(function (x) {
        return x.trainer;
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, limit || 5);
  }

  function historyItemHtml(entry, index) {
    return (
      '<div class="history-item" data-action="open-history" data-index="' +
      index +
      '" style="cursor:pointer">' +
      "<div>" +
      '<div style="font-weight:700;font-size:var(--text-sm)">' +
      UI.escapeHtml(entry.focusName || "") +
      "</div>" +
      '<div class="text-xs muted">' +
      UI.formatDateLong(entry.date) +
      " · " +
      UI.escapeHtml(entry.modeLabel || "") +
      "</div>" +
      "</div>" +
      '<span class="status-pill" data-status="' +
      entry.status +
      '">' +
      window.Planner.planStatusLabel(entry.status) +
      "</span>" +
      "</div>"
    );
  }

  function render(state) {
    var history = window.Storage.getHistory();
    var favorites = window.Storage.getFavorites();
    var stats = weeklyStats(history);
    var topTrainers = mostUsedTrainers(history, 5);

    return (
      '<h1 class="page-title">Прогресс</h1>' +
      '<div class="metrics-row" style="margin-bottom:var(--space-4)">' +
      '<div class="metric"><strong>' +
      stats.dayCount +
      "</strong><span>дней за неделю</span></div>" +
      '<div class="metric"><strong>' +
      stats.exercisesDone +
      "</strong><span>упражнений за неделю</span></div>" +
      '<div class="metric"><strong>' +
      history.length +
      "</strong><span>тренировок всего</span></div>" +
      "</div>" +
      '<div class="card">' +
      '<div class="section-title">Часто используемые тренажёры</div>' +
      (topTrainers.length
        ? topTrainers
            .map(function (x) {
              return (
                '<div class="history-item"><span class="text-sm">' +
                UI.escapeHtml(x.trainer.name) +
                '</span><span class="text-xs muted">' +
                x.count +
                " раз</span></div>"
              );
            })
            .join("")
        : '<p class="text-sm muted">Пока нет данных — завершите первую тренировку.</p>') +
      "</div>" +
      '<div class="card">' +
      '<div class="section-title">Избранные тренажёры</div>' +
      (favorites.length
        ? favorites
            .map(function (id) {
              var t = window.APP_DATA.getTrainer(id);
              return t
                ? '<div class="history-item" data-action="open-detail" data-trainer="' + id + '" style="cursor:pointer"><span class="text-sm">' + UI.escapeHtml(t.name) + '</span><span class="text-xs muted">' + UI.escapeHtml(t.code) + "</span></div>"
                : "";
            })
            .join("")
        : '<p class="text-sm muted">Пока нет избранных тренажёров.</p>') +
      "</div>" +
      '<div class="card">' +
      '<div class="section-title">История тренировок</div>' +
      (history.length
        ? history.map(historyItemHtml).join("")
        : '<div class="empty-state">' + window.ICONS.empty + "<div>История пока пуста. Завершите первую тренировку в разделе «Сегодня».</div></div>") +
      "</div>" +
      '<div class="card">' +
      '<div class="section-title">Данные и резервная копия</div>' +
      '<p class="text-sm muted" style="margin-bottom:var(--space-3)">Все данные хранятся только на этом устройстве. Сделайте резервную копию перед сменой телефона.</p>' +
      '<div class="btn-row" style="margin-bottom:var(--space-2)">' +
      '<button class="btn btn-secondary btn-sm" data-action="export-all">' + window.ICONS.download + " Полная копия</button>" +
      '<button class="btn btn-secondary btn-sm" data-action="import-all">' + window.ICONS.upload + " Восстановить</button>" +
      "</div>" +
      '<div class="btn-row" style="margin-bottom:var(--space-3)">' +
      '<button class="btn btn-secondary btn-sm" data-action="export-history">Экспорт истории</button>' +
      '<button class="btn btn-secondary btn-sm" data-action="import-history">Импорт истории</button>' +
      "</div>" +
      '<button class="btn btn-danger" data-action="clear-history">' + window.ICONS.trash + " Очистить историю</button>" +
      "</div>"
    );
  }

  function historyDetailHtml(entry) {
    return (
      '<div class="modal-head"><h3>' +
      UI.escapeHtml(entry.focusName) +
      '</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<p class="text-sm muted" style="margin-bottom:var(--space-3)">' +
      UI.formatDateLong(entry.date) +
      " · " +
      UI.escapeHtml(entry.modeLabel || "") +
      "</p>" +
      (entry.finalFeeling ? '<p class="text-sm" style="margin-bottom:var(--space-3)">Итоговое самочувствие: <strong>' + UI.escapeHtml(entry.finalFeeling) + "</strong></p>" : "") +
      '<div class="stack-sm">' +
      (entry.exercises || [])
        .map(function (e) {
          return (
            '<div class="exercise-card">' +
            '<div style="display:flex;justify-content:space-between"><strong class="text-sm">' +
            UI.escapeHtml(e.name) +
            "</strong>" +
            (e.done ? '<span class="status-pill" data-status="done">Выполнено</span>' : '<span class="status-pill">Не выполнено</span>') +
            "</div>" +
            '<div class="text-xs muted" style="margin-top:4px">' +
            (e.plannedSets ? e.plannedSets + " × " + e.plannedReps : "") +
            (e.resistance ? " · сопротивление: " + UI.escapeHtml(e.resistance) : "") +
            "</div>" +
            (e.note ? '<div class="text-xs muted">Заметка: ' + UI.escapeHtml(e.note) + "</div>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      (entry.note ? '<p class="text-sm" style="margin-top:var(--space-3)">Заметка дня: ' + UI.escapeHtml(entry.note) + "</p>" : "")
    );
  }

  window.ViewProgress = {
    render: render,
    historyDetailHtml: historyDetailHtml
  };
})();
