import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateResultPDF = (result, user) => {
  const doc = new jsPDF();
  const { exam, submission, questions } = result;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('UniExam', 14, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('University Examination Result', 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 28);

  // Student Info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Information', 14, 55);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const info = [
    ['Name', user.name],
    ['Email', user.email],
    ['Exam', exam.title],
    ['Course', exam.course_name || '—'],
    ['Type', exam.exam_type],
    ['Date', new Date(submission.submitted_at).toLocaleDateString()],
  ];
  info.forEach(([k, v], i) => {
    const y = 65 + i * 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v || '—', 55, y);
  });

  // Score Box
  const score = submission.score || 0;
  const total = submission.total_marks || exam.total_marks || 100;
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
  const pass = pct >= 50;

  doc.setFillColor(pass ? 220 : 254, pass ? 252 : 226, pass ? 231 : 226);
  doc.roundedRect(130, 48, 65, 55, 4, 4, 'F');
  doc.setTextColor(pass ? 5 : 153, pass ? 150 : 27, pass ? 105 : 27);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`${pct}%`, 162, 68, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${score} / ${total}`, 162, 80, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Grade: ${grade}`, 162, 93, { align: 'center' });

  // Questions table
  if (questions && questions.length > 0) {
    const tableData = questions.map((q, i) => [
      i + 1,
      q.question_text?.substring(0, 60) + (q.question_text?.length > 60 ? '...' : ''),
      q.question_type === 'mcq' || q.question_type === 'true_false' ? 'Objective' : 'Subjective',
      q.student_answer || '—',
      q.correct_answer || '—',
      `${q.marks_obtained || 0} / ${q.marks}`,
    ]);

    doc.autoTable({
      startY: 115,
      head: [['#', 'Question', 'Type', 'Your Answer', 'Correct', 'Marks']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount} — UniExam University Examination System`, 105, 290, { align: 'center' });
  }

  doc.save(`Result_${exam.title?.replace(/\s+/g, '_')}_${user.name?.replace(/\s+/g, '_')}.pdf`);
};
