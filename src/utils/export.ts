import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Trip, Settlement, Advance } from '@/types';
import { formatCurrency, formatDate } from './format';
import { calculateBalances, computePairwiseDebts, getUserTotalSpend, getTotalSpend } from './balance';

interface Member {
  uid: string;
  displayName: string;
}

function getMemberName(uid: string, members: Member[]): string {
  return members.find((m) => m.uid === uid)?.displayName || 'Unknown';
}

// ── CSV Export ──

export function exportCSV(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[],
  members: Member[],
  advances: Advance[] = []
) {
  const rows: string[][] = [];

  // Header
  rows.push(['Description', 'Amount', 'Paid By', 'Date', 'Split Type', 'Location', ...members.map((m) => m.displayName)]);

  // Expense rows
  expenses.forEach((exp) => {
    const memberSplits = members.map((m) => {
      const split = exp.splits[m.uid];
      return split !== undefined ? split.toFixed(2) : '0.00';
    });
    rows.push([
      exp.description,
      exp.amount.toFixed(2),
      getMemberName(exp.paidByUid, members),
      exp.date,
      exp.splitType,
      exp.location?.name || '',
      ...memberSplits,
    ]);
  });

  // Summary section
  rows.push([]);
  rows.push(['--- Summary ---']);
  rows.push(['Total Spend', getTotalSpend(expenses).toFixed(2)]);
  rows.push([]);

  // Per-member summary
  rows.push(['Member', 'Total Paid', 'Fair Share', 'Balance']);
  const balances = calculateBalances(expenses, settlements, trip.memberUids, advances, trip.adminUid);
  const fairShare = trip.memberUids.length > 0 ? getTotalSpend(expenses) / trip.memberUids.length : 0;
  members.forEach((m) => {
    const paid = getUserTotalSpend(m.uid, expenses);
    const bal = balances.get(m.uid) || 0;
    rows.push([m.displayName, paid.toFixed(2), fairShare.toFixed(2), bal.toFixed(2)]);
  });

  // Advances section
  if (advances.length > 0) {
    rows.push([]);
    rows.push(['--- Advances ---']);
    rows.push(['Member', 'Amount', 'Note']);
    advances.forEach((adv) => {
      rows.push([getMemberName(adv.memberUid, members), adv.amount.toFixed(2), adv.note || '']);
    });
  }

  // Settlements needed (pairwise — advances stay between member and admin only)
  const debts = computePairwiseDebts(expenses, settlements, advances, trip.adminUid);
  if (debts.length > 0) {
    rows.push([]);
    rows.push(['--- Settlements Needed ---']);
    rows.push(['From', 'To', 'Amount']);
    debts.forEach((d) => {
      rows.push([getMemberName(d.from, members), getMemberName(d.to, members), d.amount.toFixed(2)]);
    });
  }

  // Build CSV string
  const csv = rows.map((row) =>
    row.map((cell) => {
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped;
    }).join(',')
  ).join('\n');

  downloadFile(csv, `${trip.name} - Expenses.csv`, 'text/csv');
}

// ── PDF Export ──

export function exportPDF(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[],
  members: Member[],
  advances: Advance[] = []
) {
  const doc = new jsPDF();
  const currency = trip.currency;
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(trip.name, 14, y);
  y += 8;

  // Trip info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const info = [
    trip.destination && `${trip.destination}`,
    `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`,
    `${members.length} members`,
  ].filter(Boolean).join('  •  ');
  doc.text(info, 14, y);
  y += 6;

  // Total
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const total = getTotalSpend(expenses);
  doc.text(`Total Spend: ${formatCurrency(total, currency)}`, 14, y);
  y += 10;

  // Expenses table
  doc.setFontSize(11);
  doc.text('Expenses', 14, y);
  y += 2;

  const expenseRows = expenses.map((exp) => [
    exp.description,
    formatCurrency(exp.amount, currency),
    getMemberName(exp.paidByUid, members),
    exp.date,
    exp.splitType,
    exp.location?.name || '-',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount', 'Paid By', 'Date', 'Split', 'Location']],
    body: expenseRows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [230, 57, 70], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 14, right: 14 },
  });

  // Get current Y after table
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Member summary table
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Member Summary', 14, y);
  y += 2;

  const balances = calculateBalances(expenses, settlements, trip.memberUids, advances, trip.adminUid);
  const fairShare = trip.memberUids.length > 0 ? total / trip.memberUids.length : 0;

  const memberRows = members.map((m) => {
    const paid = getUserTotalSpend(m.uid, expenses);
    const bal = balances.get(m.uid) || 0;
    return [
      m.displayName,
      formatCurrency(paid, currency),
      formatCurrency(fairShare, currency),
      (bal >= 0 ? '+' : '') + formatCurrency(bal, currency),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Member', 'Total Paid', 'Fair Share', 'Balance']],
    body: memberRows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [230, 57, 70], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Advances section
  if (advances.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Advances', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Member', 'Amount', 'Note']],
      body: advances.map((adv) => [
        getMemberName(adv.memberUid, members),
        formatCurrency(adv.amount, currency),
        adv.note || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [230, 57, 70], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // Settlements needed (pairwise)
  const debts = computePairwiseDebts(expenses, settlements, advances, trip.adminUid);
  if (debts.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Settlements Needed', 14, y);
    y += 2;

    const debtRows = debts.map((d) => [
      getMemberName(d.from, members),
      getMemberName(d.to, members),
      formatCurrency(d.amount, currency),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['From', 'To', 'Amount']],
      body: debtRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [230, 57, 70], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(`Generated by TripSplit`, 14, 287);
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
  }

  doc.save(`${trip.name} - Expenses.pdf`);
}

// ── Helper ──

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
