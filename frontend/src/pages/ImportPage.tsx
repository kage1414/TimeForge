import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Project } from '../types';

const PROJECTS_QUERY = `query { projects { id name client_name default_rate } }`;

interface RawRow {
  [key: string]: any;
}

interface ColumnMapping {
  date: string;
  start: string;
  end: string;
  description: string;
  paid: string;
  invoiceNumber: string;
}

interface ParsedEntry {
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  paid: boolean;
  invoice_number: string;
  hours: number;
  valid: boolean;
  error?: string;
}

const NONE = '-- None --';

function parseExcelTime(val: any): string | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') {
    // Excel serial time (fraction of day)
    const totalSeconds = Math.round(val * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  // Try to extract time from datetime string like "3/26/2026, 10:00:00 AM"
  const dtMatch = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (dtMatch) {
    let h = parseInt(dtMatch[1]);
    const m = parseInt(dtMatch[2]);
    const ampm = dtMatch[4];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

function parseExcelDate(val: any): string | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  // Try M/D/YYYY or MM/DD/YYYY
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = match[3].length === 2 ? '20' + match[3] : match[3];
    return `${year}-${month}-${day}`;
  }
  // Try YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  return null;
}

function parseBool(val: any): boolean {
  if (val == null || val === '') return false;
  const s = String(val).trim().toLowerCase();
  return ['true', 'yes', '1', 'y', 'paid', 'x'].includes(s);
}

