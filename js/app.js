/* Точка входа: состояние приложения, маршрутизация вкладок, обработка действий. */
(function () {
  var views = {};
  var state = {
    activeTab: "today",
    todaySettings: { resource: "normal", mode: "one" },
    todayPlan: null,
    trainers: { search: "", category: "all" },
    map: {
      filterCategory: "all",
      editMode: false,
      checkMode: false,
      checkPoints: [],
      checkIndex: 0,
      routeActive: false,
      highlightTrainerIds: [],
      scrollTo: null
    },
    mapUndoStack: [],
    feelingAsked: {}
  };
  var dragSuppressUntil = 0;

  function todayDate() {
    return window.Planner.todayStr();
  }

  function planTrainerIds(plan) {
    var seen = {};
    var list = [];
    (plan ? plan.exercises : []).forEach(function (e) {
      if (e.trainerId && !seen[e.trainerId]) {
        seen[e.trainerId] = true;
        list.push(e.trainerId);
      }
    });
    return list;
  }

  // ---------- План на сегодня ----------
  function ensureTodayPlan() {
    var date = todayDate();
    var saved = window.Storage.getPlan(date);
    if (saved) {
      state.todayPlan = saved;
      state.todaySettings = { resource: saved.resource, mode: saved.mode === "light_mode" ? "light_mode" : saved.mode };
      return;
    }
    var settings = window.Storage.getSettings();
    state.todaySettings = { resource: settings.resource || "normal", mode: settings.mode || "one" };
    regenerate({}, true);
  }

  function regenerate(overrides, silent) {
    overrides = overrides || {};
    if (overrides.resource) state.todaySettings.resource = overrides.resource;
    if (overrides.mode) state.todaySettings.mode = overrides.mode;
    var focusId = overrides.focusId || (overrides.mode ? null : state.todayPlan && state.todayPlan.focusId);
    var plan = window.Planner.generatePlan({
      date: todayDate(),
      resource: state.todaySettings.resource,
      mode: state.todaySettings.mode,
      focusId: focusId
    });
    state.todayPlan = plan;
    state.feelingAsked = {};
    window.Storage.savePlan(plan.date, plan);
    window.Storage.saveSettings({ resource: state.todaySettings.resource, mode: state.todaySettings.mode });
    if (!silent) render();
  }

  function saveTodayPlan() {
    window.Storage.savePlan(state.todayPlan.date, state.todayPlan);
  }

  function checkBlockCompletion(exercise) {
    var plan = state.todayPlan;
    var blockKey = exercise.block || "Тренировка";
    var blockExercises = plan.exercises.filter(function (e) {
      return (e.block || "Тренировка") === blockKey;
    });
    var allDone = blockExercises.every(function (e) {
      return e.done;
    });
    if (allDone && !state.feelingAsked[blockKey]) {
      state.feelingAsked[blockKey] = true;
      window.ViewToday.feelingModal(blockKey, function (feeling) {
        handleFeeling(blockKey, blockExercises, feeling);
      });
    }
  }

  function handleFeeling(blockKey, blockExercises, feeling) {
    state.todayPlan.feelings = state.todayPlan.feelings || [];
    state.todayPlan.feelings.push({ block: blockKey, feeling: feeling });
    if (feeling === "Боль или дискомфорт") {
      window.ViewToday.painModal(blockExercises, function (trainerId) {
        window.Storage.addRestriction(trainerId);
        window.UI.toast("Упражнение отмечено как нежелательное и не будет предложено автоматически");
        saveTodayPlan();
        maybeArchiveDay();
        render();
      });
    } else {
      window.UI.toast("Спасибо, отметили: «" + feeling + "»");
      saveTodayPlan();
      maybeArchiveDay();
    }
  }

  function maybeArchiveDay() {
    var plan = state.todayPlan;
    window.Planner.recalcStatus(plan);
    saveTodayPlan();
    if (plan.status === "done" && !plan._archived) {
      plan._archived = true;
      var modeLabels = { one: "Один блок", two: "Два блока", three: "Три блока", light_mode: "Лёгкий день" };
      var entry = {
        date: plan.date,
        focusId: plan.focusId,
        focusName: plan.focusName,
        mode: plan.mode,
        modeLabel: modeLabels[plan.mode] || plan.mode,
        feelings: plan.feelings,
        finalFeeling: plan.feelings && plan.feelings.length ? plan.feelings[plan.feelings.length - 1].feeling : null,
        exercises: plan.exercises,
        status: plan.status,
        note: ""
      };
      window.Storage.addHistoryEntry(entry);
      saveTodayPlan();
      window.UI.toast("Тренировка сохранена в историю");
    }
  }

  // ---------- Рендер ----------
  function render() {
    if (state.activeTab === "today") renderToday();
    else if (state.activeTab === "trainers") renderTrainers();
    else if (state.activeTab === "map") renderMap();
    else if (state.activeTab === "progress") renderProgress();
  }

  function renderToday() {
    var el = document.getElementById("view-today");
    el.innerHTML = window.ViewToday.render(state.todayPlan, state.todaySettings);
  }

  function renderTrainers() {
    var el = document.getElementById("view-trainers");
    el.innerHTML = window.ViewTrainers.render(state.trainers);
  }

  function renderMap() {
    var el = document.getElementById("view-map");
    state.map.points = window.Storage.getMapPoints();
    el.innerHTML = window.ViewMap.render(state.map);
    attachMapDrag();
    if (state.map.scrollTo) {
      var target = state.map.scrollTo;
      state.map.scrollTo = null;
      setTimeout(function () {
        var pointEl = el.querySelector('.map-point[data-point="' + target + '"]');
        if (pointEl) pointEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 60);
    }
  }

  function renderProgress() {
    var el = document.getElementById("view-progress");
    el.innerHTML = window.ViewProgress.render(state);
  }

  function switchTab(tab) {
    state.activeTab = tab;
    ["today", "trainers", "map", "progress"].forEach(function (t) {
      document.getElementById("view-" + t).hidden = t !== tab;
    });
    Array.prototype.forEach.call(document.querySelectorAll(".bottom-nav__item"), function (btn) {
      btn.setAttribute("aria-current", btn.getAttribute("data-tab") === tab ? "true" : "false");
    });
    render();
  }

  // ---------- Карта: перетаскивание точек ----------
  function pushMapUndo() {
    state.mapUndoStack.push(JSON.parse(JSON.stringify(window.Storage.getMapPoints())));
    if (state.mapUndoStack.length > 25) state.mapUndoStack.shift();
  }

  function attachMapDrag() {
    if (!state.map.editMode) return;
    var wrap = document.getElementById("map-wrap");
    if (!wrap) return;
    Array.prototype.forEach.call(wrap.querySelectorAll(".map-point"), function (btn) {
      btn.style.touchAction = "none";
      var pointNumber = parseInt(btn.getAttribute("data-point"), 10);
      var dragging = false;
      var moved = false;
      var pushed = false;
      btn.addEventListener("pointerdown", function (e) {
        dragging = true;
        moved = false;
        pushed = false;
        try {
          btn.setPointerCapture(e.pointerId);
        } catch (err) {}
      });
      btn.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        moved = true;
        if (!pushed) {
          pushMapUndo();
          pushed = true;
        }
        var rect = wrap.getBoundingClientRect();
        var x = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100));
        var y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
        btn.style.left = x + "%";
        btn.style.top = y + "%";
        btn._pendingX = x;
        btn._pendingY = y;
      });
      btn.addEventListener("pointerup", function () {
        dragging = false;
        if (moved && btn._pendingX != null) {
          var points = window.Storage.getMapPoints();
          var p = points.find(function (pt) {
            return pt.pointNumber === pointNumber;
          });
          if (p) {
            p.x = btn._pendingX;
            p.y = btn._pendingY;
            p.updatedAt = todayDate();
            window.Storage.saveMapPoints(points);
          }
          dragSuppressUntil = Date.now() + 350;
        }
      });
    });
  }

  // ---------- Точка карты: инфо / редактор ----------
  function openPointInfo(pointNumber) {
    var points = window.Storage.getMapPoints();
    var point = points.find(function (p) {
      return p.pointNumber === pointNumber;
    });
    if (!point) return;
    var trainer = point.trainerId ? window.APP_DATA.getTrainer(point.trainerId) : null;
    var html =
      '<div class="modal-head"><h3>Место № ' +
      point.pointNumber +
      '</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      (trainer
        ? '<p style="font-weight:700;margin-bottom:4px">' + window.UI.escapeHtml(trainer.name) + "</p><p class=\"text-xs faint\" style=\"margin-bottom:var(--space-3)\">" + window.UI.escapeHtml(trainer.code) + "</p>" +
          '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)">' +
          window.UI.categoryTag(trainer.category) +
          window.UI.statusTag(point.status) +
          "</div>" +
          '<div class="btn-row">' +
          '<button class="btn btn-secondary" id="pi-open">Открыть карточку</button>' +
          '<button class="btn btn-primary" id="pi-add">Добавить в тренировку</button>' +
          "</div>"
        : '<p class="text-sm muted">Тренажёр для этой точки пока не назначен.</p>')
      ;
    window.UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", window.UI.closeModal);
    if (trainer) {
      document.getElementById("pi-open").addEventListener("click", function () {
        window.UI.closeModal();
        window.ViewTrainers.openDetail(trainer.id);
      });
      document.getElementById("pi-add").addEventListener("click", function () {
        window.UI.closeModal();
        addTrainerToToday(trainer.id);
      });
    }
  }

  function openPointEditor(pointNumber) {
    var points = window.Storage.getMapPoints();
    var point = points.find(function (p) {
      return p.pointNumber === pointNumber;
    });
    if (!point) return;
    window.ViewMap.pointEditorModal(point, {
      onSave: function (changes) {
        pushMapUndo();
        var pts = window.Storage.getMapPoints();
        var p = pts.find(function (pp) {
          return pp.id === point.id;
        });
        p.trainerId = changes.trainerId;
        p.label = changes.label;
        p.pointNumber = changes.pointNumber;
        p.updatedAt = todayDate();
        p.status = "Не проверено";
        window.Storage.saveMapPoints(pts);
        window.UI.toast("Точка обновлена");
        renderMap();
      },
      onDelete: function () {
        pushMapUndo();
        var pts = window.Storage.getMapPoints().filter(function (pp) {
          return pp.id !== point.id;
        });
        window.Storage.saveMapPoints(pts);
        window.UI.toast("Точка удалена");
        renderMap();
      },
      onSwapRequest: function () {
        window.ViewMap.swapPickerModal(window.Storage.getMapPoints(), point.id, function (otherId) {
          pushMapUndo();
          var pts = window.Storage.getMapPoints();
          var a = pts.find(function (pp) {
            return pp.id === point.id;
          });
          var b = pts.find(function (pp) {
            return pp.id === otherId;
          });
          var tmp = { trainerId: a.trainerId, label: a.label };
          a.trainerId = b.trainerId;
          a.label = b.label;
          b.trainerId = tmp.trainerId;
          b.label = tmp.label;
          a.updatedAt = todayDate();
          b.updatedAt = todayDate();
          window.Storage.saveMapPoints(pts);
          window.UI.toast("Тренажёры на точках поменяны местами");
          window.UI.closeModal();
          renderMap();
        });
      }
    });
  }

  // ---------- Добавление тренажёра в план ----------
  function addTrainerToToday(trainerId) {
    var trainer = window.APP_DATA.getTrainer(trainerId);
    if (!trainer) return;
    var plan = state.todayPlan;
    var guide = window.APP_DATA.repGuides[trainer.intensityGroup] || window.APP_DATA.repGuides.upper;
    var point = window.Planner.getMapPointForTrainer(trainerId);
    var order = plan.exercises.length ? Math.max.apply(null, plan.exercises.map(function (e) { return e.order; })) + 1 : 1;
    plan.exercises.push({
      order: order,
      type: "trainer",
      trainerId: trainerId,
      name: trainer.name,
      code: trainer.code,
      mainMuscle: trainer.mainMuscle,
      category: trainer.category,
      pointNumber: point ? point.pointNumber : null,
      plannedSets: guide.setsNormal,
      plannedReps: guide.reps,
      rest: window.APP_DATA.repGuides.rest,
      block: null,
      done: false,
      actualSets: null,
      resistance: "",
      note: ""
    });
    plan.exerciseCount = plan.exercises.length;
    plan.totalSets = plan.exercises.reduce(function (s, e) {
      return s + (e.plannedSets || 0);
    }, 0);
    saveTodayPlan();
    window.UI.toast("Добавлено в план на сегодня: " + trainer.name);
    switchTab("today");
  }

  // ---------- Обработчики кликов ----------
  function handleClick(e) {
    var navBtn = e.target.closest(".bottom-nav__item");
    if (navBtn) {
      switchTab(navBtn.getAttribute("data-tab"));
      return;
    }
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var order = btn.getAttribute("data-order") ? parseInt(btn.getAttribute("data-order"), 10) : null;
    var trainerId = btn.getAttribute("data-trainer");
    var value = btn.getAttribute("data-value");
    var pointNumber = btn.getAttribute("data-point") ? parseInt(btn.getAttribute("data-point"), 10) : null;

    switch (action) {
      // ----- Сегодня -----
      case "set-resource":
        regenerate({ resource: value });
        break;
      case "set-mode":
        regenerate({ mode: value });
        break;
      case "start-plan":
        state.todayPlan._started = true;
        window.Planner.recalcStatus(state.todayPlan);
        saveTodayPlan();
        window.UI.toast("План начат — хорошей тренировки");
        render();
        break;
      case "show-route":
        state.map.highlightTrainerIds = planTrainerIds(state.todayPlan);
        state.map.routeActive = true;
        switchTab("map");
        break;
      case "shorter":
        window.Planner.makeShorter(state.todayPlan);
        saveTodayPlan();
        render();
        break;
      case "lighter":
        window.Planner.makeLighter(state.todayPlan);
        saveTodayPlan();
        render();
        break;
      case "intense":
        window.Planner.makeIntense(state.todayPlan);
        saveTodayPlan();
        render();
        break;
      case "other-focus":
        window.ViewToday.otherFocusModal();
        break;
      case "pick-focus":
        window.UI.closeModal();
        regenerate({ focusId: btn.getAttribute("data-focus") });
        break;
      case "save-plan":
        saveTodayPlan();
        window.UI.toast("План на сегодня сохранён");
        break;
      case "show-map":
        (function () {
          var ex = state.todayPlan.exercises.find(function (e) {
            return e.order === order;
          });
          if (ex && ex.pointNumber) {
            state.map.scrollTo = ex.pointNumber;
            state.map.highlightTrainerIds = planTrainerIds(state.todayPlan);
            switchTab("map");
          }
        })();
        break;
      case "show-technique":
        window.ViewTrainers.openDetail(trainerId);
        break;
      case "swap-exercise":
        (function () {
          var ex = state.todayPlan.exercises.find(function (e) {
            return e.order === order;
          });
          if (ex) window.ViewToday.swapModal(ex);
        })();
        break;
      case "confirm-swap":
        window.UI.closeModal();
        window.Planner.swapExercise(state.todayPlan, order, trainerId);
        saveTodayPlan();
        render();
        break;
      case "toggle-done":
        (function () {
          var ex = state.todayPlan.exercises.find(function (e) {
            return e.order === order;
          });
          if (!ex) return;
          ex.done = !ex.done;
          window.Planner.recalcStatus(state.todayPlan);
          saveTodayPlan();
          render();
          if (ex.done) checkBlockCompletion(ex);
        })();
        break;

      // ----- Тренажёры -----
      case "set-category":
        state.trainers.category = value;
        renderTrainers();
        break;
      case "open-detail":
        window.ViewTrainers.openDetail(trainerId);
        break;
      case "show-on-map":
        state.map.scrollTo = window.Planner.getMapPointForTrainer(trainerId)
          ? window.Planner.getMapPointForTrainer(trainerId).pointNumber
          : null;
        state.map.highlightTrainerIds = [trainerId];
        switchTab("map");
        break;
      case "add-to-plan":
        addTrainerToToday(trainerId);
        break;
      case "toggle-fav":
        window.Storage.toggleFavorite(trainerId);
        render();
        break;

      // ----- Карта -----
      case "map-filter":
        state.map.filterCategory = value;
        renderMap();
        break;
      case "toggle-route":
        state.map.routeActive = !state.map.routeActive;
        if (state.map.routeActive) state.map.highlightTrainerIds = planTrainerIds(state.todayPlan);
        renderMap();
        break;
      case "map-edit-start":
        state.map.editMode = true;
        renderMap();
        break;
      case "map-edit-done":
        state.map.editMode = false;
        renderMap();
        break;
      case "map-undo":
        if (state.mapUndoStack.length) {
          window.Storage.saveMapPoints(state.mapUndoStack.pop());
          window.UI.toast("Последнее действие отменено");
          renderMap();
        } else {
          window.UI.toast("Нет действий для отмены");
        }
        break;
      case "map-reset":
        window.UI.confirmModal("Сбросить карту к базовой схеме? Ваши изменения будут потеряны.", "Сбросить", function () {
          pushMapUndo();
          window.Storage.resetMapPoints();
          window.UI.toast("Карта сброшена к базовой схеме");
          renderMap();
        }, { danger: true });
        break;
      case "map-add-point":
        window.ViewMap.addPointModal(function (data) {
          pushMapUndo();
          var pts = window.Storage.getMapPoints();
          pts.push({
            id: "p" + data.pointNumber + "_" + Date.now(),
            pointNumber: data.pointNumber,
            trainerId: data.trainerId,
            row: null,
            col: null,
            x: 50,
            y: 50,
            label: window.APP_DATA.getTrainer(data.trainerId).name,
            status: "Не проверено",
            updatedAt: todayDate()
          });
          window.Storage.saveMapPoints(pts);
          window.UI.toast("Точка добавлена — перетащите её на нужное место");
          renderMap();
        });
        break;
      case "map-export":
        window.UI.downloadJSON(window.Storage.exportMap(), "dvorfit-karta.json");
        window.UI.toast("Файл схемы карты сохранён");
        break;
      case "map-import":
        window.UI.pickJSONFile(function (err, data) {
          if (err || !data) {
            window.UI.toast("Не удалось прочитать файл");
            return;
          }
          try {
            pushMapUndo();
            window.Storage.importMap(data);
            window.UI.toast("Схема карты восстановлена");
            renderMap();
          } catch (e) {
            window.UI.toast(e.message);
          }
        });
        break;
      case "check-start":
        state.map.checkMode = true;
        state.map.checkPoints = window.Storage.getMapPoints().slice().sort(function (a, b) {
          return a.pointNumber - b.pointNumber;
        });
        state.map.checkIndex = 0;
        renderMap();
        break;
      case "check-stop":
        state.map.checkMode = false;
        renderMap();
        break;
      case "check-correct":
        (function () {
          var p = state.map.checkPoints[state.map.checkIndex];
          if (p) {
            var pts = window.Storage.getMapPoints();
            var real = pts.find(function (pp) {
              return pp.id === p.id;
            });
            if (real) {
              real.status = "Подтверждено";
              real.updatedAt = todayDate();
              window.Storage.saveMapPoints(pts);
            }
          }
          state.map.checkIndex++;
          state.map.checkPoints = window.Storage.getMapPoints().slice().sort(function (a, b) {
            return a.pointNumber - b.pointNumber;
          });
          renderMap();
        })();
        break;
      case "check-fix":
        (function () {
          var p = state.map.checkPoints[state.map.checkIndex];
          if (!p) return;
          openQuickAssign(p);
        })();
        break;
      case "open-point":
        if (Date.now() < dragSuppressUntil) break;
        if (state.map.editMode) openPointEditor(pointNumber);
        else openPointInfo(pointNumber);
        break;

      // ----- Прогресс -----
      case "open-history":
        (function () {
          var idx = parseInt(btn.getAttribute("data-index"), 10);
          var history = window.Storage.getHistory();
          var entry = history[idx];
          if (!entry) return;
          window.UI.openModal(window.ViewProgress.historyDetailHtml(entry));
          document.getElementById("modal-close").addEventListener("click", window.UI.closeModal);
        })();
        break;
      case "clear-history":
        window.UI.confirmModal("Очистить всю историю тренировок? Это действие необратимо.", "Очистить", function () {
          window.Storage.clearHistory();
          window.UI.toast("История очищена");
          renderProgress();
        }, { danger: true });
        break;
      case "export-all":
        window.UI.downloadJSON(window.Storage.exportAll(), "dvorfit-backup.json");
        window.UI.toast("Полная резервная копия сохранена");
        break;
      case "import-all":
        window.UI.pickJSONFile(function (err, data) {
          if (err) {
            window.UI.toast("Не удалось прочитать файл");
            return;
          }
          try {
            window.Storage.importAll(data);
            window.UI.toast("Данные восстановлены");
            ensureTodayPlan();
            render();
          } catch (e) {
            window.UI.toast(e.message);
          }
        });
        break;
      case "export-history":
        window.UI.downloadJSON(window.Storage.exportHistory(), "dvorfit-istoriya.json");
        break;
      case "import-history":
        window.UI.pickJSONFile(function (err, data) {
          if (err) {
            window.UI.toast("Не удалось прочитать файл");
            return;
          }
          try {
            window.Storage.importHistory(data);
            window.UI.toast("История восстановлена");
            renderProgress();
          } catch (e) {
            window.UI.toast(e.message);
          }
        });
        break;
    }
  }

  function openQuickAssign(point) {
    var html =
      '<div class="modal-head"><h3>Выбрать тренажёр для точки № ' +
      point.pointNumber +
      '</h3><button class="icon-btn" id="modal-close">' +
      window.ICONS.x +
      "</button></div>" +
      '<div class="stack-sm" style="max-height:340px;overflow-y:auto">' +
      window.APP_DATA.trainers
        .map(function (t) {
          return (
            '<button class="btn btn-secondary btn-sm" style="justify-content:flex-start" data-fix-assign="' +
            t.id +
            '">' +
            window.UI.escapeHtml(t.name) +
            " · " +
            window.UI.escapeHtml(t.code) +
            "</button>"
          );
        })
        .join("") +
      '<button class="btn btn-ghost" id="fix-unclear">Оставить «Требует уточнения»</button>' +
      "</div>";
    window.UI.openModal(html);
    document.getElementById("modal-close").addEventListener("click", window.UI.closeModal);
    document.getElementById("fix-unclear").addEventListener("click", function () {
      window.UI.closeModal();
      var pts = window.Storage.getMapPoints();
      var real = pts.find(function (pp) {
        return pp.id === point.id;
      });
      if (real) {
        real.status = "Требует уточнения";
        real.updatedAt = todayDate();
        window.Storage.saveMapPoints(pts);
      }
      state.map.checkIndex++;
      renderMap();
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-fix-assign]"), function (b) {
      b.addEventListener("click", function () {
        window.UI.closeModal();
        var pts = window.Storage.getMapPoints();
        var real = pts.find(function (pp) {
          return pp.id === point.id;
        });
        if (real) {
          real.trainerId = b.getAttribute("data-fix-assign");
          real.status = "Подтверждено";
          real.updatedAt = todayDate();
          window.Storage.saveMapPoints(pts);
        }
        state.map.checkIndex++;
        state.map.checkPoints = window.Storage.getMapPoints().slice().sort(function (a, b2) {
          return a.pointNumber - b2.pointNumber;
        });
        renderMap();
      });
    });
  }

  // ---------- Ввод текста (сопротивление / заметка) — без полного перерендера ----------
  function handleInput(e) {
    var field = e.target.getAttribute && e.target.getAttribute("data-field");
    if (!field) return;
    var order = parseInt(e.target.getAttribute("data-order"), 10);
    var ex = state.todayPlan && state.todayPlan.exercises.find(function (x) {
      return x.order === order;
    });
    if (!ex) return;
    ex[field] = e.target.value;
    saveTodayPlan();
  }

  // ---------- Инфо о безопасности ----------
  function openInfoModal() {
    window.UI.openModal(
      '<div class="modal-head"><h3>Важно</h3><button class="icon-btn" id="modal-close">' +
        window.ICONS.x +
        "</button></div>" +
        '<div class="banner banner-warning">' +
        window.ICONS.warn +
        "<div>Информация носит справочный характер. Начинайте с умеренной нагрузки, контролируйте технику и не выполняйте движения через боль. При травмах, хронических заболеваниях, необычной одышке, головокружении, сильной или сохраняющейся боли обратитесь к врачу или квалифицированному специалисту.</div></div>" +
        '<p class="text-sm muted" style="margin-top:var(--space-4)">Все данные хранятся только на этом устройстве и не передаются никуда. Регистрация не требуется.</p>'
    );
    document.getElementById("modal-close").addEventListener("click", window.UI.closeModal);
  }

  // ---------- Инициализация ----------
  function init() {
    window.UI.init();
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.getElementById("btn-info").addEventListener("click", openInfoModal);
    ensureTodayPlan();
    switchTab("today");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
