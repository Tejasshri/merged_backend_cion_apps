const excelToJson = require("convert-excel-to-json");

async function convertIntoJson(fileName) {
  const result = await excelToJson({
    sourceFile: fileName,
    header: {
      rows: 1, // Number of header rows
    },
  });

  return result;
}

module.exports = {
  convertIntoJson,
};
