import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getRekapSettings } from '@/actions/rekap-period-action';
import { DEFAULT_REKAP_SETTINGS } from '@/validations/rekap-validation';
import RekapPageClient from './_components/rekap-page-client';
import RekapLoading from './loading';

export const metadata: Metadata = {
  title: 'Rekap Keuangan',
  description: 'Visualisasi dan analitik keuangan bulanan serta siklus Anda.',
};

export default async function RekapPage() {
  const res = await getRekapSettings();
  const settings = res.success && res.data ? res.data : DEFAULT_REKAP_SETTINGS;

  return (
    <Suspense fallback={<RekapLoading />}>
      <RekapPageClient initialSettings={settings} />
    </Suspense>
  );
}
