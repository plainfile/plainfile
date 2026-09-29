// Единый источник правды о страницах сайта.
//
// ВАЖНО: этот файл импортируется не только Vite, но и Node-скриптами
// (scripts/generate-sitemap.mjs, scripts/prerender.js через tsx).
// Поэтому здесь запрещены: JSX, алиасы `@/` (только относительные пути)
// и любые импорты, требующие vite-плагинов.
//
// Порядок элементов в ROUTES = порядок в sitemap.
// Чтобы добавить инструмент: создайте папку src/tools/<id>/ (см. CONTRACT.md)
// и добавьте ОДНУ запись ниже. Каталог (/tools) и навигация обновляются сами.

import { type ComponentType, lazy } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, FilePenLine, Files, ImageIcon } from 'lucide-react';

const Home = lazy(() => import('./pages/Home'));
const Tools = lazy(() => import('./pages/Tools'));
const Privacy = lazy(() => import('./pages/Privacy'));
const RedactPdf = lazy(() => import('./tools/redact/RedactPdf'));
const FillPdf = lazy(() => import('./tools/fill/FillPdf'));
const FormsHub = lazy(() => import('./tools/fill/FormsHub'));
const FormScenario = lazy(() => import('./tools/fill/FormScenario'));
const RedactBankStatement = lazy(() => import('./tools/redact/pages/RedactBankStatement'));
const RedactSsn = lazy(() => import('./tools/redact/pages/RedactSsn'));
const RedactMedicalRecords = lazy(() => import('./tools/redact/pages/RedactMedicalRecords'));
const RedactEmails = lazy(() => import('./tools/redact/pages/RedactEmails'));
const RedactLegalDocuments = lazy(() => import('./tools/redact/pages/RedactLegalDocuments'));
const RedactForFoia = lazy(() => import('./tools/redact/pages/RedactForFoia'));
const HowToRedactPdfProperly = lazy(() => import('./pages/guides/HowToRedactPdfProperly'));
const WhyBlackMarkerFails = lazy(() => import('./pages/guides/WhyBlackMarkerFails'));
const PrivacyScanPdfAlternative = lazy(() => import('./pages/guides/PrivacyScanPdfAlternative'));
const HeicToJpg = lazy(() => import('./tools/heic/HeicToJpg'));
const HeicWontOpenOnWindows = lazy(() => import('./tools/heic/pages/HeicWontOpenOnWindows'));
const HeicCantUpload = lazy(() => import('./tools/heic/pages/HeicCantUpload'));
const HeicConvertOnIphone = lazy(() => import('./tools/heic/pages/HeicConvertOnIphone'));
const HeicNotSupportedInCanva = lazy(() => import('./tools/heic/pages/HeicNotSupportedInCanva'));

export type RouteKind = 'page' | 'tool' | 'scenario' | 'guide';

export interface RouteManifestItem {
  /** URL-путь роута. */
  path: string;
  /** Человекочитаемый заголовок страницы. */
  label: string;
  /** Тип страницы. kind: 'tool' попадает в каталог на /tools. */
  kind: RouteKind;
  /** SEO-priority для sitemap.xml. */
  priority: number;
  /** SEO-changefreq для sitemap.xml. */
  changefreq: string;
  /** React-компонент страницы (обычно lazy). */
  element: ComponentType;
  /** Описание для карточки в каталоге (только kind: 'tool'). */
  description?: string;
  /** Иконка для карточки в каталоге (только kind: 'tool'). */
  icon?: LucideIcon;
  /** Статус для бейджа в каталоге (только kind: 'tool'). */
  status?: 'ready' | 'beta' | 'planned';
  /** Если задано — пункт появляется в шапке сайта с этой подписью. */
  navLabel?: string;
  /** Если задано — пункт появляется в футере с этой подписью. */
  footerLabel?: string;
}

