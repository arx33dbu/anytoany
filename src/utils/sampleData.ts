export function createSampleDocument(): File {
  const content = `# Project Status & Operational Overview

## Executive Summary
This quarterly report highlights core operational metrics, cross-system performance benchmarks, and delivery milestones. 
All deliverables were completed on schedule with zero high-severity incidents.

## Key Performance Indicators
- Production Uptime: 99.98%
- Throughput: 14,200 records / sec
- Latency (p99): 18.4 ms
- Mean Time to Resolution: 12 minutes

## Operational Action Items
1. Consolidate legacy file formats and pipeline transformations.
2. Verify document printing layouts with strict 1-page fit constraints.
3. Validate client-side image optimization and multi-channel audio export.
4. Finalize Q4 infrastructure migrations and regional backups.

---
Prepared by System Operations · All metrics audited.
`;

  const blob = new Blob([content], { type: 'text/markdown' });
  return new File([blob], 'Project_Executive_Report.md', { type: 'text/markdown' });
}

export function createSampleImage(): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Elegant dark background with subtle grid
      const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
      gradient.addColorStop(0, '#18181b');
      gradient.addColorStop(1, '#09090b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 800);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 800);
        ctx.stroke();
      }
      for (let y = 0; y < 800; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // Geometric badge
      ctx.fillStyle = '#27272a';
      ctx.fillRect(100, 100, 1000, 600);
      ctx.strokeStyle = '#3f3f46';
      ctx.strokeRect(100, 100, 1000, 600);

      // Typography
      ctx.fillStyle = '#f4f4f5';
      ctx.font = '600 48px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Sample High-Res Graphic', 160, 240);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '400 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Ready for crop, rotation, filters, watermarking, or PDF print export', 160, 300);

      // Color swatches
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      colors.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(160 + idx * 80, 400, 60, 60);
      });
    }

    canvas.toBlob((blob) => {
      resolve(new File([blob!], 'Architecture_Diagram.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

export function createSampleDataset(): File {
  const csvContent = `Department,Q1_Revenue,Q2_Revenue,Q3_Revenue,Q4_Target,Growth_Pct,Status
Engineering,425000,480000,530000,600000,24.7,On Track
Product Design,180000,195000,210000,240000,16.6,On Track
Marketing & Growth,310000,340000,390000,450000,25.8,Ahead
Customer Operations,145000,152000,160000,175000,10.3,On Track
Data Analytics,290000,315000,360000,410000,24.1,Ahead
Security & DevOps,220000,240000,265000,300000,20.4,On Track`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  return new File([blob], 'Quarterly_Financial_Summary.csv', { type: 'text/csv' });
}
