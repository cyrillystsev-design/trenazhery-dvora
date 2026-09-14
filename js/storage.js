/* Слой локального хранения данных.
   Все личные данные (карта, история, ограничения, избранное) хранятся ТОЛЬКО на устройстве —
   через localStorage. Если localStorage недоступен (приватный режим и т.п.), используется
   резервное хранение в памяти на время сессии, чтобы приложение не падало. */

(function () {
  var memoryFallback = {};
  var storageWorks = true;
  try {
    var testKey = "__gym_app_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
  } catch (e) {
    storageWorks = false;
  }

  var KEYS = {
    MAP_POINTS: "gym_map_points_v1",
    RESTRICTIONS: "gym_restrictions_v1",
    FAVORITES: "gym_favorites_v1",
    HISTORY: "gym_history_v1",
    PLAN_PREFIX: "gym_plan_v1_",
    CURRENT_PLAN_DATE: "gym_current_plan_date_v1",
    SETTINGS: "gym_settings_v1"
  };

  function readRaw(key) {
    if (storageWorks) {
      return window.localStorage.getItem(key);
    }
    return memoryFallback.hasOwnProperty(key) ? memoryFallback[key] : null;
  }

  function writeRaw(key, value) {
    if (storageWorks) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        /* переполнение хранилища и т.п. — переходим на резервный вариант */
      }
    }
    memoryFallback[key] = value;
  }

  function removeRaw(key) {
    if (storageWorks) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    }
    delete memoryFallback[key];
  }

  function getJSON(key, fallback) {
    var raw = readRaw(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    writeRaw(key, JSON.stringify(value));
  }

  var Storage = {
    isPersistent: function () {
      return storageWorks;
    },
    KEYS: KEYS,

    // ---- Карта площадки ----
    getMapPoints: function () {
      return getJSON(KEYS.MAP_POINTS, null) || JSON.parse(JSON.stringify(window.APP_DATA.mapDefault));
    },
    saveMapPoints: function (points) {
      setJSON(KEYS.MAP_POINTS, points);
    },
    resetMapPoints: function () {
      removeRaw(KEYS.MAP_POINTS);
    },

    // ---- Ограничения (нежелательные упражнения) ----
    getRestrictions: function () {
      return getJSON(KEYS.RESTRICTIONS, []);
    },
    saveRestrictions: function (list) {
      setJSON(KEYS.RESTRICTIONS, list);
    },
    addRestriction: function (trainerId) {
      var list = Storage.getRestrictions();
      if (list.indexOf(trainerId) === -1) {
        list.push(trainerId);
        Storage.saveRestrictions(list);
      }
    },
    removeRestriction: function (trainerId) {
      var list = Storage.getRestrictions().filter(function (id) {
        return id !== trainerId;
      });
      Storage.saveRestrictions(list);
    },

    // ---- Избранное ----
    getFavorites: function () {
      return getJSON(KEYS.FAVORITES, []);
    },
    toggleFavorite: function (trainerId) {
      var list = Storage.getFavorites();
      var idx = list.indexOf(trainerId);
      if (idx === -1) {
        list.push(trainerId);
      } else {
        list.splice(idx, 1);
      }
      setJSON(KEYS.FAVORITES, list);
      return list;
    },

    // ---- История тренировок ----
    getHistory: function () {
      return getJSON(KEYS.HISTORY, []);
    },
    saveHistory: function (list) {
      setJSON(KEYS.HISTORY, list);
    },
    addHistoryEntry: function (entry) {
      var list = Storage.getHistory();
      list.unshift(entry);
      Storage.saveHistory(list);
    },
    clearHistory: function () {
      setJSON(KEYS.HISTORY, []);
    },

    // ---- План на день ----
    getPlan: function (dateStr) {
      return getJSON(KEYS.PLAN_PREFIX + dateStr, null);
    },
    savePlan: function (dateStr, plan) {
      setJSON(KEYS.PLAN_PREFIX + dateStr, plan);
      writeRaw(KEYS.CURRENT_PLAN_DATE, dateStr);
    },
    deletePlan: function (dateStr) {
      removeRaw(KEYS.PLAN_PREFIX + dateStr);
    },

    // ---- Настройки (последний выбранный режим/ресурс и т.п.) ----
    getSettings: function () {
      return getJSON(KEYS.SETTINGS, {});
    },
    saveSettings: function (obj) {
      var current = Storage.getSettings();
      setJSON(KEYS.SETTINGS, Object.assign(current, obj));
    },

    // ---- Полный экспорт / импорт данных пользователя ----
    exportAll: function () {
      return {
        exportedAt: new Date().toISOString(),
        appVersion: 1,
        mapPoints: Storage.getMapPoints(),
        restrictions: Storage.getRestrictions(),
        favorites: Storage.getFavorites(),
        history: Storage.getHistory(),
        settings: Storage.getSettings()
      };
    },
    importAll: function (data) {
      if (!data || typeof data !== "object") throw new Error("Некорректный файл резервной копии");
      if (data.mapPoints) Storage.saveMapPoints(data.mapPoints);
      if (data.restrictions) Storage.saveRestrictions(data.restrictions);
      if (data.favorites) setJSON(KEYS.FAVORITES, data.favorites);
      if (data.history) Storage.saveHistory(data.history);
      if (data.settings) setJSON(KEYS.SETTINGS, data.settings);
    },

    // ---- Экспорт / импорт только карты ----
    exportMap: function () {
      return {
        exportedAt: new Date().toISOString(),
        type: "gym_map_backup",
        mapPoints: Storage.getMapPoints()
      };
    },
    importMap: function (data) {
      if (!data || !data.mapPoints) throw new Error("Файл не похож на резервную копию карты");
      Storage.saveMapPoints(data.mapPoints);
    },

    // ---- Экспорт / импорт только истории ----
    exportHistory: function () {
      return {
        exportedAt: new Date().toISOString(),
        type: "gym_history_backup",
        history: Storage.getHistory()
      };
    },
    importHistory: function (data) {
      if (!data || !data.history) throw new Error("Файл не похож на резервную копию истории");
      Storage.saveHistory(data.history);
    }
  };

  window.Storage = Storage;
})();
