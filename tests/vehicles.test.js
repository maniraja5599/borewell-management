import { describe, it, expect } from 'vitest';
import { expiringDocs } from '../src/features/rigwork/vehiclesUI.js';

describe('Vehicles & document expiry alerts', () => {
    it('flags expired and <= 30 day expiring documents while ignoring > 30 day valid docs', () => {
        const alerts = expiringDocs({
            rcExpiry: '2026-11-20',     // expired (6 days ago)
            insExpiry: '2026-12-10',    // 14 days left
            permitExpiry: '2027-06-01', // valid
            fitExpiry: ''
        }, { today: '2026-11-26', warnDays: 30 });

        expect(alerts).toHaveLength(2);
        expect(alerts[0]).toMatchObject({ label: 'RC', expired: true, daysLeft: -6 });
        expect(alerts[1]).toMatchObject({ label: 'Insurance', expired: false, daysLeft: 14 });
    });
});
