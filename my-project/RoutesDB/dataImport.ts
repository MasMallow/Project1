import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { google } from 'googleapis';

export class DataImporter {
    static async importFromCSV(buffer: Buffer): Promise<any[]> {
        return parse(buffer, { columns: true });
    }

    static async importFromExcel(buffer: Buffer): Promise<any[]> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.worksheets[0];
        const data: any[] = [];
        
        // Get headers from first row
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell) => {
            headers.push(cell.value?.toString() || '');
        });
        
        // Get data from remaining rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
            
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
                rowData[headers[colNumber - 1]] = cell.value;
            });
            data.push(rowData);
        });
        
        return data;
    }

    static async importFromGoogleSheet(sheetId: string, auth: any): Promise<any[]> {
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'A:Z'
        });

        const rows = response.data.values;
        if (!rows?.length) return [];

        const headers = rows[0] as string[];
        return rows.slice(1).map((row: any[]) => 
            Object.fromEntries(headers.map((header: string, i: number) => [header, row[i]]))
        );
    }
}