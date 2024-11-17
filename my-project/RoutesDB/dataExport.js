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
exports.DataExporter = void 0;
const sync_1 = require("csv-stringify/sync");
const exceljs_1 = __importDefault(require("exceljs"));
const googleapis_1 = require("googleapis");
const buffer_1 = require("buffer");
class DataExporter {
    static exportToCSV(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return buffer_1.Buffer.from((0, sync_1.stringify)(data, { header: true }));
        });
    }
    static exportToExcel(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Data');
            // Add headers
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);
            // Add data
            data.forEach(item => {
                worksheet.addRow(Object.values(item));
            });
            // Convert to buffer with explicit typing
            const buffer = yield workbook.xlsx.writeBuffer();
            return buffer;
        });
    }
    static exportToGoogleSheet(data, auth) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
            const spreadsheet = yield sheets.spreadsheets.create({
                requestBody: {
                    properties: { title: `Export ${new Date().toISOString()}` }
                }
            });
            const sheetId = spreadsheet.data.spreadsheetId;
            if (!sheetId)
                throw new Error('Failed to create spreadsheet');
            yield sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: 'A1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [
                        Object.keys(data[0]),
                        ...data.map(row => Object.values(row))
                    ]
                }
            });
            return sheetId;
        });
    }
}
exports.DataExporter = DataExporter;
