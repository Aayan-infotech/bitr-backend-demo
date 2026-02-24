import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import Chart from 'chart.js/auto';

export const generateUserReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    const { user, attendance, progress } = reportData;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const colors = {
      primary: '#572649',     
      secondary: '#334155', 
      success: '#059669',    
      warning: '#D97706',
      danger: '#B91C1C',   
      dark: '#0F172A',     
      light: '#F1F5F9',     
      border: '#CBD5E1',    
      text: '#334155'       
    };

    const drawRect = (x, y, width, height, fillColor, strokeColor = null, strokeWidth = 0) => {
      doc.save();
      if (fillColor) {
        doc.fillColor(fillColor).rect(x, y, width, height).fill();
      }
      if (strokeColor) {
        doc.strokeColor(strokeColor).lineWidth(strokeWidth).rect(x, y, width, height).stroke();
      }
      doc.restore();
    };

    const drawProgressBar = (x, y, width, height, percentage, color) => {
      const progressWidth = (width * percentage) / 100;
      
      drawRect(x, y, width, height, colors.border);
      
      if (progressWidth > 0) {
        drawRect(x, y, progressWidth, height, color);
      }
      
      doc.fillColor(colors.text)
         .fontSize(9)
         .text(`${percentage}%`, x + width + 10, y - 1);
    };

    drawRect(0, 0, doc.page.width, 80, colors.primary);

    doc.fillColor('white')
       .fontSize(24)
       .text('USER PERFORMANCE REPORT', 0, 25, { align: 'center' });

    doc.fillColor('white')
       .fontSize(11)
       .text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       })}`, 0, 50, { align: 'center' });

    let currentY = 100;

    drawRect(40, currentY, doc.page.width - 80, 1, colors.primary);
    currentY += 10;

    doc.fillColor(colors.primary)
       .fontSize(16)
       .text('USER INFORMATION', 40, currentY);

    currentY += 25;

    doc.fillColor(colors.text)
       .fontSize(12)
       .text('Name:', 40, currentY, { width: 60 })
       .text(user.name, 100, currentY, { width: 200 })
       .text('Email:', 320, currentY, { width: 60 })
       .text(user.email, 380, currentY, { width: 200 });

    currentY += 40;

    drawRect(40, currentY, doc.page.width - 80, 1, colors.primary);
    currentY += 10;

    doc.fillColor(colors.primary)
       .fontSize(16)
       .text('ATTENDANCE OVERVIEW', 40, currentY);

    currentY += 30;

    const sessionAttendanceRate = ((attendance.attendedSessions / attendance.totalSessions) * 100).toFixed(1);
    const activityAttendanceRate = ((attendance.attendedActivities / attendance.totalAssignedActivities) * 100).toFixed(1);

    doc.fillColor(colors.text)
       .fontSize(12)
       .text('Sessions Attended:', 40, currentY, { width: 120 })
       .text(`${attendance.attendedSessions} / ${attendance.totalSessions}`, 170, currentY, { width: 80 });

    drawProgressBar(270, currentY + 2, 120, 8, parseFloat(sessionAttendanceRate), colors.success);
    currentY += 25;

    doc.fillColor(colors.text)
       .fontSize(12)
       .text('Activities Completed:', 40, currentY, { width: 120 })
       .text(`${attendance.attendedActivities} / ${attendance.totalAssignedActivities}`, 170, currentY, { width: 80 });

    drawProgressBar(270, currentY + 2, 120, 8, parseFloat(activityAttendanceRate), colors.warning);
    currentY += 35;

    drawRect(40, currentY, doc.page.width - 80, 1, colors.primary);
    currentY += 10;

    doc.fillColor(colors.primary)
       .fontSize(16)
       .text('PROGRESS SUMMARY', 40, currentY);

    currentY += 30;

    const sessionProgressValue = parseFloat(progress.sessionProgress.replace('%', ''));
    const activityProgressValue = parseFloat(progress.activityProgress.replace('%', ''));

    doc.fillColor(colors.text)
       .fontSize(12)
       .text('Session Progress:', 40, currentY, { width: 120 })
       .text(progress.sessionProgress, 170, currentY, { width: 80 });

    drawProgressBar(270, currentY + 2, 120, 8, sessionProgressValue, colors.primary);
    currentY += 25;

    doc.fillColor(colors.text)
       .fontSize(12)
       .text('Activity Progress:', 40, currentY, { width: 120 })
       .text(progress.activityProgress, 170, currentY, { width: 80 });

    drawProgressBar(270, currentY + 2, 120, 8, activityProgressValue, colors.success);
    currentY += 40;

    drawRect(40, currentY, doc.page.width - 80, 1, colors.primary);
    currentY += 10;

    doc.fillColor(colors.primary)
       .fontSize(16)
       .text('VISUAL ANALYTICS', 40, currentY);

    currentY += 20;

    const chartOptions = {
      responsive: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 10 },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: { display: false }
      },
      elements: { arc: { borderWidth: 0 } }
    };

    const sessionCanvas = createCanvas(220, 180);
    const sessionCtx = sessionCanvas.getContext('2d');

    new Chart(sessionCtx, {
      type: 'doughnut',
      data: {
        labels: ['Attended', 'Missed'],
        datasets: [{
          data: [attendance.attendedSessions, attendance.totalSessions - attendance.attendedSessions],
          backgroundColor: [colors.success, colors.border],
          borderWidth: 0
        }]
      },
      options: chartOptions
    });

    const activityCanvas = createCanvas(220, 180);
    const activityCtx = activityCanvas.getContext('2d');

    new Chart(activityCtx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{
          data: [attendance.attendedActivities, attendance.totalAssignedActivities - attendance.attendedActivities],
          backgroundColor: [colors.warning, colors.border],
          borderWidth: 0
        }]
      },
      options: chartOptions
    });

    const sessionImageBuffer = sessionCanvas.toBuffer('image/png');
    const activityImageBuffer = activityCanvas.toBuffer('image/png');

    doc.fillColor(colors.text)
       .fontSize(11)
       .text('Sessions', 40, currentY, { width: 150, align: 'center' })
       .text('Activities', 350, currentY, { width: 150, align: 'center' });

    currentY += 15;

    doc.image(sessionImageBuffer, 65, currentY, { width: 150 });
    doc.image(activityImageBuffer, 345, currentY, { width: 150 });

    currentY += 160;

    // Summary Box
    drawRect(40, currentY, doc.page.width - 80, 50, colors.light, colors.border, 1);

    doc.fillColor(colors.dark)
       .fontSize(14)
       .text('SUMMARY', 50, currentY + 10);

    doc.fillColor(colors.text)
       .fontSize(10)
       .text(`Overall attendance rate: ${sessionAttendanceRate}% • Activity completion: ${activityProgressValue}% • Total sessions: ${attendance.totalSessions}`, 
             50, currentY + 28, { width: doc.page.width - 100 });

    currentY += 80;

    const userId = String(user.id).slice(-8);

    // Dynamic footer
    doc.fillColor(colors.secondary)
       .fontSize(8)
       .text(`Report ID: ${userId} | ${new Date().toLocaleString('en-IN')}`, 
             0, currentY, { align: 'center' });

    doc.end();
  });
};
