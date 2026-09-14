/* Файл настроек: категории мышечных групп и их цвета.
   Цвет используется как дополнительный (не единственный) визуальный признак —
   везде рядом с цветом всегда показывается текстовая подпись категории. */

window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.categories = [
  { id: "chest", name: "Грудь и торс", color: "#D97757", colorSoft: "#FBE7DE" },
  { id: "back", name: "Спина", color: "#3E7CB1", colorSoft: "#DEEAF5" },
  { id: "shoulders", name: "Плечи", color: "#3FA79A", colorSoft: "#DDF0EC" },
  { id: "arms", name: "Руки", color: "#8B6FB3", colorSoft: "#E9E2F3" },
  { id: "legs", name: "Ноги и ягодицы", color: "#5C9A45", colorSoft: "#E1EEDA" },
  { id: "core", name: "Пресс и корпус", color: "#C79A2A", colorSoft: "#F4E9CC" },
  { id: "universal", name: "Универсальные", color: "#8A8F98", colorSoft: "#E7E8EA" }
];

window.APP_DATA.getCategory = function (id) {
  return window.APP_DATA.categories.find((c) => c.id === id) || window.APP_DATA.categories[6];
};

/* Фокусы дня для планировщика */
window.APP_DATA.focuses = [
  { id: "legs", name: "Ноги и ягодицы" },
  { id: "back_arms", name: "Спина и руки" },
  { id: "chest_shoulders", name: "Грудь и плечи" },
  { id: "full_body", name: "Полное тело" },
  { id: "light", name: "Лёгкий / восстановительный день" }
];

window.APP_DATA.getFocus = function (id) {
  return window.APP_DATA.focuses.find((f) => f.id === id);
};
