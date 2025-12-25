
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, CompanyProfile, InvoiceItem } from '../types';
import { db } from '../db';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number): string => {
    if (n === 0) return '';
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += '-' + a[n % 10].trim();
      }
    }
    return str.trim() + ' ';
  };

  if (num === 0) return 'Zero Rupees Only';
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = 'Rupees ' + inWords(integerPart);
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result + 'Only';
};

export const generateInvoicePDF = async (invoice: Invoice, template: string = 'authentic') => {
  const profile = await db.settings.get(1);
  if (!profile) return;

  const isLandscape = template === 'landscape';
  const doc = new jsPDF({ 
    orientation: isLandscape ? 'landscape' : 'portrait', 
    unit: 'mm', 
    format: 'a4' 
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 7;

  // --- Background Watermark ---
  doc.setTextColor(248, 248, 248);
  doc.setFontSize(45);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.companyName, pageWidth / 2, pageHeight / 2, { 
    align: 'center', 
    angle: 45 
  });
  doc.setTextColor(0, 0, 0); // Reset

  // Outer Border
  doc.setLineWidth(0.3);
  doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));

  // --- Top Header ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN No. ${profile.gstin}`, margin + 2, margin + 4);
  
  // Center Title
  doc.setFontSize(10);
  doc.text('TAX INVOICE', pageWidth / 2, margin + 4, { align: 'center' });
  
  // Explicitly ORIGINAL COPY
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('ORIGINAL FOR BUYER', pageWidth - margin - 2, margin + 4, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.2);
  doc.line(margin, margin + 6, pageWidth - margin, margin + 6);

  // --- Company Branding ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.companyName, pageWidth / 2, margin + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profile.addressLine1}, ${profile.addressLine2}`, pageWidth / 2, margin + 16, { align: 'center' });
  
  const dlStr = `D.L. No: ${profile.dlNo1 || ''}, ${profile.dlNo2 || ''}, ${profile.dlNo3 || ''}, ${profile.dlNo4 || ''}`.replace(/, ,/g, '').replace(/, $/g, '');
  doc.setFontSize(7.5);
  doc.text(dlStr, pageWidth / 2, margin + 20, { align: 'center' });

  // Contact Info
  doc.setFontSize(9);
  const phones = profile.phone.split(',');
  phones.forEach((p, i) => {
    doc.text(`Ph: ${p.trim()}`, pageWidth - margin - 5, margin + 12 + (i * 4), { align: 'right' });
  });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Subject to ${profile.jurisdiction || 'Ahmedabad'} Jurisdiction`, pageWidth - margin - 5, margin + 24, { align: 'right' });

  doc.line(margin, margin + 27, pageWidth - margin, margin + 27);

  // --- Purchaser & Invoice Metadata ---
  const gridTop = margin + 27;
  const midPoint = (pageWidth / 2) + 10;

  doc.line(midPoint, gridTop, midPoint, gridTop + 30);

  // Left: Purchaser
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("PURCHASER'S NAME & ADDRESS", margin + 2, gridTop + 4);
  doc.line(margin, gridTop + 5, midPoint, gridTop + 5);
  
  doc.setFontSize(9);
  doc.text(invoice.partyName, margin + 2, gridTop + 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.partyAddress || '', margin + 2, gridTop + 13, { maxWidth: 85 });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN : ${invoice.partyGstin || 'URD'}`, margin + 2, gridTop + 28);

  // Right: Invoice Info
  doc.setFontSize(9);
  doc.text(`INVOICE NO. : ${invoice.invoiceNo}`, midPoint + 2, gridTop + 5);
  doc.text(`DATE : ${new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin - 2, gridTop + 5, { align: 'right' });
  
  doc.line(midPoint, gridTop + 8, pageWidth - margin, gridTop + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`GR No. : ${invoice.grNo || 'N/A'}`, midPoint + 2, gridTop + 13);
  doc.text(`Transport : ${invoice.transport || 'Direct'}`, midPoint + 2, gridTop + 18);
  doc.text(`Vehicle No : ${invoice.vehicleNo || 'Self'}`, midPoint + 2, gridTop + 23);

  doc.line(margin, gridTop + 30, pageWidth - margin, gridTop + 30);

  // --- Product Table ---
  const tableHeaders = [
    ['S.N', 'ITEM DESCRIPTION', 'Batch', 'Exp', 'HSN', 'MRP', 'QTY', 'Fr.', 'RATE', 'Disc%', 'Taxable', 'SGST', 'CGST', 'IGST', 'TOTAL'],
  ];

  const tableBody = invoice.items.map((item, idx) => {
    return [
      idx + 1,
      item.name,
      item.batch,
      item.expiry,
      item.hsn,
      item.mrp.toFixed(2),
      item.quantity,
      item.freeQuantity || 0,
      item.saleRate.toFixed(2),
      item.discountPercent.toFixed(1),
      item.taxableValue.toFixed(2),
      (item.igstAmount > 0 ? '-' : item.sgstAmount.toFixed(2)),
      (item.igstAmount > 0 ? '-' : item.cgstAmount.toFixed(2)),
      (item.igstAmount > 0 ? item.igstAmount.toFixed(2) : '-'),
      item.totalAmount.toFixed(2)
    ];
  });

  autoTable(doc, {
    startY: gridTop + 32,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 1, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.1, 
      textColor: [0, 0, 0],
      font: 'helvetica'
    },
    headStyles: { 
      fillColor: [245, 245, 245], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold', 
      halign: 'center' 
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 45 },
      14: { fontStyle: 'bold', halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  // Safe table finalY lookup
  const lastTable = (doc as any).lastAutoTable;
  const finalY = (lastTable ? lastTable.finalY : gridTop + 60) + 5;

  // --- HSN Summary ---
  const hsnGroups = invoice.items.reduce((acc, item) => {
    if (!acc[item.hsn]) acc[item.hsn] = { taxable: 0, tax: 0 };
    acc[item.hsn].taxable += item.taxableValue;
    acc[item.hsn].tax += (item.sgstAmount + item.cgstAmount + item.igstAmount);
    return acc;
  }, {} as Record<string, any>);

  const hsnBody = Object.entries(hsnGroups).map(([hsn, data]) => [
    hsn,
    data.taxable.toFixed(2),
    data.tax.toFixed(2),
    (data.taxable + data.tax).toFixed(2)
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [['HSN/SAC', 'Taxable Amt', 'Total Tax', 'Net Value']],
    body: hsnBody,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0] },
    margin: { left: margin },
    tableWidth: pageWidth / 2.5
  });

  // --- Totals Box ---
  const totalBoxX = pageWidth / 2 + 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Taxable:`, totalBoxX, finalY + 4);
  doc.text(invoice.totalTaxable.toFixed(2), pageWidth - margin - 2, finalY + 4, { align: 'right' });

  doc.text(`GST Total:`, totalBoxX, finalY + 8);
  doc.text((invoice.totalSGST + invoice.totalCGST + invoice.totalIGST).toFixed(2), pageWidth - margin - 2, finalY + 8, { align: 'right' });

  doc.line(totalBoxX, finalY + 11, pageWidth - margin, finalY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`GRAND TOTAL:`, totalBoxX, finalY + 16);
  doc.text(`₹ ${Math.round(invoice.grandTotal).toFixed(2)}`, pageWidth - margin - 2, finalY + 16, { align: 'right' });

  // --- Bank & Signature ---
  const tableSummary = (doc as any).lastAutoTable;
  const bottomY = Math.max(finalY + 25, (tableSummary ? tableSummary.finalY : finalY + 10) + 5);
  
  // Bank Details
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('OUR BANK DETAILS:', margin + 2, bottomY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank Name: ${profile.bankName || 'HDFC BANK LTD'}`, margin + 2, bottomY + 4);
  doc.text(`A/C No: ${profile.bankAccNo || '50200021458796'}`, margin + 2, bottomY + 8);
  doc.text(`IFSC: ${profile.bankIfsc || 'HDFC0001425'}`, margin + 2, bottomY + 12);

  // QR Placeholder
  doc.setDrawColor(200, 200, 200);
  doc.rect(pageWidth / 2 - 10, bottomY - 2, 20, 20);
  doc.setFontSize(5);
  doc.text('GST QR', pageWidth / 2, bottomY + 10, { align: 'center' });
  doc.setDrawColor(0, 0, 0);

  // Signatures
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${profile.companyName}`, pageWidth - margin - 5, bottomY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('Receiver\'s Signature', margin + 2, pageHeight - margin - 10);
  doc.text('Authorized Signatory', pageWidth - margin - 5, pageHeight - margin - 10, { align: 'right' });

  // Footer Disclaimers
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`* This is a computer generated invoice and does not require physical signature.`, pageWidth / 2, pageHeight - margin - 2, { align: 'center' });
  doc.text(`Bill Amount In Words : ${numberToWords(Math.round(invoice.grandTotal))}`, margin + 2, pageHeight - margin - 5);

  doc.save(`ORIGINAL_INVOICE_${invoice.invoiceNo}.pdf`);
};
