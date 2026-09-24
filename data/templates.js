/* Шаблоны тренировочных дней.
   Здесь тренажёры указаны идентификаторами из справочника (data/trainers.js), а НЕ номерами
   мест на карте — так план не «ломается», если тренажёр переставят на площадке.
   Текущий номер места для каждого тренажёра всегда подтягивается из data/mapDefault.js
   (или из сохранённой пользователем схемы) в момент показа. */

window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.templates = {
  legs: {
    focusId: "legs",
    base: ["MB7.65E", "MB7.74"], // Приседание, Жим ногами
    extra: ["MB7.44E", "MB7.43E", "MB7.45E", "MB7.50E"] // Разгибание, сгибание, отведение, сведение
  },
  back_arms: {
    focusId: "back_arms",
    base: ["MB7.37.3E", "MB7.70E", "MB7.38.3E", "MB7.55E", "MB7.73E"], // Тяга к поясу, рычажная тяга, вертикальная тяга
    extra: ["MB7.39.3E", "MB7.67E"], // Бицепс сидя
    // Мультиштанга включается только вручную из каталога, после проверки конструкции —
    // не входит в автоматическую подборку до тех пор, пока needsReview === true.
    optionalReviewRequired: ["MB7.68E"]
  },
  chest_shoulders: {
    focusId: "chest_shoulders",
    pressChoices: ["MB7.30E", "MB7.79E", "MB7.30.3E", "MB7.64E"], // основной жим от груди
    angleOrFlyChoices: ["MB7.56.3E", "MB7.75E", "MB7.31E"], // жим под углом или сведение рук
    shoulderChoices: ["MB7.29E", "MB7.63E", "MB7.32E"] // одно упражнение на плечи
  },
  full_body: {
    focusId: "full_body",
    legsChoices: ["MB7.65E", "MB7.74"],
    pullChoices: ["MB7.37.3E", "MB7.70E", "MB7.38.3E", "MB7.55E", "MB7.73E"],
    pressChoices: ["MB7.30E", "MB7.79E", "MB7.30.3E", "MB7.64E"],
    armsShouldersChoices: ["MB7.29E", "MB7.63E", "MB7.32E", "MB7.39.3E", "MB7.67E"]
  },
  light: {
    focusId: "light",
    // Небольшой пул лёгких изолирующих упражнений с уменьшенным объёмом
    trainerPool: ["MB7.44E", "MB7.43E", "MB7.31E", "MB7.39.3E", "MB7.32E"],
    // Немашинные активности восстановительного дня
    activities: [
      { name: "Спокойная ходьба", note: "10–15 минут в комфортном темпе" },
      { name: "Растяжка основных групп мышц", note: "5–10 минут, без резких движений" },
      { name: "Дыхательное восстановление", note: "Несколько минут спокойного дыхания и отдыха" }
    ]
  }
};

/* Порядок ротации фокусов дня при автоматическом планировании */
window.APP_DATA.focusRotation = {
  legs: "back_arms",
  back_arms: "chest_shoulders",
  chest_shoulders: "legs",
  full_body: "light",
  light: "legs"
};

/* Ориентировочные диапазоны подходов/повторений для стартовых рекомендаций */
window.APP_DATA.repGuides = {
  upper: { reps: "8–12", setsNormal: 2, setsLow: 1 },
  legs: { reps: "10–15", setsNormal: 2, setsLow: 1 },
  rest: "60–90 секунд"
};
