import got from "got";
import dayjs from "dayjs";
import Jimp, { cssColorToHex } from "jimp";

const api = got.extend({
  prefixUrl: "https://api-flag.fouloscopie.com",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en-US",
  },
  responseType: "json",
});

export const DESIRED_FLAG_RATIO = 1 / 2;

const mapCoordinatesToTargetRatioRectangleDistribution = (
  pixelCount: number,
  targetRatio: number
) => {
  const map: { x: number; y: number }[] = [];

  let currentX = 0;
  let currentY = 1;

  const mapIndexToColumn = (index: number) => {
    const x = currentX;
    const y = index - currentX * currentY;
    map[index] = { x, y };

    if (y >= currentY - 1) {
      currentX++;
    }
  };

  const mapIndexToRow = (index: number) => {
    const x = index - currentX * currentY;
    const y = currentY;
    map[index] = { x, y };

    if (x >= currentX - 1) {
      currentY++;
    }
  };

  for (let i = 0; i < pixelCount; i++) {
    const hasEnoughRows = Math.floor(currentX * targetRatio) <= currentY - 1;
    if (hasEnoughRows) {
      mapIndexToColumn(i);
    } else {
      mapIndexToRow(i);
    }
  }

  return map;
};

const getFlagResolutionFromIndexToCoordinateMap = (
  indexToCoordinateMap: { x: number; y: number }[]
) => {
  let width = 0,
    height = 0;
  for (let i = 0; i < indexToCoordinateMap.length; i++) {
    width = Math.max(width, indexToCoordinateMap[i].x + 1);
    height = Math.max(height, indexToCoordinateMap[i].y + 1);
  }
  return { width, height };
};

const getData = async () => {
  const response = await api.get<
    Array<{
      entityId: string;
      author: string;
      hexColor: string;
      indexInFlag: number;
    }>
  >("flag");

  return response.body;
};

const init = async () => {
  const data = await getData();

  const mapCoordinates = mapCoordinatesToTargetRatioRectangleDistribution(
    data.length,
    DESIRED_FLAG_RATIO
  );
  const size = getFlagResolutionFromIndexToCoordinateMap(mapCoordinates);

  new Jimp(size.width, size.height, function (err, image) {
    if (err) throw err;

    for (let i = 0; i < data.length; i++) {
      const { x, y } = mapCoordinates[i] || { x: -1, y: -1 };

      image.setPixelColor(cssColorToHex(data[i].hexColor), x, y);
    }

    image.write(
      `images/${dayjs().format("DD-MM-YYYY_HH-mm-ss")}.png`,
      (err) => {
        if (err) throw err;
      }
    );
  });
};

init();

export {};
