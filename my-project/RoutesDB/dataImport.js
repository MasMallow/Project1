"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImporter = void 0;
const sync_1 = require("csv-parse/sync");
const exceljs_1 = __importDefault(require("exceljs"));
const googleapis_1 = require("googleapis");
class DataImporter {
    static importFromCSV(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, sync_1.parse)(buffer, { columns: true });
        });
    }
    static importFromExcel(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new exceljs_1.default.Workbook();
            yield workbook.xlsx.load(buffer);
            const worksheet = workbook.worksheets[0];
            const data = [];
            // Get headers from first row
            const headers = [];
            worksheet.getRow(1).eachCell((cell) => {
                var _a;
                headers.push(((_a = cell.value) === null || _a === void 0 ? void 0 : _a.toString()) || '');
            });
            // Get data from remaining rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return; // Skip header row
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber - 1]] = cell.value;
                });
                data.push(rowData);
            });
            return data;
        });
    }
    static importFromGoogleSheet(sheetId, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
            const response = yield sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'A:Z'
            });
            const rows = response.data.values;
            if (!(rows === null || rows === void 0 ? void 0 : rows.length))
                return [];
            const headers = rows[0];
            return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
        });
    }
}
exports.DataImporter = DataImporter;
