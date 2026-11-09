import { qualityService } from './quality-service.js';
import { auditService } from '../dependency-audit/audit-service.js';
import { standardsService } from '../standards/standards-service.js';
import { doctorService } from '../diagnostics/doctor-service.js';
import {
  type QualityReport,
  type SecurityAuditReport,
  type StandardsReport,
  type DoctorReport,
} from '../../types/index.js';

export interface ProjectHealthReport {
  project: string;
  timestamp: string;
  healthy: boolean;
  quality: QualityReport;
  security: SecurityAuditReport;
  standards: StandardsReport;
  diagnostics: DoctorReport;
  score: number;
}

export class HealthService {
  public async assess(cwd?: string): Promise<ProjectHealthReport> {
    const root = cwd || process.cwd();

    const quality = await qualityService.runChecks({ cwd: root });
    const security = await auditService.audit({ cwd: root });
    const standards = await standardsService.check(root);
    const diagnostics = await doctorService.diagnose(root);

    let passedMetrics = 0;
    let totalMetrics = 0;

    // Quality weight
    totalMetrics += quality.summary.total;
    passedMetrics += quality.summary.passed;

    // Security weight
    totalMetrics += 1;
    if (security.policyPassed) passedMetrics += 1;

    // Standards weight
    totalMetrics += standards.totalRules;
    passedMetrics += standards.passedCount;

    const score = totalMetrics > 0 ? Math.round((passedMetrics / totalMetrics) * 100) : 100;
    const healthy = quality.overallStatus !== 'FAIL' && security.policyPassed && standards.passed;

    return {
      project: quality.projectName,
      timestamp: new Date().toISOString(),
      healthy,
      quality,
      security,
      standards,
      diagnostics,
      score,
    };
  }
}

export const healthService = new HealthService();
