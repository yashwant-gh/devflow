import { describe, it, expect } from 'vitest';
import { DoctorService } from '../../src/modules/diagnostics/doctor-service.js';

describe('DoctorService Environment Diagnostics', () => {
  it('should diagnose system runtime and tools', async () => {
    const doctorService = new DoctorService();
    const report = await doctorService.diagnose();

    expect(report.system.length).toBeGreaterThan(0);
    expect(report.system.some((s) => s.name === 'Operating System')).toBe(true);
    expect(report.system.some((s) => s.name === 'Architecture')).toBe(true);

    expect(report.tools.length).toBeGreaterThan(0);
    const nodeItem = report.tools.find((t) => t.name === 'Node.js');
    expect(nodeItem).toBeDefined();
    expect(nodeItem?.status).toBe('Installed');

    expect(report.project.length).toBeGreaterThan(0);
    expect(report.overallHealthy).toBe(true);
  });
});
