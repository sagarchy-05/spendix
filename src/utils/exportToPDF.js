import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Renders the DOM subtree under `elementId` to a PNG and writes it into an
// A4 PDF. Long content is split across multiple pages.
const exportToPDF = async (elementId, filename = 'report.pdf') => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`exportToPDF: element "${elementId}" not found`);
    return;
  }

  const canvas = await html2canvas(input, {
    scale: 2,
    useCORS: true,
    logging: false,
    ignoreElements: (element) =>
      element.style.display === 'none' ||
      element.style.visibility === 'hidden',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 190; // A4 width (210mm) minus 10mm side margins
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
};

export default exportToPDF;
