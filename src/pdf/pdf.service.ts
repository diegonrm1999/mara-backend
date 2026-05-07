import { Injectable, BadRequestException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import { OrderReceiptData } from 'src/email/dto/order-receipt.dto';

@Injectable()
export class PdfService {
  async generateReceiptPDF(receiptData: OrderReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [226.77, 366.93], // ticket 80mm x 200mm
          margin: 10,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (buffer) => buffers.push(buffer));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        this.buildReceiptPDF(doc, receiptData);

        doc.end();
      } catch (error) {
        reject(new BadRequestException('Error generando el PDF de la boleta'));
      }
    });
  }

  private buildReceiptPDF(doc: PDFKit.PDFDocument, data: OrderReceiptData) {
    const logoPath = path.join(__dirname, '..', 'assets', 'images', 'logo.png');

    if (!fs.existsSync(logoPath)) {
      console.error('Logo no encontrado en:', logoPath);
    }
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 150) / 2, doc.y, {
        width: 150,
        height: 60,
      });
      doc.moveDown(5);
    }
    doc
      .fontSize(7)
      .font('Helvetica')
      .text(data.shopAddress1.replace(/\n/g, ' '), { align: 'center' });
    doc
      .fontSize(7)
      .font('Helvetica')
      .text(data.shopAddress2.replace(/\n/g, ' '), { align: 'center' });
    doc
      .fontSize(7)
      .font('Helvetica')
      .text(data.shopAddress3.replace(/\n/g, ' '), { align: 'center' });
    doc.text(`TEL: ${data.shopPhone}`, { align: 'center' });
    this.drawDivider(doc);
    doc
      .font('Helvetica-Bold')
      .text(`RUC: ${data.shopRuc}`, { align: 'center' });
    this.drawDivider(doc);
    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .text('NOTA DE VENTA', { align: 'center' });
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.ticketNumber, { align: 'center' });
    this.drawDivider(doc);

    doc.fontSize(7).font('Helvetica');

    doc.text(`CLIENTE: ${data.clientFirstName} ${data.clientLastName}`, doc.x, doc.y);

    const currentY = doc.y;
    doc.text(`FECHA EMISION: ${data.date}`, doc.x, currentY, {
      continued: false,
    });
    doc.text(`HORA: ${data.time}`, doc.x, currentY, { align: 'right' });
    doc.y = currentY + doc.currentLineHeight();

    // MONEDA
    doc.text(`MONEDA: SOLES`);

    doc.moveDown();
    this.drawDivider(doc);
    doc
      .fontSize(6)
      .font('Helvetica-Bold')
      .text('ESTE NO ES UN COMPROBANTE DE PAGO VÁLIDO', { align: 'center' });
    this.drawDivider(doc);

    const getPaymentMethodCode = (paymentMethod: string): string => {
      switch (paymentMethod) {
        case 'Cash':
          return 'E';
        case 'Card':
          return 'V';
        case 'Yape':
          return 'Y';
        default:
          return 'E';
      }
    };

    const paymentCode = getPaymentMethodCode(data.paymentMethod);

    doc.fontSize(7).font('Helvetica-Bold');

    const headerY = doc.y;
    doc.text('DESCRIPCIÓN', 15, headerY, { width: 80, align: 'left' });
    doc.text('CANT', 95, headerY, { width: 30, align: 'center' });
    doc.text('MED', 125, headerY, { width: 25, align: 'center' });
    doc.text('P.U.', 150, headerY, { width: 30, align: 'center' });
    doc.text('TOTAL', 180, headerY, { width: 30, align: 'center' });

    doc.moveDown(0.5);
    this.drawDividerNoDash(doc);

    doc.fontSize(6).font('Helvetica');

    data.treatments.forEach((t) => {
      const lines = this.splitText(t.name, 80, doc);
      const lineHeight = doc.currentLineHeight();
      const rowHeight = lines.length * lineHeight;
      const y = doc.y;

      lines.forEach((line, idx) => {
        doc.text(line, 15, y + idx * lineHeight, { width: 80, align: 'left' });
      });

      doc.text(t.quantity.toString(), 95, y, {
        width: 30,
        align: 'center',
      });

      doc.text(paymentCode, 125, y, {
        width: 25,
        align: 'center',
      });

      doc.text(`${data.currency}${t.price.toFixed(2)}`, 150, y, {
        width: 30,
        align: 'center',
      });

      doc.text(`${data.currency}${(t.price * t.quantity).toFixed(2)}`, 180, y, {
        width: 30,
        align: 'center',
      });

      doc.y = y + rowHeight + 2;
    });

    this.drawDividerNoDash(doc);

    doc.moveDown();
    doc.fontSize(9).font('Helvetica-Bold');

    doc.text('TOTAL', 15, doc.y, { continued: true });

    doc.text(`${data.currency}${data.totalPrice.toFixed(2)}`, {
      align: 'right',
    });
    doc.moveDown();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('¡GRACIAS POR SU PREFERENCIA!', {
        align: 'center',
      });
    doc
      .fontSize(6)
      .font('Helvetica')
      .text(
        `Fecha de emisión: ${new Date().toLocaleDateString(
          'es-PE',
        )} ${new Date().toLocaleTimeString('es-PE')}`,
        { align: 'center' },
      );
  }

  private drawDividerNoDash(doc: PDFKit.PDFDocument) {
    doc.moveDown(0.5);
    doc
      .moveTo(10, doc.y)
      .lineTo(doc.page.width - 10, doc.y)
      .undash()
      .stroke();
    doc.moveDown();
  }

  private drawDivider(doc: PDFKit.PDFDocument) {
    doc.moveDown(0.5);
    doc
      .moveTo(10, doc.y)
      .lineTo(doc.page.width - 10, doc.y)
      .dash(2, { space: 2 })
      .stroke();
    doc.moveDown();
  }

  private splitText(
    text: string,
    maxWidth: number,
    doc: PDFKit.PDFDocument,
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (doc.widthOfString(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
