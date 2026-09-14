/* Планировщик тренировок.
   Собирает готовый план на день на основе истории, режима дня, состояния и шаблонов.
   Не увеличивает объём автоматически «до максимума» — для этого есть отдельная кнопка. */

(function () {
  var D = window.APP_DATA;

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function seededRandom(seedStr) {
    var h = 0;
    for (var i = 0; i < seedStr.length; i++) {
      h = (h << 5) - h + seedStr.charCodeAt(i);
      h |= 0;
    }
    return function () {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
  }

  function getMapPointForTrainer(trainerId) {
    var points = window.Storage.getMapPoints();
    return points.find(function (p) {
      return p.trainerId === trainerId;
    });
  }

  function isAutoAllowed(trainerId) {
    var trainer = D.getTrainer(trainerId);
    if (!trainer) return false;
    if (trainer.needsReview) return false;
    var restrictions = window.Storage.getRestrictions();
    if (restrictions.indexOf(trainerId) !== -1) return false;
    return true;
  }

  function filterAllowed(ids) {
    return ids.filter(isAutoAllowed);
  }

  function pickOne(choices, rnd, excludeIds) {
    var pool = filterAllowed(choices).filter(function (id) {
      return !excludeIds || excludeIds.indexOf(id) === -1;
    });
    if (pool.length === 0) pool = filterAllowed(choices);
    if (pool.length === 0) return null;
    var idx = Math.floor(rnd() * pool.length);
    return pool[idx];
  }

  function repGuideFor(trainer) {
    var g = D.repGuides[trainer.intensityGroup] || D.repGuides.upper;
    return g;
  }

  function makeExercise(trainerId, order, sets, opts) {
    var trainer = D.getTrainer(trainerId);
    var guide = repGuideFor(trainer);
    var point = getMapPointForTrainer(trainerId);
    return {
      order: order,
      type: "trainer",
      trainerId: trainerId,
      name: trainer.name,
      code: trainer.code,
      mainMuscle: trainer.mainMuscle,
      category: trainer.category,
      pointNumber: point ? point.pointNumber : null,
      plannedSets: sets,
      plannedReps: guide.reps,
      rest: D.repGuides.rest,
      block: (opts && opts.block) || null,
      done: false,
      actualSets: null,
      resistance: "",
      note: ""
    };
  }

  function makeActivity(activity, order, opts) {
    return {
      order: order,
      type: "activity",
      trainerId: null,
      name: activity.name,
      code: null,
      mainMuscle: null,
      category: "universal",
      pointNumber: null,
      plannedSets: null,
      plannedReps: null,
      rest: null,
      note: activity.note,
      block: (opts && opts.block) || null,
      done: false,
      actualSets: null,
      resistance: ""
    };
  }

  function setsForResource(guide, resource) {
    return resource === "low" ? guide.setsLow : guide.setsNormal;
  }

  // Строит «сырой» список идентификаторов тренажёров (в правильном порядке: база → доп.) для фокуса
  function buildTrainerSequence(focusId, resource, rnd) {
    var t = D.templates;
    var seq = [];

    if (focusId === "legs") {
      seq = seq.concat(filterAllowed(t.legs.base));
      var extraCount = resource === "low" ? 1 : 3;
      seq = seq.concat(filterAllowed(t.legs.extra).slice(0, extraCount));
    } else if (focusId === "back_arms") {
      seq = seq.concat(filterAllowed(t.back_arms.base));
      var extra = filterAllowed(t.back_arms.extra);
      if (resource !== "low") seq = seq.concat(extra);
      if (resource === "low" && seq.length > 2) seq = seq.slice(0, 2);
    } else if (focusId === "chest_shoulders") {
      var press = pickOne(t.chest_shoulders.pressChoices, rnd);
      var angleOrFly = pickOne(t.chest_shoulders.angleOrFlyChoices, rnd, press ? [press] : []);
      var shoulder = pickOne(t.chest_shoulders.shoulderChoices, rnd);
      seq = [press, angleOrFly, shoulder].filter(Boolean);
      if (resource === "low" && seq.length > 2) seq = seq.slice(0, 2);
    } else if (focusId === "full_body") {
      var legsEx = pickOne(t.full_body.legsChoices, rnd);
      var pull = pickOne(t.full_body.pullChoices, rnd);
      var press2 = pickOne(t.full_body.pressChoices, rnd);
      var armsSh = pickOne(t.full_body.armsShouldersChoices, rnd);
      seq = [legsEx, pull, press2, armsSh].filter(Boolean);
      if (resource === "low" && seq.length > 3) seq = seq.slice(0, 3);
    }
    return seq;
  }

  function buildOneBlockExercises(focusId, resource, rnd) {
    if (focusId === "light") return buildLightExercises(resource);
    var seq = buildTrainerSequence(focusId, resource, rnd);
    var order = 1;
    return seq.map(function (trainerId) {
      var trainer = D.getTrainer(trainerId);
      var guide = repGuideFor(trainer);
      return makeExercise(trainerId, order++, setsForResource(guide, resource));
    });
  }

  function buildLightExercises(resource) {
    var t = D.templates.light;
    var pool = filterAllowed(t.trainerPool).slice(0, resource === "low" ? 2 : 3);
    var order = 1;
    var list = pool.map(function (trainerId) {
      return makeExercise(trainerId, order++, 1);
    });
    t.activities.slice(0, resource === "low" ? 2 : 3).forEach(function (a) {
      list.push(makeActivity(a, order++));
    });
    return list;
  }

  function splitTwoBlocks(exercises) {
    var half = Math.ceil(exercises.length / 2);
    var a = exercises.slice(0, half).map(function (e) {
      return Object.assign({}, e, { block: "Блок 1" });
    });
    var b = exercises.slice(half).map(function (e, i) {
      return Object.assign({}, e, { block: "Блок 2", order: half + i + 1 });
    });
    return a.concat(b);
  }

  var THREE_BLOCK_SPLIT = {
    1: [1, 0, 0],
    2: [1, 1, 0],
    3: [1, 1, 1],
    4: [1, 2, 1],
    5: [1, 3, 1],
    6: [2, 3, 1]
  };

  function splitThreeBlocks(exercises, resource) {
    var n = Math.min(exercises.length, 6);
    var trimmed = exercises.slice(0, n);
    var split = THREE_BLOCK_SPLIT[n] || [1, Math.max(n - 2, 0), 1];
    var blocks = ["Утро", "День", "Вечер"];
    var result = [];
    var idx = 0;
    var order = 1;
    for (var b = 0; b < 3; b++) {
      for (var i = 0; i < split[b]; i++) {
        if (idx >= trimmed.length) break;
        var ex = Object.assign({}, trimmed[idx]);
        ex.block = blocks[b];
        ex.order = order++;
        // Утро/вечер — 1-2 подхода, день — обычно 2 (или меньше при низком ресурсе)
        if (ex.type === "trainer") {
          if (b === 1) {
            ex.plannedSets = resource === "low" ? 1 : 2;
          } else {
            ex.plannedSets = resource === "low" ? 1 : Math.min(ex.plannedSets, 2);
          }
        }
        result.push(ex);
        idx++;
      }
    }
    return result;
  }

  function suggestFocusId() {
    var history = window.Storage.getHistory();
    if (!history || history.length === 0) return "full_body";
    var last = history[0];
    var lastFocusId = last.focusId || "full_body";
    return D.focusRotation[lastFocusId] || "legs";
  }

  function planStatusLabel(status) {
    var map = {
      not_started: "План не начат",
      in_progress: "В процессе",
      partial: "Выполнен частично",
      done: "Выполнен"
    };
    return map[status] || map.not_started;
  }

  function generatePlan(options) {
    options = options || {};
    var date = options.date || todayStr();
    var resource = options.resource || "normal";
    var mode = options.mode || "one"; // one | two | three | light_mode
    var focusId = options.focusId;

    if (mode === "light_mode") {
      focusId = "light";
    }
    if (!focusId) {
      focusId = suggestFocusId();
      if (resource === "low" && Math.random) {
        // при низком ресурсе не меняем фокус автоматически на light — только предлагаем в интерфейсе
      }
    }

    var rnd = seededRandom(date + "_" + focusId + "_" + resource);
    var exercises = buildOneBlockExercises(focusId, resource, rnd);

    if (mode === "two") {
      exercises = splitTwoBlocks(exercises);
    } else if (mode === "three") {
      exercises = splitThreeBlocks(exercises, resource);
    }

    var totalSets = exercises.reduce(function (sum, e) {
      return sum + (e.plannedSets || 0);
    }, 0);

    var plan = {
      date: date,
      focusId: focusId,
      focusName: D.getFocus(focusId) ? D.getFocus(focusId).name : "",
      mode: mode,
      resource: resource,
      status: "not_started",
      exercises: exercises,
      exerciseCount: exercises.length,
      totalSets: totalSets,
      feelings: [], // отметки самочувствия после блоков
      createdAt: new Date().toISOString()
    };
    return plan;
  }

  function recalcStatus(plan) {
    var withSets = plan.exercises.filter(function (e) {
      return e.type === "trainer" || e.type === "activity";
    });
    var doneCount = withSets.filter(function (e) {
      return e.done;
    }).length;
    if (doneCount === 0) {
      plan.status = plan._started ? "in_progress" : "not_started";
    } else if (doneCount === withSets.length) {
      plan.status = "done";
    } else {
      plan.status = "partial";
    }
    return plan;
  }

  function makeShorter(plan) {
    if (plan.exercises.length <= 2) return plan;
    plan.exercises = plan.exercises.slice(0, plan.exercises.length - 1);
    plan.exerciseCount = plan.exercises.length;
    plan.totalSets = plan.exercises.reduce(function (s, e) {
      return s + (e.plannedSets || 0);
    }, 0);
    return plan;
  }

  function makeLighter(plan) {
    plan.exercises.forEach(function (e) {
      if (e.type === "trainer" && e.plannedSets > 1) e.plannedSets -= 1;
    });
    plan.totalSets = plan.exercises.reduce(function (s, e) {
      return s + (e.plannedSets || 0);
    }, 0);
    return plan;
  }

  function makeIntense(plan) {
    plan.exercises.forEach(function (e) {
      if (e.type === "trainer" && e.plannedSets < 3) e.plannedSets += 1;
    });
    plan.totalSets = plan.exercises.reduce(function (s, e) {
      return s + (e.plannedSets || 0);
    }, 0);
    return plan;
  }

  function swapExercise(plan, order, newTrainerId) {
    var idx = plan.exercises.findIndex(function (e) {
      return e.order === order;
    });
    if (idx === -1) return plan;
    var old = plan.exercises[idx];
    var trainer = D.getTrainer(newTrainerId);
    if (!trainer) return plan;
    var guide = repGuideFor(trainer);
    var point = getMapPointForTrainer(newTrainerId);
    plan.exercises[idx] = Object.assign({}, old, {
      trainerId: newTrainerId,
      name: trainer.name,
      code: trainer.code,
      mainMuscle: trainer.mainMuscle,
      category: trainer.category,
      pointNumber: point ? point.pointNumber : null,
      plannedReps: guide.reps,
      type: "trainer",
      done: false,
      actualSets: null
    });
    return plan;
  }

  function alternativesFor(exercise) {
    // Тренажёры той же категории, не отмеченные как ограниченные, кроме самого себя
    var restrictions = window.Storage.getRestrictions();
    return D.trainers.filter(function (t) {
      return (
        t.category === exercise.category &&
        t.id !== exercise.trainerId &&
        !t.needsReview &&
        restrictions.indexOf(t.id) === -1
      );
    });
  }

  window.Planner = {
    todayStr: todayStr,
    generatePlan: generatePlan,
    recalcStatus: recalcStatus,
    makeShorter: makeShorter,
    makeLighter: makeLighter,
    makeIntense: makeIntense,
    swapExercise: swapExercise,
    alternativesFor: alternativesFor,
    suggestFocusId: suggestFocusId,
    planStatusLabel: planStatusLabel,
    getMapPointForTrainer: getMapPointForTrainer
  };
})();
