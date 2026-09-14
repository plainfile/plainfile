import { type ComponentType, lazy } from 'react';

const Home = lazy(() => import('./pages/Home'));
const Tools = lazy(() => import('./pages/Tools'));
const Privacy = lazy(() => import('./pages/Privacy'));
const RedactPdf = lazy(() => import('./pages/RedactPdf'));
const RedactBankStatement = lazy(() => import('./pages/scenarios/RedactBankStatement'));
const RedactSsn = lazy(() => import('./pages/scenarios/RedactSsn'));
const RedactMedicalRecords = lazy(() => import('./pages/scenarios/RedactMedicalRecords'));
const RedactEmails = lazy(() => import('./pages/scenarios/RedactEmails'));
const RedactLegalDocuments = lazy(() => import('./pages/scenarios/RedactLegalDocuments'));
const RedactForFoia = lazy(() => import('./pages/scenarios/RedactForFoia'));
const HowToRedactPdfProperly = lazy(() => import('./pages/guides/HowToRedactPdfProperly'));
const WhyBlackMarkerFails = lazy(() => import('./pages/guides/WhyBlackMarkerFails'));

export interface RouteManifestItem {
  path: string;
  label: string;
  priority: number;
  changefreq: string;
  element: ComponentType;
}

export const ROUTES: RouteManifestItem[] = [
  { path: '/', label: 'Home', priority: 1.0, changefreq: 'weekly', element: Home },
  { path: '/tools', label: 'Tools', priority: 0.8, changefreq: 'weekly', element: Tools },
  { path: '/privacy', label: 'Privacy', priority: 0.4, changefreq: 'monthly', element: Privacy },
  { path: '/pdf/redact', label: 'Redact PDF', priority: 0.9, changefreq: 'weekly', element: RedactPdf },
  { path: '/pdf/redact-bank-statement', label: 'Redact Bank Statement', priority: 0.8, changefreq: 'weekly', element: RedactBankStatement },
  { path: '/pdf/redact-ssn', label: 'Redact SSN', priority: 0.8, changefreq: 'weekly', element: RedactSsn },
  { path: '/pdf/redact-medical-records', label: 'Redact Medical Records', priority: 0.8, changefreq: 'weekly', element: RedactMedicalRecords },
  { path: '/pdf/redact-emails', label: 'Redact Email Addresses', priority: 0.8, changefreq: 'weekly', element: RedactEmails },
  { path: '/pdf/redact-legal-documents', label: 'Redact Legal Documents', priority: 0.8, changefreq: 'weekly', element: RedactLegalDocuments },
  { path: '/pdf/redact-for-foia', label: 'Redact for FOIA', priority: 0.8, changefreq: 'weekly', element: RedactForFoia },
  { path: '/guides/how-to-redact-pdf-properly', label: 'How to Redact a PDF Properly', priority: 0.7, changefreq: 'monthly', element: HowToRedactPdfProperly },
  { path: '/guides/why-black-marker-redaction-fails', label: 'Why Black Marker Redaction Fails', priority: 0.6, changefreq: 'monthly', element: WhyBlackMarkerFails },
];
