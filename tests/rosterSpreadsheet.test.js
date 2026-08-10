import './setup.js';
import { describe, expect, it } from './test-api.js';
import { parseRosterFile, parseRosterXlsxBuffer } from '../src/utils/rosterSpreadsheet.ts';
import { createStoreZip } from '../src/utils/designExports.ts';

async function minimalRosterXlsx() {
  const files = [
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    },
    {
      name: 'xl/workbook.xml',
      data: '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Roster" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Player Name</t></is></c><c r="B1" t="inlineStr"><is><t>Jersey Name</t></is></c><c r="C1" t="inlineStr"><is><t>Number</t></is></c><c r="D1" t="inlineStr"><is><t>Jersey Size</t></is></c><c r="E1" t="inlineStr"><is><t>Shorts Size</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Seddig Etorki</t></is></c><c r="B2" t="inlineStr"><is><t>ETORKI</t></is></c><c r="C2"><v>20</v></c><c r="D2" t="inlineStr"><is><t>L</t></is></c><c r="E2" t="inlineStr"><is><t>L</t></is></c></row></sheetData></worksheet>',
    },
  ];
  return new Uint8Array(await createStoreZip(files).arrayBuffer());
}

describe('roster spreadsheet import', () => {
  it('imports XLSX rows without a third-party spreadsheet runtime', async () => {
    const rows = await parseRosterXlsxBuffer(await minimalRosterXlsx());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: 'Seddig Etorki',
      jerseyName: 'ETORKI',
      number: '20',
      jerseySize: 'L',
      shortsSize: 'L',
    });
  });

  it('imports CSV and rejects unsupported files', async () => {
    const csv = new File(['Player Name,Number,Jersey Size,Shorts Size\nOne,7,L,L'], 'roster.csv', {
      type: 'text/csv',
    });
    const rows = await parseRosterFile(csv);
    expect(rows[0]).toMatchObject({ name: 'One', number: '7', jerseySize: 'L', shortsSize: 'L' });
    const unsupported = new File(['bad'], 'roster.xls', { type: 'application/vnd.ms-excel' });
    let error = null;
    try {
      await parseRosterFile(unsupported);
    } catch (caught) {
      error = caught;
    }
    expect(error?.message).toBe('roster_file_type_unsupported');
  });
});
