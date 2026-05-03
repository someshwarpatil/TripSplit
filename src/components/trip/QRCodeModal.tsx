'use client';

import { QRCodeSVG } from 'qrcode.react';

interface Props {
  url: string;
  tripName: string;
}

export default function QRCodeModal({ url, tripName }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="bg-white p-4 rounded-2xl">
        <QRCodeSVG value={url} size={200} level="M" />
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] text-center">
        Scan to join <strong className="text-[var(--color-text)]">{tripName}</strong>
      </p>
      <p className="text-xs text-[var(--color-text-secondary)] break-all text-center px-4">{url}</p>
    </div>
  );
}
