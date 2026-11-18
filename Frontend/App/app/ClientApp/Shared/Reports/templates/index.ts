// =====================================================================================
//  templates/index.ts  -  قوالب تقارير جاهزة (JSON) — Studio هيعرضها كمعرض قوالب
//    SalesInvoice_A4   : فاتورة ضريبية A4 (header + lines) + QR زاتكا + المبلغ بالحروف
//    Receipt_80mm      : إيصال كاشير حراري 80 مم (طول مفتوح) + QR + باركود رقم الفاتورة
//    BarcodeLabels_A4  : ملصقات باركود A4 ‏3×8 (70×37 مم) — حقل Copies = عدد النسخ
// =====================================================================================

import type { ReportLayout } from "../ReportLayoutTypes";
import salesInvoiceA4 from "./SalesInvoice_A4.layout.json";
import receipt80 from "./Receipt_80mm.layout.json";
import barcodeLabels from "./BarcodeLabels_A4.layout.json";

export const SalesInvoiceA4 = salesInvoiceA4 as unknown as ReportLayout;
export const Receipt80mm = receipt80 as unknown as ReportLayout;
export const BarcodeLabelsA4 = barcodeLabels as unknown as ReportLayout;

export const REPORT_TEMPLATES: Record<string, ReportLayout> = {
  SalesInvoice_A4: SalesInvoiceA4,
  Receipt_80mm: Receipt80mm,
  BarcodeLabels_A4: BarcodeLabelsA4,
};
