/* Расстановка тренажёров на карте площадки.
   Это ПРЕДВАРИТЕЛЬНАЯ схема — номера и позиции не окончательные и уточняются в разделе
   «Карта» → «Проверка во дворе». Справочник тренажёров (data/trainers.js) хранится отдельно
   и связывается с точкой только через trainerId — так тренажёр можно переместить или
   переназначить без изменения его карточки, фото и техники. */

window.APP_DATA = window.APP_DATA || {};

(function () {
  // Три горизонтальных ряда по семь точек (номера мест на площадке)
  var rows = [
    [1, 3, 4, 5, 6, 7, 8],
    [2, 15, 13, 17, 18, 19, 9],
    [21, 16, 14, 20, 12, 11, 10]
  ];

  // Начальное соответствие «номер места» → «идентификатор тренажёра из справочника»
  var initialAssignment = {
    1: "MB7.29E",
    2: "MB7.37.3E",
    3: "MB7.70E",
    4: "MB7.44E",
    5: "MB7.63E",
    6: "MB7.45E",
    7: "MB7.50E",
    8: "MB7.30E",
    9: "MB7.32E",
    10: "MB7.79E",
    11: "MB7.65E",
    12: "MB7.38.3E",
    13: "MB7.74",
    14: "MB7.56.3E",
    15: "MB7.31E",
    16: "MB7.43E",
    17: "MB7.30.3E",
    18: "MB7.64E",
    19: "MB7.68E",
    20: "MB7.39.3E",
    21: "MB7.75E"
  };

  var points = [];
  rows.forEach(function (rowNumbers, rowIndex) {
    rowNumbers.forEach(function (pointNumber, colIndex) {
      var trainerId = initialAssignment[pointNumber];
      var trainer = window.APP_DATA.trainers ? window.APP_DATA.getTrainer(trainerId) : null;
      points.push({
        id: "p" + pointNumber,
        pointNumber: pointNumber,
        trainerId: trainerId,
        row: rowIndex,
        col: colIndex,
        x: 8 + colIndex * 14, // % по горизонтали
        y: 16 + rowIndex * 34, // % по вертикали
        label: trainer ? trainer.name : "",
        status: "Не проверено",
        updatedAt: "2026-09-14"
      });
    });
  });

  window.APP_DATA.mapDefault = points;
  window.APP_DATA.mapMeta = {
    lastFullUpdate: "2026-09-14",
    totalPoints: points.length
  };
})();