export default function ImportPage() {
  const qc = useQueryClient();
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: NONE, start: NONE, end: NONE, description: NONE, paid: NONE, invoiceNumber: NONE });
  const [projectId, setProjectId] = useState('');
  const [fileName, setFileName] = useState('');

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await gql<{ projects: Project[] }>(PROJECTS_QUERY)).projects,
  });

  function parseCsv(text: string): RawRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      values.push(current.trim());
      const row: RawRow = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
  }

  function applyAutoMapping(cols: string[]) {
    const autoMap: ColumnMapping = { date: NONE, start: NONE, end: NONE, description: NONE, paid: NONE, invoiceNumber: NONE };
    for (const col of cols) {
      const lower = col.toLowerCase();
      if (lower.includes('date') && autoMap.date === NONE) autoMap.date = col;
      else if ((lower.includes('start') || lower === 'in') && autoMap.start === NONE) autoMap.start = col;
      else if ((lower.includes('end') || lower === 'out' || lower.includes('stop')) && autoMap.end === NONE) autoMap.end = col;
      else if ((lower.includes('desc') || lower.includes('note') || lower.includes('task')) && autoMap.description === NONE) autoMap.description = col;
      else if ((lower.includes('paid') || lower.includes('billed') || lower.includes('status')) && autoMap.paid === NONE) autoMap.paid = col;
      else if ((lower.includes('invoice') || lower.includes('inv')) && autoMap.invoiceNumber === NONE) autoMap.invoiceNumber = col;
    }
    setMapping(autoMap);
  }

  function loadData(json: RawRow[]) {
    if (json.length === 0) {
      toast.error('No data found in file');
      return;
    }
    const cols = Object.keys(json[0]);
    setColumns(cols);
    setRawData(json);
    applyAutoMapping(cols);
  }

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const text = await file.text();
      loadData(parseCsv(text));
    } else {
      toast.error('Please save your spreadsheet as CSV first (File > Save As > CSV)');
    }
  }, []);

  const parsed: ParsedEntry[] = rawData.map((row) => {
    const dateStr = mapping.date !== NONE ? parseExcelDate(row[mapping.date]) : null;
    const startStr = mapping.start !== NONE ? parseExcelTime(row[mapping.start]) : null;
    const endStr = mapping.end !== NONE ? parseExcelTime(row[mapping.end]) : null;
    const description = mapping.description !== NONE ? String(row[mapping.description] || '') : '';
    const paid = mapping.paid !== NONE ? parseBool(row[mapping.paid]) : false;
    const invoiceNumber = mapping.invoiceNumber !== NONE ? String(row[mapping.invoiceNumber] || '') : '';

    if (!dateStr || !startStr || !endStr) {
      return { date: dateStr || '', start_time: '', end_time: '', description, paid, invoice_number: invoiceNumber, hours: 0, valid: false, error: 'Missing date, start, or end time' };
    }

    const start_time = `${dateStr}T${startStr}:00`;
    const end_time = `${dateStr}T${endStr}:00`;
    const startMs = new Date(start_time).getTime();
    const endMs = new Date(end_time).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      return { date: dateStr, start_time, end_time, description, paid, invoice_number: invoiceNumber, hours: 0, valid: false, error: 'Invalid date/time' };
    }

    const hours = (endMs - startMs) / 3600000;
    if (hours <= 0) {
      return { date: dateStr, start_time, end_time, description, paid, invoice_number: invoiceNumber, hours: 0, valid: false, error: 'End time must be after start time' };
    }

    return { date: dateStr, start_time, end_time, description, paid, invoice_number: invoiceNumber, hours, valid: true };
  });

  const validEntries = parsed.filter((e) => e.valid);
  const invalidEntries = parsed.filter((e) => !e.valid);

  const importMutation = useMutation({
    mutationFn: () => {
      const entries = validEntries.map((e) => ({
        project_id: Number(projectId),
        description: e.description || null,
        start_time: new Date(e.start_time).toISOString(),
        end_time: new Date(e.end_time).toISOString(),
        is_billable: true,
        invoice_number: e.invoice_number || null,
      }));
      return gql<{ importTimeEntries: number }>(
        `mutation($entries: [ImportTimeEntryInput!]!) { importTimeEntries(entries: $entries) }`,
        { entries }
      );
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success(`Imported ${data.importTimeEntries} time entries`);
      setRawData([]);
      setColumns([]);
      setFileName('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedProject = projects.find((p) => String(p.id) === projectId);
  const canImport = validEntries.length > 0 && projectId;

  return (
    <div>
      <Link to="/time" className="text-indigo-600 hover:underline text-sm">&larr; Back to Time Entries</Link>
      <h1 className="text-2xl font-bold mb-6 mt-1">Import Time Entries</h1>

      {/* Step 1: File Upload */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">1. Upload CSV File</h2>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
            Choose File
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          {fileName && <span className="text-sm text-gray-600">{fileName} ({rawData.length} rows)</span>}
        </div>
      </div>

      {columns.length > 0 && (
        <>
          {/* Step 2: Project Selection */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="font-semibold mb-3">2. Select Project</h2>
            <select className="border rounded p-2 w-full max-w-md" value={projectId}
              onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.client_name})</option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-sm text-gray-500 mt-1">Default rate: ${Number(selectedProject.default_rate).toFixed(2)}/hr</p>
            )}
          </div>

          {/* Step 3: Column Mapping */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="font-semibold mb-3">3. Map Columns</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                ['date', 'Date *'],
                ['start', 'Start Time *'],
                ['end', 'End Time *'],
                ['description', 'Description'],
                ['paid', 'Paid/Billed'],
                ['invoiceNumber', 'Invoice Number'],
              ] as [keyof ColumnMapping, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <select className="border rounded p-2 w-full" value={mapping[key]}
                    onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}>
                    <option value={NONE}>{NONE}</option>
                    {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Preview */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">4. Preview ({validEntries.length} valid, {invalidEntries.length} invalid)</h2>
              <button
                onClick={() => importMutation.mutate()}
                disabled={!canImport || importMutation.isPending}
                className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {importMutation.isPending ? 'Importing...' : `Import ${validEntries.length} Entries`}
              </button>
            </div>

            {invalidEntries.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-700 font-medium mb-1">{invalidEntries.length} rows will be skipped:</p>
                {invalidEntries.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">Row {parsed.indexOf(e) + 2}: {e.error}</p>
                ))}
                {invalidEntries.length > 5 && <p className="text-xs text-red-600">...and {invalidEntries.length - 5} more</p>}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Start</th>
                    <th className="pb-2 pr-4">End</th>
                    <th className="pb-2 pr-4">Hours</th>
                    <th className="pb-2 pr-4">Description</th>
                    <th className="pb-2 pr-4">Paid</th>
                    <th className="pb-2">Invoice #</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((e, i) => (
                    <tr key={i} className={`border-b last:border-0 ${e.valid ? '' : 'bg-red-50'}`}>
                      <td className="py-2 pr-4">
                        {e.valid
                          ? <span className="text-green-600 text-xs font-medium">OK</span>
                          : <span className="text-red-600 text-xs font-medium" title={e.error}>Error</span>}
                      </td>
                      <td className="py-2 pr-4">{e.date}</td>
                      <td className="py-2 pr-4">{e.start_time ? new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-2 pr-4">{e.end_time ? new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-2 pr-4">{e.valid ? e.hours.toFixed(2) : '-'}</td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{e.description || '-'}</td>
                      <td className="py-2 pr-4">{e.paid ? 'Yes' : 'No'}</td>
                      <td className="py-2">{e.invoice_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && (
                <p className="text-sm text-gray-500 mt-2">Showing first 50 of {parsed.length} rows</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