export const ROUTES: RouteManifestItem[] = [
  { path: '/', label: 'Home', kind: 'page', priority: 1.0, changefreq: 'weekly', element: Home },
  { path: '/tools', label: 'Tools', kind: 'page', priority: 0.8, changefreq: 'weekly', element: Tools },
  { path: '/privacy', label: 'Privacy', kind: 'page', priority: 0.4, changefreq: 'monthly', element: Privacy },
  {
    path: '/pdf/redact', label: 'Redact PDF', kind: 'tool', priority: 0.9, changefreq: 'weekly', element: RedactPdf,
    description: 'Permanently remove sensitive text and images from PDFs in your browser.',
    icon: FileText, status: 'ready', navLabel: 'Redact PDF', footerLabel: 'Redact PDF',
  },
  {
    path: '/pdf/fill', label: 'Fill PDF Forms', kind: 'tool', priority: 0.9, changefreq: 'weekly', element: FillPdf,
    description: 'Fill PDF forms in your browser. Your data stays on your device.',
    icon: FilePenLine, status: 'ready',
  },
  {
    path: '/forms', label: 'Forms Hub', kind: 'tool', priority: 0.9, changefreq: 'weekly', element: FormsHub,
    description: 'Fill W-9, I-9 and other government forms with embedded templates.',
    icon: Files, status: 'ready', navLabel: 'PDF Forms', footerLabel: 'PDF Forms',
  },
  { path: '/forms/w-9', label: 'Fill W-9', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/forms/i-9', label: 'Fill I-9', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/forms/ds-11', label: 'Fill DS-11', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/forms/ds-82', label: 'Fill DS-82', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/forms/w-4', label: 'Fill W-4', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/forms/schengen', label: 'Fill Schengen Visa', kind: 'scenario', priority: 0.9, changefreq: 'weekly', element: FormScenario },
  { path: '/pdf/redact-bank-statement', label: 'Redact Bank Statement', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactBankStatement },
  { path: '/pdf/redact-ssn', label: 'Redact SSN', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactSsn },
  { path: '/pdf/redact-medical-records', label: 'Redact Medical Records', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactMedicalRecords },
  { path: '/pdf/redact-emails', label: 'Redact Email Addresses', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactEmails },
  { path: '/pdf/redact-legal-documents', label: 'Redact Legal Documents', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactLegalDocuments },
  { path: '/pdf/redact-for-foia', label: 'Redact for FOIA', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: RedactForFoia },
  { path: '/guides/how-to-redact-pdf-properly', label: 'How to Redact a PDF Properly', kind: 'guide', priority: 0.7, changefreq: 'monthly', element: HowToRedactPdfProperly },
  { path: '/guides/why-black-marker-redaction-fails', label: 'Why Black Marker Redaction Fails', kind: 'guide', priority: 0.6, changefreq: 'monthly', element: WhyBlackMarkerFails },
  { path: '/compare/privacyscanpdf-alternative', label: 'PrivacyScanPDF Alternative', kind: 'guide', priority: 0.6, changefreq: 'monthly', element: PrivacyScanPdfAlternative },
  {
    path: '/heic/to-jpg', label: 'HEIC to JPG', kind: 'tool', priority: 0.9, changefreq: 'weekly', element: HeicToJpg,
    description: 'Convert iPhone HEIC photos to JPG or PNG in your browser. Batch, ZIP, no upload.',
    icon: ImageIcon, status: 'ready',
  },
  { path: '/heic/wont-open-on-windows', label: "HEIC Won't Open on Windows", kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: HeicWontOpenOnWindows },
  { path: '/heic/cant-upload', label: "Can't Upload HEIC", kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: HeicCantUpload },
  { path: '/heic/convert-on-iphone', label: 'Convert HEIC on iPhone', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: HeicConvertOnIphone },
  { path: '/heic/not-supported-in-canva', label: 'HEIC Not Supported in Canva', kind: 'scenario', priority: 0.8, changefreq: 'weekly', element: HeicNotSupportedInCanva },
];

/** Инструменты для каталога на /tools — в порядке манифеста. */
export const TOOL_ROUTES: RouteManifestItem[] = ROUTES.filter((r) => r.kind === 'tool');
