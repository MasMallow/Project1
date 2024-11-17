import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import { google } from 'googleapis';
import { Buffer } from 'buffer';

export class DataExporter {
    static async exportToCSV(data: any[]): Promise<Buffer> {
        return Buffer.from(stringify(data, { header: true }));
    }

    static async exportToExcel(data: any[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');
        
        // Add headers
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);
        
        // Add data
        data.forEach(item => {
            worksheet.addRow(Object.values(item));
        });
        
        // Convert to buffer with explicit typing
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        return buffer;
    }

    static async exportToGoogleSheet(data: any[], auth: any): Promise<string> {
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title: `Export ${new Date().toISOString()}` }
            }
        });

        const sheetId = spreadsheet.data.spreadsheetId;
        if (!sheetId) throw new Error('Failed to create spreadsheet');

        await sheets.spreadsheets.values.update({
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
    }
}